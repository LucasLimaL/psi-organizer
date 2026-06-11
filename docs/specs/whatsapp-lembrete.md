# Spec — Lembretes de Consulta via WhatsApp

Feature: automação de lembretes via WhatsApp pra pacientes, 1 dia antes da consulta, com confirmação bidirecional (confirmar/cancelar) e máquina de estados pra evitar ações acidentais.

Status: **draft pra revisão** · Data: 2026-05-29 · Owner: Bruno

> Este spec **adiciona** capacidades ao psi-organizer — não substitui nem reescreve nada existente. Lê-se em conjunto com [SPEC.md](../SPEC.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [BUSINESS_RULES.md](../BUSINESS_RULES.md) e [API.md](../API.md).

---

## Sumário

1. [Objetivo e escopo](#1-objetivo-e-escopo)
2. [Modelo de domínio](#2-modelo-de-domínio)
3. [Endpoints REST](#3-endpoints-rest)
4. [Fluxo de envio (job agendado)](#4-fluxo-de-envio-job-agendado)
5. [Fluxo de resposta (webhook + state machine)](#5-fluxo-de-resposta-webhook--state-machine)
6. [Multi-tenant e segurança](#6-multi-tenant-e-segurança)
7. [Configuração e operação](#7-configuração-e-operação)
8. [Custo operacional](#8-custo-operacional)
9. [UI (frontend) — sketch](#9-ui-frontend--sketch)
10. [Plano de entrega em PRs](#10-plano-de-entrega-em-prs)
11. [Riscos e perguntas abertas](#11-riscos-e-perguntas-abertas)

---

## Decisões fechadas (não rediscutir)

| Decisão | Resolução |
|---|---|
| Provedor | **Meta WhatsApp Cloud API direto** — `RestClient` + DTOs próprios, sem SDK terceiro. Versão fixada `v21.0` (estável em 2026-05). |
| Gatilho | **Único** — 1 dia antes da consulta. |
| Número de origem | **Único da plataforma** pra todas as psicólogas. Paciente recebe identificado como "Psi Organizer"; nome da psicóloga aparece **dentro do texto**. |
| Modo "número próprio" (Embedded Signup) | **Fora do MVP**. Registrado em §11 como follow-up. |
| Scheduling | Batch por psicóloga em horário configurável (`07:00`-`20:00`, horas cheias), scheduler único `@Scheduled(cron = "0 0 * * * *")` UTC + lock. |
| Confirmação | **Dupla** com loop "Voltar" capado em 3 ciclos; retry de Msg 2 até 3x espaçados de 1h dentro da janela ativa. |
| Categoria do template | `UTILITY`. Só Msg 1 é paga (~R$0,04). |

---

## 1. Objetivo e escopo

### 1.1 Problema

Psicólogas relatam que faltas e cancelamentos de última hora são uma fonte significativa de perda de receita e desorganização de agenda. Mensagens manuais no dia anterior funcionam mas são esquecíveis e consomem 15-30 min/dia. Automatizar o lembrete com confirmação ativa pela paciente reduz no-show e dá visibilidade antecipada de cancelamentos.

### 1.2 Objetivos do MVP

- Enviar **uma** mensagem automática por consulta, 1 dia antes, no horário escolhido pela psicóloga.
- Permitir que a paciente **confirme** ou **cancele** com 2 toques (cada um exige confirmação dupla — proteção contra clique acidental).
- Refletir o estado (`AGUARDANDO` / `CONFIRMADA` / `CANCELADA_PELA_PACIENTE`) na Agenda da psicóloga.
- Notificar a psicóloga in-app quando uma paciente cancela.
- Auditoria: histórico de lembretes com status de entrega, escolha final, retries.

### 1.3 Fora do escopo (não-objetivos explícitos)

- ❌ **Mensagens manuais avulsas** — a psi não pode disparar mensagem ad-hoc pelo sistema.
- ❌ **Categorias `MARKETING` e `AUTHENTICATION`** — só `UTILITY`.
- ❌ **Outros gatilhos** — sem lembrete pós-consulta ("foi tudo bem?"), sem cobrança, sem aniversário, sem reagendamento sugerido.
- ❌ **Inbox de chat na plataforma** — respostas livres da paciente são apenas logadas; não há UI pra ler ou responder.
- ❌ **Reenvio automático em reagendamento** — se a consulta é movida depois do lembrete enviado, o sistema **alerta a psi** mas não envia novo lembrete. Reagendar deve avisar a paciente por canal próprio.
- ❌ **Modo "número próprio da psicóloga" via Embedded Signup** — número único da plataforma é o único modo. Migrar pra número próprio é uma feature futura, registrada como follow-up.
- ❌ **Cifragem por tenant** — sem credenciais por tenant no MVP (só env vars globais).
- ❌ **WebSocket pra notificação em tempo real** — usa polling leve em endpoint existente.

### 1.4 Critérios de aceite

| # | Critério |
|---|---|
| C1 | Psi ativa lembretes em `/configuracoes/whatsapp`, escolhe horário (default 18:00) e edita template. |
| C2 | Consulta marcada pra amanhã, paciente com opt-in + telefone E.164 → lembrete enviado no horário escolhido (±10 min do cron). |
| C3 | Consulta criada após o horário escolhido (mesmo dia da agenda) e com ≥2h até início → enviada no próximo cron dentro da janela. |
| C4 | Paciente clica `[Confirmar]` → recebe Msg 2 → clica `[Sim, confirmar]` → `consulta.status_confirmacao = CONFIRMADA`. Chip verde na agenda. |
| C5 | Paciente clica `[Cancelar]` → confirma → `consulta.status` vira `CANCELADA`, `status_confirmacao = CANCELADA_PELA_PACIENTE`, psi recebe notificação in-app. |
| C6 | Paciente clica `[Voltar]` 3 vezes seguidas → recebe mensagem de despedida e estado congela; chip permanece "Aguardando" com tooltip explicativo. |
| C7 | Paciente não responde Msg 2 → sistema reenvia 3 vezes espaçadas de 1h, dentro da janela 07-20h. Após 3 tentativas, marca `EXPIRADO`. |
| C8 | Paciente sem opt-in ou sem telefone E.164 válido → nenhum envio, log estruturado com motivo. |
| C9 | Falha 5xx/429 da Meta → retry com backoff 1min/5min/15min. 4xx → não retenta, marca `FALHOU` com `erro_codigo`. |
| C10 | Webhook rejeita `POST` com HMAC inválido (401). Aceita e processa em <5s. |

---

## 2. Modelo de domínio

### 2.1 Novas tabelas

#### 2.1.1 `configuracao_whatsapp`

Configuração de lembretes da psicóloga. **Exatamente 1 por psicóloga** (criada lazy no primeiro acesso de `GET /me/whatsapp` ou na ativação).

| Coluna | Tipo | NotNull | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | sim | — | PK |
| `psicologa_id` | uuid | sim | — | FK → `psicologa(id)`, **UNIQUE** |
| `ativo` | boolean | sim | `false` | Toggle global de envio |
| `template_mensagem` | text | sim | (default abaixo) | Texto pt-BR com placeholders |
| `horario_envio_lembrete` | time | sim | `18:00` | `LocalTime`; validação restringe a 07:00-20:00 horas cheias |
| `criado_em` | timestamptz | sim | `now()` | UTC |
| `atualizado_em` | timestamptz | sim | `now()` | UTC, atualizado no service |

**Template default sugerido (pt-BR):**

```
Olá, {paciente}! 👋 Aqui é a {psicologa}.
Lembrando da sua consulta amanhã, {data} às {hora}.
Pode confirmar abaixo?
```

**Placeholders válidos:** `{paciente}`, `{psicologa}`, `{data}` (formato `dd/MM/yyyy`), `{hora}` (formato `HH:mm`). Outros placeholders são tratados como texto literal.

**Limites:**
- `template_mensagem`: 1024 caracteres (alinhado ao limite Meta de body de template `UTILITY`).
- `horario_envio_lembrete`: horas cheias entre 07 e 20 inclusive (14 valores). Persistido em `LocalTime` pra permitir granularidade fina no futuro sem migration; validação restritiva fica no service.

#### 2.1.2 `lembrete_enviado`

Estado por consulta: 1 linha por consulta com lembrete enviado. **Idempotente via `UNIQUE(consulta_id)`** — evita duplo envio em race do scheduler ou reentry.

| Coluna | Tipo | NotNull | Default | Notas |
|---|---|---|---|---|
| `id` | uuid | sim | — | PK |
| `consulta_id` | uuid | sim | — | FK → `consulta(id)` ON DELETE CASCADE, **UNIQUE** |
| `psicologa_id` | uuid | sim | — | FK → `psicologa(id)`, denormalizado pra queries multi-tenant rápidas |
| `enviado_em` | timestamptz | sim | — | UTC, momento do envio bem-sucedido da Msg 1 |
| `mensagem_id_externa` | varchar(128) | não | — | ID Meta da Msg 1 (`wamid.HBgL...`). Null enquanto `status_entrega = PENDENTE` |
| `status_entrega` | varchar(16) | sim | `PENDENTE` | enum: `PENDENTE`, `ENVIADO`, `ENTREGUE`, `LIDO`, `FALHOU` |
| `erro_codigo` | varchar(32) | não | — | Código Meta em caso de falha (`131047`, `131026`, etc.) |
| `erro_descricao` | text | não | — | Mensagem humana da Meta |
| `etapa` | varchar(32) | sim | `AGUARDANDO_ESCOLHA` | enum: ver §5 |
| `escolha_inicial` | varchar(16) | não | — | enum: `CONFIRMAR`, `CANCELAR` |
| `mensagem_confirmacao_dupla_id` | varchar(128) | não | — | ID Meta da Msg 2 mais recente (atualiza em cada retry) |
| `confirmacao_dupla_enviada_em` | timestamptz | não | — | UTC, último envio da Msg 2 |
| `confirmacao_dupla_tentativas` | int | sim | `0` | Conta envios da Msg 2 (1ª tentativa = `1`); máx 3 |
| `ciclos_voltar` | int | sim | `0` | Conta cliques em `[Voltar]`; máx 3 |
| `escolha_final` | varchar(16) | não | — | enum: `CONFIRMAR`, `CANCELAR`. Só preenchido quando `etapa = FINALIZADO` |
| `finalizado_em` | timestamptz | não | — | UTC, set em qualquer transição para `FINALIZADO`, `EXPIRADO`, `CONGELADO_POR_LOOP` |

**Justificativa do `UNIQUE(consulta_id)`:**
- O scheduler roda de hora em hora; numa janela ativa, o passo (a) e (b) podem competir por uma mesma consulta (ex: consulta criada exatamente no momento do cron). `UNIQUE` no banco fecha a janela de race.
- O envio usa `INSERT INTO lembrete_enviado (...) VALUES (...) ON CONFLICT (consulta_id) DO NOTHING` antes do POST pra Meta — se a constraint disparar, o segundo executor desiste sem chamar API.
- Reentry após crash do scheduler: ao reprocessar, idempotência garante que consultas já com lembrete não recebem duplicata.

**Índices:**
- `idx_lembrete_psicologa_etapa(psicologa_id, etapa)` — auditoria por psi e dashboards.
- `idx_lembrete_etapa_envio_2(etapa, confirmacao_dupla_enviada_em)` partial `WHERE etapa = 'AGUARDANDO_CONFIRMACAO_DUPLA'` — query do retry (c) do scheduler.
- `idx_lembrete_mensagem_externa(mensagem_id_externa)` — lookup pelo webhook via `context.id`.
- `idx_lembrete_mensagem_dupla(mensagem_confirmacao_dupla_id)` — lookup pelo webhook quando a paciente responde a Msg 2.

### 2.2 Alterações em tabelas existentes

#### 2.2.1 `consulta`

| Coluna nova | Tipo | NotNull | Default | Notas |
|---|---|---|---|---|
| `status_confirmacao` | varchar(32) | sim | `AGUARDANDO` | enum: `AGUARDANDO`, `CONFIRMADA`, `CANCELADA_PELA_PACIENTE` |
| `confirmada_pela_paciente_em` | timestamptz | não | — | UTC, set quando `escolha_final = CONFIRMAR` |

O enum existente `status` (`AGENDADA`/`CONFIRMADA`/`REALIZADA`/`FALTA`) **não é tocado**. `status_confirmacao` é um campo **paralelo** que rastreia a confirmação **da paciente** via WhatsApp, sem invadir o status operacional gerido pela psi.

Quando paciente cancela: aplica-se `status_confirmacao = CANCELADA_PELA_PACIENTE` **e** o `status` operacional vira `CANCELADA` — exige adicionar `CANCELADA` ao enum `StatusConsulta`. Decisão: adicionar `CANCELADA` no enum existente, pois faltava esse estado mesmo (hoje a psi precisa deletar a consulta). Update da [BUSINESS_RULES.md §4](../BUSINESS_RULES.md#4-status-de-consulta) virá no `/psi-docs-sync` pós-merge da PR C.

#### 2.2.2 `paciente`

| Coluna | Mudança | Notas |
|---|---|---|
| `telefone` | reforço de validação | Agora exige formato E.164 (`+55DDNNNNNNNNN`). Migration popula como `null` os existentes que não baterem, e a UI exige re-cadastro guiado no primeiro acesso pós-feature. Detalhes em §6.4. |
| `opt_in_whatsapp` | **novo** boolean NotNull default `false` | Opt-in explícito da paciente pra receber lembretes |
| `opt_in_whatsapp_em` | **novo** timestamptz nullable | UTC, set quando opt-in vira `true` |

### 2.3 Diagrama ER textual

```
psicologa (existente)
   │ 1
   │
   ├─── 1 ─── configuracao_whatsapp
   │
   ├─── N ─── paciente (existente, +opt_in_whatsapp, +opt_in_whatsapp_em, telefone E.164)
   │            │ 1
   │            │
   │            └─── N ─── consulta (existente, +status_confirmacao, +confirmada_pela_paciente_em)
   │                          │ 1
   │                          │
   └─── N ─── lembrete_enviado (UNIQUE consulta_id)
```

- `configuracao_whatsapp.psicologa_id` UNIQUE → 1:1 com `psicologa`.
- `lembrete_enviado.consulta_id` UNIQUE → 0..1 lembrete por consulta. Cascade ON DELETE: apagar uma consulta apaga o lembrete (limpo, sem inconsistência).
- `lembrete_enviado.psicologa_id` denormalizado pra evitar JOIN em queries de auditoria/dashboard — preenchido a partir de `consulta.psicologa_id` no insert. Não é fonte de verdade, mas é checado contra `consulta.psicologa_id` no service (consistency invariant).

### 2.4 Migrations

`V2__whatsapp_lembretes.sql` cria as duas tabelas novas, adiciona as colunas em `consulta` e `paciente`, cria índices. `V3__seed_status_confirmacao.sql` (opcional, defensivo) backfill `AGUARDANDO` em todas as `consulta` existentes — desnecessário porque o `DEFAULT` cobre, mas explícito ajuda a documentar.

Migrations **não** mexem em telefones existentes — adicionar regra de validação E.164 só no DTO (campo `paciente.telefone` continua livre no banco; vide §6.4).

---

## 3. Endpoints REST

Padrão idêntico aos existentes: `@Operation` em pt-BR, `@Tag`, DTOs só no Controller, multi-tenant via `PsicologaPrincipal.corrente().id()`.

### 3.1 Sumário

| Método | Path | Sumário | Auth | Códigos |
|---|---|---|---|---|
| `GET` | `/me/whatsapp` | Retorna configuração da psicóloga autenticada | JWT | `200` |
| `PUT` | `/me/whatsapp` | Atualiza `ativo`, `template_mensagem`, `horario_envio_lembrete` | JWT | `200` · `400` |
| `POST` | `/me/whatsapp/teste` | Envia mensagem de teste pra um número informado | JWT | `202` · `400` · `409` |
| `GET` | `/me/whatsapp/lembretes` | Lista paginada de lembretes pra auditoria | JWT | `200` |
| `GET` | `/webhooks/whatsapp` | Handshake de verificação Meta | público | `200` (echo `hub.challenge`) · `403` |
| `POST` | `/webhooks/whatsapp` | Recebe eventos Meta (mensagens, status) | público + HMAC | `200` sempre que assinatura válida · `401` |
| `POST` | `/dev/whatsapp/simular-resposta` | Injeta resposta na máquina de estados (apenas perfil `dev`) | dev only | `204` |

### 3.2 DTOs

#### `ConfiguracaoWhatsappResponse`

```json
{
  "ativo": true,
  "templateMensagem": "Olá, {paciente}! ...",
  "horarioEnvioLembrete": "18:00",
  "atualizadoEm": "2026-05-29T14:00:00-03:00"
}
```

#### `AtualizarConfiguracaoWhatsappRequest`

```json
{
  "ativo": true,
  "templateMensagem": "Olá, {paciente}! ...",
  "horarioEnvioLembrete": "18:00"
}
```

Validação Jakarta:
- `ativo`: `@NotNull`
- `templateMensagem`: `@NotBlank`, `@Size(max = 1024)`, `@TemplateValido` (custom — checa que placeholders são apenas os 4 conhecidos)
- `horarioEnvioLembrete`: `@NotNull` `LocalTime`. Validação adicional no service: `time.getMinute() == 0 && time.getHour() >= 7 && time.getHour() <= 20`. Se falhar → `400 "Horário de envio deve ser uma hora cheia entre 07:00 e 20:00"`.

#### `EnviarTesteRequest`

```json
{
  "telefoneE164": "+5511987654321"
}
```

Validação: `@TelefoneE164` (custom — ver §6.4).

Response: `202 Accepted` com `{ "mensagemIdExterna": "wamid..." }`. Disparado de forma síncrona contra Meta usando o template fixo `teste_lembrete_consulta_v1` (template separado, single-variable, aprovado uma vez). Idempotência: rate-limit 1 teste/minuto/psicóloga via [bucket4j](#74-rate-limiting) em memória.

#### `LembreteResponse` (auditoria)

```json
{
  "id": "uuid",
  "consultaId": "uuid",
  "pacienteNome": "Maria Souza",
  "consultaInicio": "2026-05-30T14:00:00-03:00",
  "enviadoEm": "2026-05-29T18:00:12-03:00",
  "statusEntrega": "LIDO",
  "etapa": "FINALIZADO",
  "escolhaInicial": "CONFIRMAR",
  "escolhaFinal": "CONFIRMAR",
  "ciclosVoltar": 0,
  "confirmacaoDuplaTentativas": 1,
  "erroCodigo": null,
  "erroDescricao": null
}
```

`GET /me/whatsapp/lembretes` aceita query params:
- `consultaId` (opcional, UUID) — filtra por consulta
- `etapa` (opcional, enum) — filtra por etapa
- `inicioEm`, `fimEm` (opcionais, date) — janela de `enviado_em`, fuso `America/Sao_Paulo`
- `limit` (default 50, max 200), `offset` (default 0)

Envelope: `{ lembretes: [...], total: 123, temMais: true }` — mesmo padrão do `/pacientes/{id}/consultas`.

#### Webhooks

Não são DTOs típicos. Schema bruto Meta — payload `entry[].changes[].value.messages[]` ou `entry[].changes[].value.statuses[]`. Implementação parseia com Jackson como `Map<String, Object>` no controller e delega ao service, evitando criar 12 DTOs pra schema externo volátil. Aceitável aqui porque a borda já está isolada.

### 3.3 Multi-tenancy nos endpoints

| Endpoint | Estratégia |
|---|---|
| `GET/PUT /me/whatsapp`, `POST /me/whatsapp/teste`, `GET /me/whatsapp/lembretes` | `psicologaId` vem de `PsicologaPrincipal.corrente().id()` — padrão idêntico aos demais `/me/*` e `/pacientes/*` |
| `GET/POST /webhooks/whatsapp` | **Sem JWT** — psicóloga resolvida via `context.id` (Msg 1 ou Msg 2) buscando `lembrete_enviado.psicologa_id`. Fallback por telefone normalizado + janela 48h. Detalhes em §5.3 |
| `POST /dev/whatsapp/simular-resposta` | Profile `dev`, sem auth — bean exposto só quando `spring.profiles.active = dev` via `@ConditionalOnProperty` |

Pacote: `com.psiorganizer.whatsapp/` com sub-pacotes `controller/`, `service/`, `dto/`, `client/`. Diretório do webhook fica em `controller/WebhookController.java` (não em `/me`) pra deixar claro que é endpoint público.

---

## 4. Fluxo de envio (job agendado)

### 4.1 Scheduler

```java
@Component
class LembreteScheduler {
  @Scheduled(cron = "0 0 * * * *", zone = "UTC")
  @SchedulerLock(name = "whatsappLembreteCron", lockAtMostFor = "55m")
  void executar() { ... }
}
```

Justificativa de **`shedlock`** como dependência nova:

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| **A. ShedLock** (`net.javacrumbs.shedlock:shedlock-spring` + `shedlock-provider-jdbc-template`) | Anotação `@SchedulerLock` declarativa; lock distribuído em Postgres via tabela `shedlock`; auto-expira por `lockAtMostFor`; bem mantido | +1 dependência (~120 KB), +1 tabela | **Recomendado** |
| B. Tabela `scheduler_lock` manual + `SELECT FOR UPDATE` no início do job | Zero dependência nova | Código de plumbing, fácil de errar (lock vazado em crash), reinventar shedlock | Não |

Recomendação: **A**. A operação é instalar a tabela `shedlock` (vem com `V2__whatsapp_lembretes.sql`) e anotar. Cobre o caso real de futuro deploy em mais de 1 instância (já temos hoje 1 instância só, mas o custo de carregar isso na fundação é mínimo e remove uma classe inteira de bug se um dia escalar horizontalmente).

### 4.2 Janela ativa

Primeira instrução do `executar()`:

```
ZonedDateTime agoraSp = ZonedDateTime.now(ZoneId.of("America/Sao_Paulo"));
int hora = agoraSp.getHour();
if (hora < 7 || hora > 20) return;   // <10ms, custo zero
```

**Importante:** se o cron *iniciou* dentro da janela e o trabalho ultrapassa 20h por durar muito, **não** interrompemos no meio. O check é só na entrada. Trabalho parcial pode falhar por outros motivos (timeout HTTP, throttle Meta), mas não por mudança de relógio.

**Premissa de timezone:** Brasil abandonou DST em 2019 ([Decreto 9.772/2019](https://www.in.gov.br/web/dou/-/decreto-n-9.772-de-17-de-abril-de-2019-83847650)). `America/Sao_Paulo` permanece em -03:00 ano inteiro. Documentado aqui para que, se DST voltar, isso seja um item de revisão (poderia haver corner case onde 23:00 local vira 22:00 e o job perde uma execução, ou roda 2x). Mitigação se acontecer: `shedlock` já protege duplicação; perda de uma execução só atrasa o envio por 1h.

### 4.3 Lógica do job

Três responsabilidades, todas num único cron pra simplicidade:

#### (a) Envio do dia — happy path

```
para cada psi onde configuracao_whatsapp.ativo = true
    e configuracao_whatsapp.horario_envio_lembrete.hora == hora_local_atual:

    selecionar consultas c onde
        c.psicologa_id = psi.id
        e c.inicio entre amanhã_00:00 e amanhã_23:59:59.999 (SP)
        e c.status_confirmacao = 'AGUARDANDO'
        e c.status IN ('AGENDADA', 'CONFIRMADA')           // ignora REALIZADA/FALTA/CANCELADA
        e não existe lembrete_enviado le com le.consulta_id = c.id

    para cada consulta:
        enviar(consulta)
```

`amanhã` é calculado em SP — `agoraSp.plusDays(1).toLocalDate()` → intervalo `[00:00 SP, 23:59:59.999 SP]` convertido a `Instant` UTC pra query.

#### (b) Envio late-bound

Pra consultas criadas após o horário escolhido (ex: psi escolhe 18:00 e marca às 19:30 uma consulta pra amanhã 10h), o passo (a) já passou pra essa psicóloga. (b) recupera essas consultas no próximo cron dentro da janela:

```
para cada psi onde configuracao_whatsapp.ativo = true:

    selecionar consultas c onde
        c.psicologa_id = psi.id
        e c.inicio > agora + 2 horas            // garante margem mínima
        e c.inicio <= agora + 36 horas          // teto: não pré-envia mais de 1 dia
        e c.status_confirmacao = 'AGUARDANDO'
        e c.status IN ('AGENDADA', 'CONFIRMADA')
        e c.criado_em > hoje_horario_psi_em_sp_inicio_do_dia + horario_envio_lembrete
        e não existe lembrete_enviado le com le.consulta_id = c.id

    para cada consulta: enviar(consulta)
```

A condição `criado_em > horário escolhido de hoje` evita reprocessar consultas que já foram cobertas pelo passo (a) ontem ou agora-pouco. Pior caso de atraso: consulta criada às 21h vai esperar até 07h do dia seguinte (cron dentro da janela). Aceitável.

#### (c) Retry de Msg 2

```
selecionar lembrete_enviado le onde
    le.etapa = 'AGUARDANDO_CONFIRMACAO_DUPLA'
    e le.confirmacao_dupla_enviada_em < agora - 1 hora
    e le.confirmacao_dupla_tentativas < 3

para cada le:
    enviar Msg 2 (texto livre + 2 botões, free na service window)
    le.confirmacao_dupla_tentativas += 1
    le.confirmacao_dupla_enviada_em = agora
    se le.confirmacao_dupla_tentativas == 3:
        nada muda agora; próximo cron na janela ativa fechará pra EXPIRADO se ainda
        sem resposta. Critério: tentativas == 3 e confirmacao_dupla_enviada_em <
        agora - 1h sem mudança de etapa → marca EXPIRADO.
```

Regra de janela: o retry só acontece se o cron está rodando (ou seja, janela já validada na entrada). Tentativa que cairia 21h é naturalmente adiada pro próximo cron válido = 07h do dia seguinte.

Marca `EXPIRADO`: passo separado dentro de (c) que detecta `tentativas == 3 AND última envio < agora - 1h AND etapa = AGUARDANDO_CONFIRMACAO_DUPLA` → atualiza `etapa = EXPIRADO`, `finalizado_em = now`.

### 4.4 Função `enviar(consulta)`

```
paciente = consulta.paciente
se paciente.opt_in_whatsapp != true:
    log("pulando lembrete - opt-in ausente", consulta.id, paciente.id); return
se !telefone_e164_valido(paciente.telefone):
    log("pulando lembrete - telefone invalido", ...); return

# Idempotência via banco — INSERT...ON CONFLICT
result = INSERT INTO lembrete_enviado
    (id, consulta_id, psicologa_id, status_entrega, etapa)
    VALUES (?, consulta.id, consulta.psicologa_id, 'PENDENTE', 'AGUARDANDO_ESCOLHA')
    ON CONFLICT (consulta_id) DO NOTHING
    RETURNING id

se result vazio:
    return   # outro worker pegou. Comum em retry após crash.

# Render do template
texto = render(configuracao.template_mensagem, paciente, consulta, psi)

try:
    response = whatsappClient.enviarTemplate(
        para = paciente.telefone,
        templateName = "lembrete_consulta_v1",
        params = [paciente.nome, psi.nomeCompleto, data, hora]
    )
    atualizar lembrete: mensagem_id_externa = response.id, status_entrega = ENVIADO
catch MetaHttp5xxOrThrottle e:
    # backoff 1min/5min/15min via retry interno do client (não scheduler)
    # se exaurir: marca FALHOU
    atualizar lembrete: status_entrega = FALHOU, erro_codigo, erro_descricao
catch MetaHttp4xx e:
    # 4xx é definitivo
    atualizar lembrete: status_entrega = FALHOU, erro_codigo, erro_descricao
```

**Backoff:** o cliente HTTP tem `RetryTemplate` Spring com 3 tentativas internas (~1min, ~5min, ~15min) só pra 5xx e 429. 4xx fail-fast.

**Render do template:** o template enviado pela Meta é fixo (`lembrete_consulta_v1`, aprovado) com 4 variáveis `{{1}}` paciente, `{{2}}` psicologa, `{{3}}` data, `{{4}}` hora. O campo `configuracao.template_mensagem` é o **texto editorial** que a psi vê e ajusta — esse texto **deve coincidir** com o template aprovado na Meta, exceto pela substituição de variáveis. Decisão: no MVP, edição do `template_mensagem` é "cosmética" (preview pra psi); o que vai pra Meta é sempre o template aprovado. Trade-off discutido em §11. Validação no `PUT /me/whatsapp` verifica que o template editado contém os 4 placeholders esperados — se não contém, `400`.

### 4.5 Pacientes ignoradas

Critérios pra pular silenciosamente (sem decrementar nada, só log):

- `paciente.opt_in_whatsapp = false`
- `paciente.telefone` não é E.164 válido (provavelmente herdado do pré-feature)
- `paciente.ativo = false` (já era ignorado em outros lugares — soft delete preserva consultas históricas mas paciente inativo não deve receber lembrete)

Log estruturado: `{evento: "lembrete_pulado", motivo: "opt_in_ausente"|"telefone_invalido"|"paciente_inativo", consulta_id, paciente_id, psicologa_id}`. Métrica `whatsapp.pulados.total{motivo}`.

---

## 5. Fluxo de resposta (webhook + state machine)

### 5.1 Endpoint público + segurança

#### `GET /webhooks/whatsapp` — handshake

Meta dispara um GET no setup do webhook:
```
?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=YYY
```

Handler:
- Se `hub.mode == "subscribe"` e `hub.verify_token == WHATSAPP_VERIFY_TOKEN` → responde `200` com o body sendo `hub.challenge` literal.
- Senão → `403`.

#### `POST /webhooks/whatsapp` — eventos

- Validação **HMAC-SHA256** do header `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET`. O hash é calculado sobre o **body bruto** (não parseado) — o controller lê o body como `byte[]` antes de parsear JSON. Se assinatura inválida → `401`.
- Após validação, **sempre responder `200` em <5s** — a Meta retentará agressivamente se receber 5xx ou timeout. Processo assíncrono via `@Async` na maioria dos casos, exceto state transitions críticas (responder Msg 2 sincronamente quando paciente clica botão garante UX rápida).

Estratégia recomendada:
- Parse JSON síncrono (~ms) → enfileira evento internamente via `ApplicationEventPublisher` → responde `200`.
- Listener `@Async` processa o evento (UPDATE no banco + eventual envio de Msg 2 pra Meta).
- Trade-off: se a app cair entre o `publish` e o processamento, evento é perdido. Aceitável porque Meta retentará por até 7 dias com backoff — a duplicidade é absorvida pela máquina de estados (transições não-idempotentes são guardadas por checagem de etapa).

### 5.2 Body do evento Meta

Schema relevante (extrato):

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "wamid.RESPOSTA_DA_PACIENTE",
          "from": "5511987654321",
          "timestamp": "1717084800",
          "type": "interactive",
          "interactive": {
            "type": "button_reply",
            "button_reply": { "id": "btn_confirmar", "title": "Confirmar" }
          },
          "context": { "id": "wamid.MENSAGEM_RESPONDIDA" }
        }],
        "statuses": [{
          "id": "wamid.X",
          "status": "delivered",
          "timestamp": "1717084801"
        }]
      }
    }]
  }]
}
```

Dois tipos relevantes:
- **`messages[]`**: respostas da paciente. O campo `context.id` é o ID da mensagem **respondida** (Msg 1 ou Msg 2).
- **`statuses[]`**: eventos de ciclo de vida da mensagem (`sent`, `delivered`, `read`, `failed`). `id` é o ID da mensagem que mudou de estado.

### 5.3 Resolução de tenant

Sem JWT, precisamos descobrir qual psicóloga é a dona do evento. Estratégia em camadas:

**Camada 1 — `context.id` (preferencial):**

```
para cada msg em entry[].changes[].value.messages[]:
    contextId = msg.context.id   # ID da mensagem respondida

    le = SELECT * FROM lembrete_enviado
         WHERE mensagem_id_externa = contextId
            OR mensagem_confirmacao_dupla_id = contextId
         LIMIT 1

    se le encontrado:
        psicologa_id = le.psicologa_id   # ✓ resolvido
        processar(le, msg)
        continue
    senão: ir pra camada 2
```

Funciona em **100% dos casos quando paciente clica um botão** — Meta sempre inclui `context.id` em `interactive.button_reply`.

**Camada 2 — fallback por telefone + janela:**

Casos onde `context` pode faltar: resposta de texto livre que não está respondendo nenhuma mensagem específica, evento corrompido, edge case Meta. Recuperação:

```
telefone = msg.from   # ex: "5511987654321" — Meta envia sem '+'
telefoneE164 = "+" + telefone

candidatos = SELECT * FROM lembrete_enviado le
     JOIN consulta c ON c.id = le.consulta_id
     JOIN paciente p ON p.id = c.paciente_id
     WHERE regexp_replace(p.telefone, '\D', '', 'g') = telefone   # normaliza
       AND le.enviado_em > now() - interval '48 hours'
       AND le.etapa IN ('AGUARDANDO_ESCOLHA', 'AGUARDANDO_CONFIRMACAO_DUPLA')
     ORDER BY le.enviado_em DESC
```

Janela de 48h cobre: lembrete enviado dia D-1, paciente responde dia D. Janela mais larga aumentaria ambiguidade entre psicólogas atendendo a mesma paciente. Etapas terminais (FINALIZADO, EXPIRADO, CONGELADO_POR_LOOP) ficam fora — resposta a elas seria descartada pela state machine de qualquer forma, e incluí-las só roubaria o match de um lembrete ativo.

**Ambiguidade no fallback:** o número Meta é único pra todos os tenants, então o telefone sozinho **não identifica a psicóloga**. Se os candidatos da janela pertencem a 2+ psicólogas (mesma paciente atendida por ambas, ambos lembretes ativos), a resposta é **descartada** e contada em `whatsapp.eventos.ambiguos.total` — atribuir ao mais recente poderia confirmar/cancelar a consulta do tenant errado. Se todos os candidatos são da mesma psicóloga, usa o mais recente. *(Decisão revista em 2026-06-11 — a versão original escolhia o mais recente mesmo entre tenants; ver docs/REFACTOR_PLAN.md B1.)*

**Sem match em nenhuma camada:** loggado como evento estranho (`whatsapp.eventos.orfaos.total`), respondido 200 (não retornamos 4xx pra evitar retry Meta indefinido), descartado.

### 5.4 State machine

5 estados, transições disparadas por: resposta da paciente (botão ou texto), retry do scheduler, evento de status Meta.

```
       ┌──────────────────────────┐
       │   AGUARDANDO_ESCOLHA     │   (estado inicial após envio bem-sucedido da Msg 1)
       └──────────────────────────┘
          │
          ├── resposta button_reply.title="Confirmar"
          │   → escolha_inicial = CONFIRMAR
          │   → envia Msg 2 ("Você escolheu confirmar. Confirma?" + [Sim, confirmar] [Voltar])
          │   → atualiza mensagem_confirmacao_dupla_id, confirmacao_dupla_enviada_em
          │   → confirmacao_dupla_tentativas = 1
          │   ⇒ AGUARDANDO_CONFIRMACAO_DUPLA
          │
          ├── resposta button_reply.title="Cancelar"
          │   → escolha_inicial = CANCELAR
          │   → envia Msg 2 ("Você escolheu cancelar. Confirma?" + [Sim, cancelar] [Voltar])
          │   → idem flow acima
          │   ⇒ AGUARDANDO_CONFIRMACAO_DUPLA
          │
          └── resposta texto livre (não-button)
              → ignora, loga: {evento: "resposta_livre", etapa, valor_truncado}
              ⇒ AGUARDANDO_ESCOLHA (não muda)

       ┌────────────────────────────────┐
       │ AGUARDANDO_CONFIRMACAO_DUPLA   │
       └────────────────────────────────┘
          │
          ├── resposta button_reply.title começa com "Sim,"
          │   → escolha_final = escolha_inicial
          │   → finalizado_em = now()
          │   → aplica na consulta (vide §5.5)
          │   ⇒ FINALIZADO
          │
          ├── resposta button_reply.title="Voltar"
          │   ├── ciclos_voltar < 3
          │   │   → ciclos_voltar += 1
          │   │   → escolha_inicial = NULL
          │   │   → confirmacao_dupla_tentativas = 0
          │   │   → reenvia Msg 1 (texto livre + 2 botões, free na service window)
          │   │   ⇒ AGUARDANDO_ESCOLHA
          │   │
          │   └── ciclos_voltar = 3   (4ª vez clicando Voltar)
          │       → envia "Se precisar de ajuda, fale direto com {psicologa}."
          │       → finalizado_em = now()
          │       ⇒ CONGELADO_POR_LOOP
          │
          ├── resposta texto livre
          │   → ignora, loga
          │   ⇒ AGUARDANDO_CONFIRMACAO_DUPLA (não muda)
          │
          ├── (scheduler passo c) tentativas < 3 e última_msg2 < agora-1h e janela ativa
          │   → reenvia Msg 2
          │   → confirmacao_dupla_tentativas += 1
          │   → mensagem_confirmacao_dupla_id = nova_id
          │   → confirmacao_dupla_enviada_em = now()
          │   ⇒ AGUARDANDO_CONFIRMACAO_DUPLA (não muda)
          │
          └── (scheduler) tentativas = 3 e última_msg2 < agora-1h
              → finalizado_em = now()
              ⇒ EXPIRADO

       ┌────────────────────────────────────────────────┐
       │  FINALIZADO | EXPIRADO | CONGELADO_POR_LOOP    │   (estados terminais)
       └────────────────────────────────────────────────┘
          │
          └── qualquer resposta → ignora, loga {evento: "resposta_em_estado_terminal", ...}
```

**Invariantes:**
- Transição pra `FINALIZADO`/`EXPIRADO`/`CONGELADO_POR_LOOP` sempre set `finalizado_em`.
- `escolha_inicial` é `NULL` em `AGUARDANDO_ESCOLHA` e em `CONGELADO_POR_LOOP`/`EXPIRADO`; preenchida em `AGUARDANDO_CONFIRMACAO_DUPLA` e `FINALIZADO`.
- `escolha_final` é preenchida **apenas** em `FINALIZADO`.
- Estados terminais nunca voltam.

**Concorrência:** lock pessimista (`SELECT ... FOR UPDATE`) na linha de `lembrete_enviado` durante a transação de transição. Sem isso, dois eventos próximos (paciente clica Sim duas vezes; Meta entrega o evento duas vezes) poderiam aplicar a consulta duas vezes. Mitigação alternativa: optimistic locking via `@Version`. Recomendação: **pessimista** porque a operação inclui side-effect (POST pra Meta) e queremos evitar retry com half-applied state. O `SELECT ... FOR UPDATE` segura a linha durante a transição inteira, incluindo o HTTP call. Timeout curto (2s) pra não engasgar webhook.

### 5.5 Aplicação na consulta (apenas em FINALIZADO)

```
se escolha_final = CONFIRMAR:
    consulta.status_confirmacao = CONFIRMADA
    consulta.confirmada_pela_paciente_em = now()
    # status operacional NÃO muda — psi continua dona dele

se escolha_final = CANCELAR:
    consulta.status_confirmacao = CANCELADA_PELA_PACIENTE
    consulta.status = CANCELADA          # novo valor no enum, ver §2.2.1
    notificar psi (in-app)               # ver §11 pergunta aberta
```

Cancelamento pela paciente **não** apaga a consulta — mantém o registro pra histórico/auditoria. Diferente do soft delete de paciente (que hard-deleta futuras AGENDADA/CONFIRMADA).

### 5.6 Eventos de status Meta

`statuses[]` mexe **apenas** em `lembrete_enviado.status_entrega`, nunca em `etapa`:

| Meta status | `lembrete_enviado.status_entrega` |
|---|---|
| `sent` | `ENVIADO` |
| `delivered` | `ENTREGUE` |
| `read` | `LIDO` |
| `failed` | `FALHOU` + grava `erro_codigo`/`erro_descricao` |

`failed` em Msg 1 com status `FALHOU` é caso terminal — não tenta de novo (`UNIQUE(consulta_id)` já bloquearia). Psi vê na auditoria e contata paciente manualmente.

---

## 6. Multi-tenant e segurança

### 6.1 Multi-tenant

- `psicologa_id` em todas as 2 tabelas novas (`configuracao_whatsapp` UNIQUE, `lembrete_enviado` denormalizado).
- Toda query autenticada filtra por `PsicologaPrincipal.corrente().id()` no service — padrão idêntico a `paciente`/`consulta` ([ARCHITECTURE.md §2.3](../ARCHITECTURE.md#23-multi-tenancy)).
- Webhook resolve tenant via `context.id` (primário) + telefone+janela (fallback), conforme §5.3.
- Dev endpoint (`/dev/whatsapp/simular-resposta`) ativado apenas no profile `dev`.

### 6.2 Credenciais

**Sem cifragem por tenant no MVP** porque há um único `phone_number_id` e um único `access_token` da plataforma — vivem em env vars no host (12-factor). Quando modo número-próprio entrar:
- Adicionar tabela `credencial_whatsapp(psicologa_id, phone_number_id_cifrado, access_token_cifrado, ...)`.
- Cifragem AES-GCM com `@jakarta.persistence.Converter(autoApply=false)` aplicado às colunas sensíveis.
- Chave-mestra em env var (`WHATSAPP_CREDS_AES_KEY`), 256-bit.

Registrado em §11 como follow-up, não é decisão pendente.

### 6.3 Webhook — HMAC

Implementação:

```
1. Controller lê body como byte[] (precisa configurar @RequestMapping pra não consumir como JSON automaticamente; usa HttpServletRequest.getInputStream() ou converter customizado)
2. Calcula sha256_hex(WHATSAPP_APP_SECRET, body)
3. Compara em constant-time com header X-Hub-Signature-256 (formato "sha256=ABC...")
4. Se diferente → 401 Unauthorized, sem corpo
5. Só então parseia JSON e processa
```

`constant-time` evita timing attack: `MessageDigest.isEqual(byte[], byte[])` no Java.

### 6.4 Validação E.164 do telefone

**Anotação custom `@TelefoneE164`** aplicada em:
- `PacienteRequest.telefone` (novo)
- `EnviarTesteRequest.telefoneE164`

Opções de implementação:

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| **A. Google libphonenumber** (`com.googlecode.libphonenumber:libphonenumber`) | Validação E.164 robusta para qualquer país; valida prefixo de operadora; padrão da indústria | +1 dependência (~6 MB), peso real | **Recomendado** |
| B. Regex `^\\+55\\d{10,11}$` próprio | Zero dependência | Não valida prefixo de operadora; aceita números sintaticamente OK mas inválidos (ex: `+5500000000000`); brasil-only frágil | Não |

Recomendação: **A**. 6 MB é dentro do aceitável pra um backend single-binary. Validador chama `PhoneNumberUtil.isValidNumber()` e padroniza com `format(E164)` antes de persistir.

**Telefones existentes (seed e prod):** migration **não** transforma `paciente.telefone`. UI no `PerfilPage` e `PacienteForm` exige re-cadastro em formato E.164 ao tentar salvar pós-feature. Pacientes não editados ficam com telefone "livre" no banco e simplesmente não recebem lembrete (passo 4.5 pula). Sem perda de dados, custo de migração distribuído.

### 6.5 Rate limiting do webhook público

Webhook é endpoint público — Meta dispara dezenas/segundo em pico. Risco: atacante envia HMAC inválido em loop, queimando CPU em hash.

Opções:

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| **A. bucket4j em memória** (`com.bucket4j:bucket4j-core`) | Token bucket idiomático; sem dep externa; configuração simples | +1 dependência (~200 KB); não funciona multi-instância sem `bucket4j-redis` (não temos Redis) | **Recomendado** |
| B. Contagem em Postgres com janela (tabela `rate_limit(ip, janela, count)`) | Zero dependência nova; funciona multi-instância | +1 query por request, lock contention em pico | Não |
| C. Nginx/proxy reverso rate-limit | Externalizado, eficiente | Não decidimos infra de proxy ainda — fora do escopo MVP | Não |

Recomendação: **A**. Bucket por IP em memória, 60 req/min/IP. Como temos 1 instância, mem suficiente. Se Meta dispara em rajada, ela já vem de IPs publicados da Meta — manter lista de **allowlist** dos IPs Meta documentados ([developers.facebook.com/docs/sharing/webhook/](https://developers.facebook.com/docs/sharing/webhook/)) e isentar essas faixas do rate limit. Implementação: filtro Servlet antes do controller, check IP allowlist primeiro.

### 6.6 LGPD + CFP

**Opt-in da paciente — obrigatoriedade:**

Opções:
- **A. Opt-in obrigatório no cadastro** (checkbox marcado como default = `false`, paciente decide). Sem opt-in, paciente é criada normalmente, mas não recebe lembrete.
- B. Opt-out — checkbox default `true`. Mais conversão, mais risco LGPD/CFP.

Recomendação: **A**. CFP é particularmente sensível a comunicação por psicóloga ↔ paciente; opt-in explícito é a postura defensável. Conversão menor é aceitável.

**Texto do opt-in (sugerido, ajustar com revisão jurídica):**

> "Autorizo receber lembretes de consulta da {psicologa.nome} via WhatsApp no número informado. Posso revogar a qualquer momento atualizando meu cadastro."

**Pacientes existentes em prod:** migração popula `opt_in_whatsapp = false`. Pra dar visibilidade, a UI mostra um banner discreto em `/pacientes` no primeiro login pós-feature: "X pacientes ainda não autorizaram lembretes via WhatsApp. Atualize quando estiver com elas pra ativar". Sem prompt invasivo.

**Revogação:** psi desmarca opt-in no `PacienteForm`. Histórico (`lembrete_enviado`) é preservado, mas envios futuros param. Não é GDPR/LGPD-delete completo — só interromper canal. Apagar histórico requer hard delete da paciente (fora do escopo).

---

## 7. Configuração e operação

### 7.1 Variáveis de ambiente

| Variável | Exemplo | Notas |
|---|---|---|
| `WHATSAPP_GRAPH_API_VERSION` | `v21.0` | Fixado no spec; revisar 1x/trimestre |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789012345` | ID Meta do número da plataforma |
| `WHATSAPP_WABA_ID` | `987654321098765` | ID da WhatsApp Business Account |
| `WHATSAPP_ACCESS_TOKEN` | `EAAG...` (System User token) | Longa duração; rotacionar 1x/ano |
| `WHATSAPP_APP_SECRET` | `abc123...` | Secret do app Meta, usado no HMAC |
| `WHATSAPP_VERIFY_TOKEN` | `psi-organizer-verify-2026` | Geramos; arbitrário, qualquer string |

`application.yml`:
```yaml
psi:
  whatsapp:
    graph-api-version: ${WHATSAPP_GRAPH_API_VERSION:v21.0}
    phone-number-id: ${WHATSAPP_PHONE_NUMBER_ID:}
    waba-id: ${WHATSAPP_WABA_ID:}
    access-token: ${WHATSAPP_ACCESS_TOKEN:}
    app-secret: ${WHATSAPP_APP_SECRET:}
    verify-token: ${WHATSAPP_VERIFY_TOKEN:dev-verify}
```

Boot fail-fast: `WhatsappProperties` com `@ConfigurationProperties` + validação que exige todas as 6 quando profile != `dev`.

### 7.2 Setup Meta — checklist passo-a-passo

1. **Meta Business Manager**: criar [business.facebook.com](https://business.facebook.com) com CNPJ da plataforma (Psi Organizer LTDA ou afim). Fazer **verificação de negócio** (Business Verification) — exige documentos do CNPJ, pode levar 1-2 semanas. **Bloqueador da PR B**.
2. **WhatsApp Business Account (WABA)**: dentro do Business Manager, criar WABA. Cadastrar número da plataforma (linha PJ comprada, **não** pode reutilizar WhatsApp pessoal). Anota `WABA_ID` e `PHONE_NUMBER_ID`.
3. **Template `lembrete_consulta_v1`** — submeter pra aprovação Meta:
   - Categoria: `UTILITY`
   - Idioma: `pt_BR`
   - Body: texto base alinhado ao default em §2.1.1, com 4 variáveis `{{1}}`/`{{2}}`/`{{3}}`/`{{4}}` (paciente, psicologa, data, hora)
   - 2 reply buttons: `Confirmar` e `Cancelar`
   - Aprovação: 1-3 dias úteis (pode bouncear, ajustar texto)
4. **Template `teste_lembrete_consulta_v1`** — variante 1-variável pra `POST /me/whatsapp/teste`. Body simples: `"Teste de lembrete enviado por {{1}}. Tudo certo do seu lado?"` — sem botões, single-variable.
5. **System User + token de longa duração**: criar System User no Business Settings, gerar token com permissions `whatsapp_business_messaging` + `whatsapp_business_management`. Token é "no expiration" mas Meta pode revogar; configurar **monitor** de erro 401 no client.
6. **Webhook**: configurar URL `https://api.psi-organizer.com.br/webhooks/whatsapp` (assume domínio fixado), `verify_token` igual a `WHATSAPP_VERIFY_TOKEN`. Subscrever campos `messages` e `message_template_status_update` (pra ser avisado se Meta despromover template).

### 7.3 Cliente HTTP (`WhatsappClient`)

Interface no pacote `whatsapp/client/`:

```
interface WhatsappClient {
    EnvioResultado enviarTemplate(String paraE164, String templateName, List<String> params);
    EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes);  // service window
    EnvioResultado enviarTextoLivre(String paraE164, String texto);                                // service window
}
```

Duas implementações:

- **`MetaWhatsappClient`** (`@Profile("!dev")`): `RestClient` Spring com base URL `https://graph.facebook.com/v21.0/`, retry interno via `RetryTemplate` (1min/5min/15min em 5xx + 429), timeout 10s. Mapeia respostas de erro Meta pra `WhatsappException` com `erro_codigo` e `erro_descricao`.
- **`MockWhatsappClient`** (`@Profile("dev")`): loga payload estruturado e retorna `EnvioResultado` com `mensagemIdExterna = "mock-" + UUID`. Permite testar fluxo de envio + máquina de estados sem Meta real.

### 7.4 Modo dev local

`POST /dev/whatsapp/simular-resposta` (perfil `dev` only):

Request:
```json
{
  "lembreteId": "uuid",
  "tipoResposta": "BOTAO|TEXTO",
  "valorBotao": "Confirmar|Cancelar|Sim, confirmar|Sim, cancelar|Voltar",
  "valorTexto": null,
  "contextoMensagemId": "msg-1|msg-2"
}
```

Injeta o evento direto no `WebhookService.processarMensagem(...)` simulando um payload Meta, sem precisar de HMAC válido. Bean criado com `@ConditionalOnProperty(name = "spring.profiles.active", havingValue = "dev")`.

### 7.5 Observabilidade

**Log estruturado JSON** (Logback com `logstash-logback-encoder` — já presente? se não, adicionar como dep de log only). Cada evento inclui:

- `consulta_id`, `psicologa_id`, `mensagem_id_externa`
- `etapa` antes e depois
- `escolha_inicial`, `escolha_final`
- `ciclos_voltar`, `confirmacao_dupla_tentativas`
- `evento` (string discriminator: `lembrete_enviado`, `resposta_recebida`, `transicao_estado`, `lembrete_pulado`, etc.)

**Métricas Micrometer** (já vem com Actuator):

| Métrica | Tipo | Tags |
|---|---|---|
| `whatsapp.enviados.total` | Counter | `tipo=msg1\|msg2\|msg3` |
| `whatsapp.confirmacao_dupla.reenviados.total` | Counter | — |
| `whatsapp.expirados.total` | Counter | — |
| `whatsapp.congelados_loop.total` | Counter | — |
| `whatsapp.falhas.total` | Counter | `codigo` (top 10 por cardinality cap) |
| `whatsapp.respostas.total` | Counter | `etapa`, `escolha` |
| `whatsapp.pulados.total` | Counter | `motivo` |
| `whatsapp.eventos.orfaos.total` | Counter | — (tenant não resolvido) |
| `whatsapp.webhook.latencia` | Timer | — |

Endpoint Prometheus em `/actuator/prometheus` (já existe se `spring-boot-starter-actuator` está adicionado). Dashboard Grafana sugerido em PR D (não bloqueia entrega).

---

## 8. Custo operacional

### 8.1 Tabela de preços Meta (BR, 2026-05)

| Categoria | Preço por mensagem | Aplicação |
|---|---|---|
| `UTILITY` | ~US$0,008 ≈ **R$0,04** | Msg 1 (lembrete inicial) |
| `MARKETING` | ~US$0,06 ≈ R$0,30 | N/A (fora do escopo) |
| `AUTHENTICATION` | ~US$0,03 ≈ R$0,15 | N/A |
| **Service window 24h** | **grátis** | Msg 2, retries, Msg 3 (despedida) |

Service window de 24h: aberta quando paciente envia qualquer mensagem (incluindo clicar botão) e dura 24h. Durante essa janela, texto livre + interactive (botões) são gratuitos. Como Msg 2 sempre acontece logo após o clique da paciente, está sempre na janela.

### 8.2 Projeção MVP

Premissas:
- 10 psicólogas ativas
- 10 pacientes únicos/dia (1 lembrete/consulta)
- 22 dias úteis/mês
- 90% de adesão (opt-in)

```
2.200 lembretes/mês × R$0,04 = R$88/mês total
                              ≈ R$8,80/psi/mês
```

Pra contexto: assinatura SaaS típica é R$50-150/psi/mês, então R$8,80 é ~6-18% do MRR — diluível.

### 8.3 Quando reavaliar

- ≥50 psi ativas (R$440/mês ainda OK, mas vale revisitar pricing)
- Adoção futura de `MARKETING` ou `AUTHENTICATION`
- Aumento de preço Meta (avisado com ~90 dias de antecedência)
- Mudança da Meta na política de service window 24h

---

## 9. UI (frontend) — sketch

### 9.1 Página `/configuracoes/whatsapp`

Decisão de IA: **rota dedicada** `/configuracoes/whatsapp`, não seção em `/perfil`.

Justificativa: WhatsApp é um sistema complexo o suficiente (toggle global, template, horário, teste, histórico) pra merecer espaço próprio. Misturar com `/perfil` (dados pessoais + endereço) deixa a tela do perfil sobrecarregada. Criar `/configuracoes/` como container reserva espaço pra futuras configurações de plataforma sem repensar IA.

**Item no drawer:** adicionar grupo "Configurações" no `AppShell` com sub-item "WhatsApp". Se aparecer 1 só item, basta link direto "Configurações de WhatsApp". Trade-off: revisar quando tiver mais 1-2 configs (notificações, integrações).

**Componentes principais:**

- **Toggle**: `Switch` MUI "Enviar lembretes 1 dia antes" controlando `ativo`. Quando desligado, restante da página fica `disabled` mas visível.
- **`Select` de horário**: 14 opções `07:00`, `08:00`, ..., `20:00`. Default `18:00`. Label: "Horário de envio".
- **Editor de template** (`TextField` multiline, 8 linhas, max 1024 chars):
  - Tooltip explicando placeholders aceitos.
  - **Preview ao vivo** ao lado (em `<md` empilha embaixo), com card mockando WhatsApp — bubble cinza com texto renderizado substituindo placeholders por valores de exemplo (`Maria`, `Dra. Ana Silva`, `30/05/2026`, `14:00`).
  - Contador de caracteres: `123 / 1024` — cor neutra até 900, warning amarelo em 901-1023, error vermelho em 1024.
- **Botão "Enviar teste"**: abre `Dialog` com campo de telefone (validação E.164 inline, placeholder `+5511987654321`) + botão "Enviar". Após sucesso, Snackbar verde "Teste enviado!".
- **Link "Ver histórico"** → `/configuracoes/whatsapp/historico`.

**Sem seção de "número próprio"** — fora do MVP.

### 9.2 Página `/configuracoes/whatsapp/historico`

Tabela paginada:

| Coluna | Conteúdo |
|---|---|
| Enviado em | `29/05/2026 18:00` |
| Paciente | `Maria Souza` (link → `/pacientes/{id}`) |
| Consulta | `30/05/2026 14:00` |
| Status entrega | chip — `Pendente`/`Enviado`/`Entregue`/`Lido`/`Falhou` |
| Etapa | chip — `Aguardando escolha`/`Aguardando confirmação`/`Finalizado`/`Expirado`/`Congelado por loop` |
| Escolha final | `Confirmou`/`Cancelou`/`—` |
| Reenvios Msg 2 | `0/3`, `2/3`, etc |
| Detalhes | botão `i` → modal com erro_codigo se aplicável + timeline da máquina de estados |

Filtros (acima da tabela):
- Período (date range, default últimos 30 dias)
- Etapa (multi-select)
- Status entrega (multi-select)

Paginação `limit=50` por padrão, "Ver mais" anexa lote (mesmo padrão do `/pacientes/{id}/consultas`).

### 9.3 Agenda (`/agenda`) — chip de status

Cada bloco de consulta na grade recebe um **chip pequeno** no canto inferior direito:

| `status_confirmacao` | Chip | Tooltip |
|---|---|---|
| `AGUARDANDO` | cinza, ícone relógio, "Aguardando" | se `lembrete_enviado.etapa = AGUARDANDO_CONFIRMACAO_DUPLA`: "Paciente iniciou confirmação"<br>se `EXPIRADO`: "Paciente não finalizou confirmação"<br>se `CONGELADO_POR_LOOP`: "Confirmação cancelada após múltiplas voltas — fale com a paciente"<br>se nenhum lembrete enviado ainda: "Lembrete será enviado em {data} às {hora}" |
| `CONFIRMADA` | verde, check, "Confirmada" | "Confirmada pela paciente em {data} {hora}" |
| `CANCELADA_PELA_PACIENTE` | vermelho, X, "Cancelada" | "Cancelada pela paciente em {data} {hora}" — bloco da consulta com style tachada e opacidade 60% |

Cores derivadas de `theme.palette.statusConsulta` (já existe) — adicionar 1 token novo se faltar (`statusConfirmacao.aguardando|confirmada|canceladaPaciente`). Detalhes ficam pra discussão no design system pós-spec.

### 9.4 `PacienteForm` — opt-in + telefone E.164

- Campo **telefone** ganha máscara `+55 (DD) NNNNN-NNNN` com validação E.164 inline. Backend recebe sem máscara (só `+5511987654321`). Erro inline: "Use o formato +55 DDD número".
- **Checkbox opt-in WhatsApp** abaixo do telefone:
  ```
  [ ] Autorizo receber lembretes de consulta da {psi.nomeCompleto} via
      WhatsApp no número informado.
  ```
  Quando marcado, set `opt_in_whatsapp = true` e backend stamp `opt_in_whatsapp_em`. Desmarcar revoga (sem deletar histórico).
- Helper text: "Sem essa autorização, a paciente não receberá lembretes."

### 9.5 Aviso de reagendamento

Em `ConsultaDialog` (editar consulta) — se `lembrete_enviado` existe pra essa consulta E `enviado_em IS NOT NULL` E o usuário muda `inicio`:

```
⚠️ O lembrete já foi enviado.
   A paciente precisa ser avisada da mudança manualmente.
```

`Alert` outlined warning, sempre visível enquanto o campo `inicio` é diferente do original.

### 9.6 Notificação in-app de cancelamento

Quando `status_confirmacao` vira `CANCELADA_PELA_PACIENTE`, a psi precisa saber rápido. Sem WebSocket:

**Recomendação:** **badge na AppBar** (ícone sino com count) + **lista de notificações** em popover ao clicar. Polling do endpoint `GET /me/notificacoes` a cada 60s quando aba focada (browser API `document.visibilityState`), 5min quando blur. Endpoint retorna eventos não-lidos ordenados desc, payload pequeno.

Tabela `notificacao(id, psicologa_id, tipo, payload_json, criada_em, lida_em)`. Implementação leve: 1 row por cancelamento, criada no service que aplica o status. UI marca como lida ao abrir o popover.

**Alternativa considerada:** toast on-screen no momento. Ruim porque psi pode estar fora da app — perde notificação. Lista persistente em UI é a opção segura.

**Trade-off de polling 60s**: latência aceitável (psi vê cancelamento em até 1min). Custo de Postgres é desprezível pra <50 psi.

---

## 10. Plano de entrega em PRs

4 PRs ordenadas. Cada uma é mergeável independente, com flag desligado em produção até a próxima PR liberar.

### PR A — Fundação (sem mensagem real)

**Inclui:**
- Migration `V2__whatsapp_lembretes.sql`: tabelas novas, colunas em `consulta`/`paciente`, índices, tabela `shedlock`.
- Entities + Repositories: `ConfiguracaoWhatsapp`, `LembreteEnviado`, atualização de `Paciente` e `Consulta`.
- Service `ConfiguracaoWhatsappService`: get/atualizar (lazy create na primeira leitura).
- Controller `ConfiguracaoWhatsappController`: `GET/PUT /me/whatsapp`.
- Custom validator `@TelefoneE164` (libphonenumber).
- Custom validator `@TemplateValido` (checa placeholders).
- DTOs e validações.
- `WhatsappClient` interface + `MockWhatsappClient` (`@Profile("!prod")`).
- Frontend: nova rota `/configuracoes/whatsapp` com Toggle/Select/Editor/Preview/Teste (botão Teste **desabilitado nesta PR** com tooltip "Disponível após PR B").
- Frontend: `PacienteForm` ganha checkbox opt-in + máscara E.164.
- Item no drawer "Configurações > WhatsApp" no AppShell.

**Dependências adicionadas:**
- `libphonenumber` (justificado em §6.4)
- `shedlock-spring` + `shedlock-provider-jdbc-template` (justificado em §4.1)

**Sai sem:** envio real, scheduler, webhook.

**Critério de merge:** `mvn verify` + `npm run build` verdes. Não exige Meta cadastrada. Toggle `ativo` aparece mas não dispara nada.

### PR B — Envio básico ponta-a-ponta (sem confirmação dupla)

**Inclui:**
- `MetaWhatsappClient` real (`@Profile("!dev")`) + `WhatsappProperties` com `@Validated`.
- `LembreteScheduler` com `@Scheduled` + `@SchedulerLock` — passos (a) e (b) de §4.3 (sem retry de Msg 2 ainda).
- `LembreteEnvioService`: lógica de `enviar(consulta)` incluindo INSERT...ON CONFLICT.
- Template `lembrete_consulta_v1` aprovado pela Meta (bloqueador externo, ver §11).
- `POST /me/whatsapp/teste` ativo.
- Frontend: botão "Enviar teste" funcional.
- **Sem webhook ainda** — fluxo simplificado: paciente clica `[Confirmar]` ou `[Cancelar]` e nada acontece (clique cai em "resposta livre não-tratada"). MVP do MVP testável: envio funciona, leitura de status entrega via Meta dashboard.
- Variáveis de ambiente documentadas em `application.yml` + `.env.example`.

**Flags:**
- `configuracao_whatsapp.ativo` default `false` por psi — opt-in via UI da PR A.
- Sem feature flag global; controle por psicóloga.

**Bloqueadores externos:**
- Verificação de negócio Meta concluída (1-2 semanas antes da PR).
- Template `lembrete_consulta_v1` aprovado (1-3 dias úteis).
- Número de produção cadastrado e ativado.

**Sai sem:** webhook, máquina de estados completa, retry Msg 2, histórico em UI.

**Critério de merge:** smoke test manual com psi-piloto (Bruno) recebendo lembrete real no próprio número, validando template renderizado.

### PR C — Confirmação dupla + state machine

**Inclui:**
- `WebhookController` (`GET` + `POST` em `/webhooks/whatsapp`).
- HMAC validação + parsing de payload Meta.
- `WebhookService.processarMensagem(...)` + `processarStatus(...)`.
- Máquina de estados completa de 5 estados (§5.4) com `SELECT FOR UPDATE`.
- Passo (c) do scheduler — retry de Msg 2.
- Template `teste_lembrete_consulta_v1` (single-var, sem botões) — aprovado em paralelo.
- Tabela `notificacao` + endpoint `GET /me/notificacoes` + badge na AppBar com polling.
- Frontend: chip de status na Agenda + tooltips contextuais.
- Frontend: Alert warning em `ConsultaDialog` quando reagendamento pós-lembrete.
- `bucket4j` no webhook.

**Dependências adicionadas:**
- `bucket4j-core` (justificado em §6.5)

**Flags:**
- Toggle `psi.whatsapp.bidirecional.ativo` (app-level) — pode ser desligado pra reverter rapidamente sem rollback, mantendo o envio da PR B funcionando. Padrão `true` quando merge.

**Sai sem:** histórico em UI rica, dashboards Grafana, endpoint dev.

**Critério de merge:** smoke test manual ponta-a-ponta com psi-piloto: receber lembrete → clicar Confirmar → receber Msg 2 → clicar Sim → ver chip verde na agenda. Testar Voltar 4x → ver mensagem de despedida.

### PR D — Auditoria e operação

**Inclui:**
- `GET /me/whatsapp/lembretes` (auditoria paginada).
- Frontend: página `/configuracoes/whatsapp/historico` com filtros + tabela.
- Métricas Micrometer (§7.5).
- Log estruturado JSON via `logstash-logback-encoder` se não estiver presente.
- `POST /dev/whatsapp/simular-resposta` (perfil dev).
- Documentação operacional: runbook em `docs/runbooks/whatsapp.md` (alarmes, ações em incidente).
- Atualização das docs principais via `/psi-docs-sync` em PR separada.

**Sai sem:** dashboard Grafana pronto (separado, em ambiente de infra).

**Critério de merge:** review da UI de histórico + métrica `whatsapp.enviados.total` visível em `/actuator/prometheus`.

### Resumo de dependências

| PR | shedlock | libphonenumber | bucket4j |
|---|---|---|---|
| A | ✓ (instalada, sem uso ainda) | ✓ | — |
| B | ✓ (uso no scheduler) | já | — |
| C | já | já | ✓ |
| D | já | já | já |

---

## 11. Riscos e perguntas abertas

### 11.1 Bloqueadores externos

| Risco | Mitigação |
|---|---|
| **Aprovação do template `lembrete_consulta_v1`** pela Meta (1-3 dias úteis, pode bouncear) | Submeter na semana anterior à PR B. Plano B: revisar texto e re-submeter. |
| **Verificação de negócio Meta exige CNPJ** | Confirmar CNPJ Psi Organizer LTDA disponível. Sem CNPJ, feature não vai a produção. |
| **Token de System User pode ser revogado** silenciosamente pela Meta | Monitor 401 da Meta no client + alerta. Documentar passo "regerar token" no runbook (PR D). |
| **Mudança de preço Meta** | Aviso 90 dias antes — monitorar [pricing page](https://developers.facebook.com/docs/whatsapp/pricing/). |

### 11.2 Perguntas abertas (precisam de decisão antes do merge)

| # | Pergunta | Recomendação |
|---|---|---|
| Q1 | **Opt-in obrigatório no cadastro** ou opt-out? | Obrigatório (default `false`). Justificado em §6.6. |
| Q2 | **Pacientes existentes em prod** — popup invasivo ou banner discreto? | Banner discreto em `/pacientes`. Sem popup, sem fluxo guiado obrigatório. |
| Q3 | **Notificação in-app de cancelamento** — badge+lista ou só toast? | Badge na AppBar + lista persistente. Polling 60s/5min focada/blur. Detalhado em §9.6. |
| Q4 | **Notificar a psi em `EXPIRADO` ou `CONGELADO_POR_LOOP`?** Só chip na agenda ou também notificação ativa? | **Só chip na agenda no MVP**. Notificação ativa pra esses dois casos vira follow-up se psi-piloto pedir. Razão: cancelamento é evento de ação alta; expiração/congelamento é "paciente esqueceu/atrapalhou" — chip + tooltip cobrem. |
| Q5 | **Texto exato de Msg 2 e Msg 3** | Esboços iniciais:<br>**Msg 2 (Confirmar)**: `"Você escolheu confirmar a consulta de {data} às {hora}. Está tudo certo?"` + `[Sim, confirmar]` `[Voltar]`<br>**Msg 2 (Cancelar)**: `"Você escolheu cancelar a consulta de {data} às {hora}. Tem certeza?"` + `[Sim, cancelar]` `[Voltar]`<br>**Msg 3 (despedida)**: `"Tudo bem! Se precisar de ajuda, fale direto com {psicologa}."`<br>Ajustar pós-teste com Bruno+psi-piloto. |
| Q6 | **Sincronia entre `configuracao.template_mensagem` (editável) e `lembrete_consulta_v1` (template Meta fixo)** | MVP: psi edita o `template_mensagem` mas o que vai pra Meta é sempre o template aprovado. Edição é "cosmética" pra dar sensação de controle. Trade-off declarado. Long-term: estudar Meta `MTM (multiple templates)` se psi quer múltiplos templates aprovados. |
| Q7 | **Webhook sem `context.id`** — fallback por telefone+48h cobre? | Sim no MVP — botões sempre incluem `context`. Risco residual: <1% dos eventos. Aceitável. Logar como warning. |

### 11.3 Trade-offs assumidos

| Trade-off | Decisão | Custo |
|---|---|---|
| **Número único da plataforma** vs número da psicóloga | Único | Paciente recebe de "Psi Organizer", não da Dra. Ana. Fricção real — psi-piloto vai notar. Justificável pra MVP (zero custo de onboarding, sem Embedded Signup, sem cifragem por tenant). |
| **`@Async` no webhook** vs processamento síncrono | Async | Risco de perder evento em crash entre `publish` e processamento. Mitigado por retry Meta + máquina de estados idempotente. |
| **Validação `template_mensagem` cosmética** | Aceito no MVP | Psi pode achar que edição "vai pra paciente" e ficar frustrada. UI deixa claro com tooltip: "Esse texto aparece como base do lembrete — pequenas variações respeitam o template aprovado pela Meta". |
| **Polling 60s pra notificação** vs WebSocket | Polling | Atraso 1min em cancelamento aceitável; sem WS no MVP. |
| **`shedlock` instalado na PR A sem uso** | Aceito | +1 dep e tabela, mas custo zero (não roda nada). Evita migration adicional na PR B. |
| **Sem dashboard de adoção** (% psi com opt-in ativo) | Aceito no MVP | Métrica simples pode entrar em PR D se psi-piloto pedir. |

### 11.4 Follow-ups registrados (não bloqueiam MVP)

- 🔜 **Modo "número próprio da psicóloga" via Embedded Signup** — PR dedicada quando ≥3 psi pedirem. Inclui cifragem AES-GCM por tenant.
- 🔜 **Reenvio automático em reagendamento** — segundo template `reagendamento_consulta_v1`, exige aprovação Meta. Disparado quando consulta com `lembrete_enviado` é editada em `inicio`.
- 🔜 **Múltiplos templates por psicóloga** (`lembrete_consulta_v2`, com tom diferente). Exige refactor pra associar `template_id` ao `lembrete_enviado`.
- 🔜 **Dashboard Grafana** — definir ambiente de infra antes.
- 🔜 **Webhook signature por psicóloga** quando entrar modo número-próprio.
- 🔜 **Notificação ativa em `EXPIRADO`/`CONGELADO_POR_LOOP`** se Q4 reverter.
- 🔜 **Lembrete N dias antes configurável** (1 → 2 dias, ou 2h antes). Atual: hardcoded 1 dia. Mudança = adicionar campo em `configuracao_whatsapp`.
- 🔜 **Hardening multi-tenant** (RLS Postgres / `@Filter` Hibernate) — já listado em [SPEC.md §11](../SPEC.md#11-próximos-passos), agora com mais 2 tabelas pra cobrir.

---

## Apêndice A — Códigos de erro Meta relevantes

| Código | Significado | Ação |
|---|---|---|
| `131047` | Re-engagement message (fora da service window) | Não esperado no fluxo MVP; logar. |
| `131026` | Receiver phone not registered on WhatsApp | Marcar `FALHOU`, notificar psi via chip ou histórico. |
| `131051` | Unsupported message type | Não esperado; logar. |
| `131049` | This message was not delivered to maintain healthy ecosystem engagement | Indicativo de spam-flag do número da plataforma — investigar urgência. |
| `131000` | Generic system error | Retry com backoff. |
| `131057` | Account violates WhatsApp Commerce Policy | Crítico — número pode ser banido. Investigar. |
| `132xxx` | Template-related (não aprovado, expired, etc.) | Validar status do template no Business Manager. |
| `190` | Token inválido/expirado | Regerar token, atualizar env var. |

Lista completa: [developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes).

---

## Apêndice B — Glossário

- **HSM / Template**: "Highly Structured Message" — formato de mensagem pré-aprovada pela Meta, com variáveis (`{{1}}`, `{{2}}`...). Único formato permitido para iniciar conversa fora da service window.
- **Service Window 24h**: período de 24h após a paciente responder, durante o qual texto livre + interactive são gratuitos.
- **WABA**: WhatsApp Business Account — entidade Meta que agrupa números business sob um Business Manager.
- **Phone Number ID** (`PHONE_NUMBER_ID`): identificador interno Meta de um número específico cadastrado na WABA.
- **System User**: usuário não-humano da Meta usado pra autenticação programática. Gera tokens de longa duração.
- **`wamid`**: prefixo dos IDs de mensagens WhatsApp (`wamid.HBgL...`). Usado pra `context.id` em respostas.
- **Embedded Signup**: fluxo Meta pra que terceiro cadastre número próprio sob WABA do cliente sem trocar de plataforma. Fora do escopo.

---

_Fim do spec — 2026-05-29. Revisões: [registrar aqui]._
