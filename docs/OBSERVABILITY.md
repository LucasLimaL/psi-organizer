# Observabilidade — Logs

Política de logs do psi-organizer. **Leitura obrigatória antes de adicionar qualquer chamada `log.*` no código.**

## Objetivo

Rastreabilidade ponta-a-ponta com **1 entrada de log por ação completa** — sem barulho, sem duplicação, sem vazamento de dado sensível. Logs servem pra:

1. Debugar incidente de produção (quem fez o quê, que ID, que erro)
2. Auditar acesso multi-tenant (toda ação carrega `psicologaId`)
3. Alimentar APM (New Relic ou similar) — formato JSON estruturado em stdout

## Princípios não-negociáveis

1. **1 log por ação.** Não 2, não 5. Todas as infos do fluxo entram via MDC e saem num único registro no fim.
2. **Erro só é logado 1 vez.** Quem captura registra; quem propaga não loga. Detalhes na seção [Política de erro](#política-de-erro).
3. **Nunca logar dado sensível em claro.** LGPD Art. 6 e 11. Lista exaustiva na seção [Redação](#redação).
4. **JSON em prod, texto colorido em dev.** Decisão de shipping é do ambiente — app só emite em stdout.
5. **Nada de logar payload por padrão.** Body só em WARN/ERROR, sempre redacted e truncado.

---

## Tipos de "ação" que produzem 1 log

| Tipo | O que é "ação" | Log emitido em | MDC `flow` |
|---|---|---|---|
| **HTTP request** | Um request HTTP completo | `RequestLoggingFilter.doFilterInternal` (final) | (omitido) |
| **Scheduler cron tick** | 1 execução do cron `@Scheduled` | wrapper do método `LembreteScheduler.executar` | `scheduler-cron` |
| **Webhook Meta (HTTP)** | 1 request da Meta (pode conter N eventos) | `RequestLoggingFilter` (é request HTTP normal; `psicologaId=meta-webhook`) — enriquecido com `wamid`/`lembreteId`/`etapaLembrete` via MDC durante o processamento | (omitido) |
| **Envio Meta isolado** (futuro) | Disparo manual via dev tools | wrapper do uso case | `dev-tools` |

Toda ação tem **entrada/saída clara**. O log final é INFO em sucesso, WARN em erro de negócio (4xx ou skip rule), ERROR em falha inesperada.

> Não emite log de "iniciado" em prod — só completion. Em `dev`, completion + DEBUG de "iniciado" são aceitáveis pra debug local.

---

## Formato do log

### Dev (profile `default`)

Texto colorido pra leitura humana no terminal:

```
2026-06-10 21:34:52.071 INFO  [r-7f3a] [psicologa=3b78...] [POST /pacientes 201 47ms] paciente criado pacienteId=b41f... 
```

### Prod (profile `prod`)

JSON estruturado em stdout, 1 linha por evento:

```json
{
  "timestamp": "2026-06-10T21:34:52.071Z",
  "level": "INFO",
  "logger": "com.psiorganizer.observability.RequestLog",
  "message": "request completed",
  "requestId": "r-7f3a",
  "psicologaId": "3b78...",
  "method": "POST",
  "path": "/pacientes",
  "status": 201,
  "durationMs": 47,
  "userAgent": "Mozilla/5.0...",
  "clientIp": "192.168.x",
  "pacienteId": "b41f...",
  "responseFields": { "pacienteId": "b41f...", "cpfMasked": "***.***.***-12" }
}
```

Encoder: `logstash-logback-encoder` em `logback-spring.xml` com profile-based switch.

---

## Chaves MDC canônicas

**Definidas em `com.psiorganizer.common.observability.LogFields` como constantes.** Não inventar key nova sem adicionar lá.

### Universais (set automaticamente por `RequestLoggingFilter`)

| Key | Origem | Exemplo |
|---|---|---|
| `requestId` | Filter gera UUID curto se header `X-Request-Id` não vier | `r-7f3a9c` |
| `method` | `request.getMethod()` | `POST` |
| `path` | `request.getRequestURI()` (sem query string) | `/pacientes` |
| `status` | Após o handler retornar | `201` |
| `durationMs` | `System.nanoTime()` delta | `47` |
| `clientIp` | `X-Forwarded-For` (primeiro) ou `remoteAddr` | `192.168.0.5` |
| `userAgent` | Truncado em 200 chars | `Mozilla/5.0...` |

### Multi-tenant (set pelo `JwtAuthFilter` após resolver o JWT)

| Key | Quando | Exemplo |
|---|---|---|
| `psicologaId` | Toda request — **nunca vazio**, sentinela quando não houver psi real | `3b78...` ou `pre-auth` |
| `email` | Toda request com identidade conhecida — autenticada OU `/auth/**` (extraído do request body, mesmo se login falhou). **Nunca loga `senha`**. | `ana@psi.com` |

**Política `psicologaId` nunca-vazio.** Pra garantir rastreabilidade e auditoria,
o `RequestLoggingFilter` aplica sentinelas semânticos no MDC quando o JWT não
preencheu psicologaId. Lista exaustiva:

| Sentinela | Quando se aplica | Significado |
|---|---|---|
| `pre-auth` | Request a `/auth/**` (login, signup). Sucesso de login extrai o ID real do response antes desse sentinela ser aplicado, então só fica em logs de login que falhou. | "Anônimo no processo de autenticação" |
| `cors-preflight` | Request OPTIONS — browser dispara preflight CORS sem auth | "Browser checando CORS" |
| `meta-webhook` | Request a `/webhooks/**` — endpoint público chamado pela Meta | "Sistema externo (Meta)" |
| `scheduler-interno` | Request a `/internal/**` — gatilho do Cloud Scheduler (tick do cron via HTTP) | "Sistema interno agendado" |
| `unauthenticated` | Qualquer outra request sem JWT válido (ex: GET /pacientes sem Authorization) | "Tentativa de acesso sem credencial" |

A regra é dura: **se você grepar `psicologaId=""` nos logs, é bug**. Reporte.

**Identificação dupla — psicologaId + email.** Toda request com identidade conhecida tem AMBOS preenchidos:

- Authenticada (JWT válido) → `psicologaId` = UUID real, `email` = email do JWT
- `POST /auth/login` 200 → mesma coisa, extraído do response
- `POST /auth/login` 4xx (senha errada / email inexistente) → `psicologaId` = `pre-auth`, **`email` = email do request body** (rastreabilidade de tentativa)
- `POST /auth/signup` → `psicologaId` = `pre-auth`, `email` = email do request body

Isso permite responder: *"quem (real ou tentando) fez essa request?"* mesmo em logs de falha de autenticação. Identifica força bruta, scan de emails, etc.

### De domínio (set pelo controller/service via `MDC.put` quando aplicável)

| Key | Flow | Exemplo |
|---|---|---|
| `pacienteId` | Qualquer ação que mexa com paciente | `b41f...` |
| `consultaId` | Qualquer ação que mexa com consulta | `9a2c...` |
| `notificacaoId` | Marcar notificação como lida | `4c8e...` |
| `lembreteId` | WhatsApp scheduler/webhook | `7e1d...` |
| `wamid` | WhatsApp client após resposta da Meta | `wamid.HBg...` |
| `templateName` | WhatsApp envio | `lembrete_consulta_v1` |
| `etapaLembrete` | Webhook após máquina de estados | `AGUARDANDO_CONFIRMACAO_DUPLA` |

### De fluxo (set por wrappers de scheduler/webhook)

| Key | Quando | Exemplo |
|---|---|---|
| `flow` | Override quando não é HTTP request | `scheduler-cron`, `webhook-whatsapp` |
| `cronRunId` | Cada execução de `LembreteScheduler.executar` | `cron-9f3a` |
| `cronEnviadosDia` | Após scheduler completar | `12` |
| `cronEnviadosLate` | Após scheduler completar | `3` |

### Heurísticas

- **Quem limpa o MDC é o dono do flow, não quem enriquece.** Em request HTTP, controllers/services fazem `MDC.put` direto — o `RequestLoggingFilter` faz `MDC.clear()` no fim da request. Em flow async, o wrapper (`FlowLogger`) remove as chaves no fim. **Não** remova a chave manualmente antes do completion log (ela sumiria do log final, que é emitido depois do handler retornar). Use `Mdc.with(...)` (escopo com restore) apenas pra trechos internos cuja chave NÃO deve aparecer no completion log.
- **Nunca `MDC.clear()` no meio de uma request** — apaga as chaves universais.
- **Async (`@Async`, `CompletableFuture`):** propagar MDC via `MdcTaskDecorator`. Sem isso, MDC vaza do parent ou some.

---

## Política do body de request/response

**Decisão:** "redact + size limit + smart por status".

### Regra por nível

| Nível do log | O que aparece no campo `body` | Por quê |
|---|---|---|
| **INFO** (2xx) | Apenas `responseFields` — campos-chave extraídos (ex: `pacienteId`, `consultaId`) | Casos felizes não precisam payload completo; campos-chave já viram MDC ou colunas estruturadas |
| **WARN** (4xx) | `requestBody` (redacted, truncado 4KB) + `responseFields` | Validação falhou — precisa ver o que veio errado |
| **ERROR** (5xx) | `requestBody` (redacted, truncado 4KB) + `responseBody` (redacted, truncado 4KB) | Falha inesperada — precisa de tudo pra postmortem |

### Truncate

- Limite: **4096 bytes** após redação. Acima disso, corta + adiciona `bodyTruncated: true`.
- Body `application/octet-stream`, `multipart/*`, `image/*`, `application/pdf` → nunca loga, registra `bodyOmitted: "binary"`.
- Body de endpoints conhecidos como ruidosos (lista paginada com `limit > 50`) → loga `bodyOmitted: "list"` + count.

### Redação

Substitui valor por `***` (não esconde a chave — esconder a chave atrapalha debug). Implementado em `BodyRedactor` via JSON traversal, ignora case.

**Lista de chaves redacted (não-exaustiva, deve ser mantida em `BodyRedactor.SENSITIVE_KEYS`):**

```
senha, password, oldPassword, newPassword, currentPassword
token, accessToken, refreshToken, jwt, authorization
cpf  (mascarado: "***.***.***-12" — últimos 2)
telefone  (mascarado: "+55 ***** ****04" — últimos 2)
notas, anotacao, anotacoes  (campo de notas clínicas — sensível Art. 11 LGPD)
appSecret, verifyToken, hmacSignature
clientSecret, apiKey
```

Headers redacted no MDC: `Authorization`, `X-Hub-Signature*`, `Cookie`.

### Casos especiais

| Endpoint | Tratamento |
|---|---|
| `POST /auth/login` | Body **inteiro suprimido** — loga só `email` + `loginOutcome=success\|failure`. Não loga senha nem mascarada. |
| `POST /auth/signup` | Igual login pro campo `senha`. |
| `POST /whatsapp/webhook` | Loga `wamid` extraído, mas não loga body cru (telefones de paciente). |
| `GET /actuator/**`, `GET /swagger*`, `GET /v3/api-docs**` | Skip total no filter — não loga. |

---

## Política de erro

### Regra

> **Quem captura, loga. Quem propaga, não.**

Isso significa:

| Camada | `log.error` / `log.warn`? |
|---|---|
| Controller | ❌ Nunca. Lance exceção. |
| Service | ❌ Quase nunca. Lance exceção com contexto. |
| `GlobalExceptionHandler` | ✅ Único lugar pra HTTP. Loga conforme tipo. |
| Wrapper do scheduler / wrapper do webhook async | ✅ Único lugar pros flows assíncronos. |
| Cliente HTTP externo (ex: `MetaWhatsappClient`) | ⚠️ Pode logar o **body cru da resposta de erro** (info que não cabe em exceção limpa), mas mesmo aí: preferir embutir no `WhatsappException.responseBody` e deixar o log único do completion mostrar. |

### Tabela de níveis no exception handler

| Caso | Handler | Level | Inclui stack? |
|---|---|---|---|
| `ApiException` (4xx — regra de negócio, validação) | `handleApi` | `WARN` | Não (mensagem só) |
| `MethodArgumentNotValidException` (400 — validação @Valid) | `handleValidation` | `WARN` | Não |
| `AuthenticationException`, `AccessDeniedException` (401/403) | dedicado | `WARN` | Não |
| `WhatsappException` propagada até HTTP | (raro — normalmente é absorvida) | `WARN` | Não |
| `Exception` genérica (500) | `handleGeneric` | `ERROR` | **Sim** (`logger.error("...", ex)`) |

### Anti-padrão (proibido)

```java
// ❌ Loga e relança — duplicação
try {
    foo();
} catch (WhatsappException e) {
    log.error("Falha em foo", e);
    throw e;
}

// ❌ Loga em camada de baixo
public void enviar(...) {
    if (!valido) {
        log.warn("paciente inválido");           // ← isso vai virar barulho no scheduler
        throw new ApiException(...);
    }
}
```

### Padrão correto

```java
// ✅ Lança com contexto, deixa o catch superior decidir
try {
    foo();
} catch (WhatsappException e) {
    throw new IllegalStateException("envio Meta falhou em consultaId=" + id, e);
}

// ✅ Service não loga skip rules — domain registra, completion log do flow mostra
public Optional<LembreteEnviado> enviar(...) {
    if (!paciente.isOptInWhatsapp()) {
        // sem log.info aqui
        metricas.pulado("opt_in_ausente");
        return Optional.empty();   // completion log do scheduler agrega contagem
    }
    ...
}
```

### Caso de absorção (service que decide não propagar)

Quando o service **decide engolir** o erro (ex: `LembreteEnvioService.enviar` captura `WhatsappException`, grava no `LembreteEnviado.erro_codigo` e segue), aí é OK logar — porque ninguém mais vai ver esse erro. Nesse caso:

- **1 log warn** com `lembreteId`, `codigo`, `transitorio`, `mensagem`
- Não relança
- Domain (`erro_codigo`, `erro_descricao`) é a fonte de verdade pro histórico

---

## Como adicionar log num flow novo — recipe

### HTTP endpoint novo

Não precisa fazer nada. O `RequestLoggingFilter` já cobre — e promove `pacienteId`/`consultaId`/`lembreteId`/`wamid` do **response body** pro MDC automaticamente (`putFields`). Enriquecimento manual só é necessário quando o ID está **apenas no path** (DELETE 204, erros 4xx/5xx em que o response não traz o ID):

```java
@PostMapping("/consultas/{id}/confirmar")
public ResponseEntity<...> confirmar(@PathVariable UUID id) {
    MDC.put(LogFields.CONSULTA_ID, id.toString());
    return service.confirmar(id);
}
```

Sem remove manual — o filter limpa todo o MDC no fim da request. (Um `try (Mdc.with(...))` aqui removeria a chave **antes** do completion log, que é emitido depois do handler retornar.)

### Service que faz operação de domínio

Não loga nada de sucesso. Em erro inesperado, propaga com contexto:

```java
@Transactional
public Paciente criar(PacienteRequest req) {
    if (jaExiste(req.cpf())) {
        throw ApiException.conflito("Paciente já cadastrado");  // sem log
    }
    return repo.save(novoPaciente(req));  // sem log
}
```

### Scheduler / cron tick

Wrap o método com `Mdc.flow("scheduler-cron")` (helper). O wrapper emite 1 log no fim com contagens agregadas via MDC. Não logar dentro do loop — agregar contadores e adicionar ao MDC no fim.

```java
@Scheduled(cron = "${psi.whatsapp.scheduler-cron}")
public void executar() {
    try (var scope = Mdc.flow("scheduler-cron", "cronRunId", "cron-" + shortId())) {
        int dia = 0, late = 0;
        for (ConfiguracaoWhatsapp cfg : ativas) {
            dia += processarEnvioDoDia(cfg, ...);
            late += processarEnvioLateBound(cfg, ...);
        }
        MDC.put("cronEnviadosDia", String.valueOf(dia));
        MDC.put("cronEnviadosLate", String.valueOf(late));
        // log final emitido pelo wrapper Mdc.flow
    }
}
```

### Webhook async

Mesma ideia. Ao processar uma mensagem da Meta:

```java
try (var scope = Mdc.flow("webhook-whatsapp",
        "wamid", externalId,
        "lembreteId", le.getId().toString())) {
    maquina.processar(le, ...);
    // log final emitido pelo wrapper
}
```

---

## Implementação no projeto

### Arquivos criados

```
backend/src/main/java/com/psiorganizer/common/observability/
├── LogFields.java                  ← constantes de keys MDC
├── Mdc.java                        ← helper try-with-resources + flow wrapper
├── BodyRedactor.java               ← redaction policy
├── RequestLoggingFilter.java       ← OncePerRequestFilter, MDC + completion log
├── CachingBodyFilter.java          ← envolve ContentCaching wrappers (executado antes)
└── ResponseFieldExtractor.java     ← extrai campos-chave do response pra MDC

backend/src/main/resources/
└── logback-spring.xml              ← profile-based encoder

backend/pom.xml                     ← +logstash-logback-encoder
```

### Refactor em código existente

- **`GlobalExceptionHandler`** ganha `log.warn`/`log.error` conforme tabela acima.
- **`MetaWhatsappClient.postar`** — remover `log.warn` direto; embutir corpo da resposta em `WhatsappException.responseBody` (campo novo).
- **`LembreteEnvioService.enviar`** — remover `log.info("[lembrete-enviado]...")` e `log.warn("[lembrete-falhou]...")`. Estado já tá no domain (`status_entrega`, `mensagem_id_externa`, `erro_codigo`). Scheduler agrega contadores e loga no fim.
- **`LembreteScheduler.executar`** — substituir os 3 `log.info` por contadores + 1 completion log via wrapper `Mdc.flow`.
- **`WebhookController` / `WebhookService`** — remover logs dentro do flow; manter apenas o completion log no wrapper.

---

## Shipping pra cloud (decisão diferida)

Hoje: JSON em stdout. Decisão de coletor é de **deploy time**, não de app.

Quando for hora de mandar pra New Relic:

| Cenário | Opção recomendada |
|---|---|
| Single VM, single instância (hoje) | **New Relic Infrastructure Agent** lê stdout direto (via journald ou file). Zero config no app. |
| Multi-instância sem K8s | **Fluent Bit** na VM como agente — fan-out pra NR + S3 (audit). |
| Kubernetes | **Fluent Bit DaemonSet** ou **OpenTelemetry Collector**. Vendor-neutral. |
| Pipeline futuro de logs+métricas+traces unificado | **OpenTelemetry Collector**. |

**Fluentd (não Fluent Bit):** evitar. Runtime Ruby pesado, sucessor (Fluent Bit em C) cobre os mesmos casos com fração do consumo.

---

## Checklist quando for fazer review de PR

- [ ] Nenhum `log.info` / `log.warn` / `log.error` foi adicionado fora de `GlobalExceptionHandler` ou wrapper de flow async
- [ ] Nenhum campo da lista de [Redação](#redação) aparece em texto plano no `BodyRedactor.SENSITIVE_KEYS`
- [ ] Novos endpoints sensíveis (auth, financeiro, dados clínicos) foram adicionados em casos especiais da seção [Casos especiais](#casos-especiais)
- [ ] Novos flows assíncronos têm wrapper `Mdc.flow(...)` com `cronRunId` ou equivalente
- [ ] Novas MDC keys foram adicionadas em `LogFields`
- [ ] Em mudanças de domínio sensível, `docs/OBSERVABILITY.md` foi atualizado
