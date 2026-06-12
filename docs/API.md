# API — psi-organizer

Sumário humano de todos os endpoints REST. Documentação interativa (Swagger UI) em **http://localhost:8080/swagger-ui.html** quando o backend está rodando.

> Modelo de dados e DTOs: **[SPEC.md §5](SPEC.md#5-modelo-de-domínio)** · Regras de negócio: **[BUSINESS_RULES.md](BUSINESS_RULES.md)** · Arquitetura: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## Autenticação

Todos os endpoints exceto `POST /auth/signup` e `POST /auth/login` exigem JWT no header:

```
Authorization: Bearer <token>
```

O token é retornado pelo signup e pelo login. Default 24h de validade (configurável via `psi.jwt.expiracao-horas`). Algoritmo HS256.

Sem token (ou token inválido/expirado) → `401 Unauthorized`.

---

## Formato de erro

Toda resposta de erro segue o mesmo envelope:

```json
{
  "erro": "Mensagem em pt-BR",
  "detalhes": { "campoComProblema": "motivo" }
}
```

`detalhes` aparece em erros de validação por campo (`400`). Em outros casos é omitido.

---

## Endpoints por contexto

### Auth · `/auth/**` (público)

| Método | Path | Sumário | Códigos relevantes |
|---|---|---|---|
| `POST` | `/auth/signup` | Cria conta de psicóloga e retorna JWT | `201` · `400` validação · `409` e-mail ou CPF já cadastrado |
| `POST` | `/auth/login` | Autentica e retorna JWT. Conta **bloqueada** → `401` com mensagem específica. | `200` · `401` credenciais inválidas ou conta bloqueada |

### Perfil · `/me`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/me` | Retorna dados da psicóloga autenticada (inclui flag `admin`) | `200` · `401` |
| `PUT` | `/me` | Atualiza nome, CRP, telefone, endereço. **E-mail e CPF não são editáveis.** | `200` · `400` validação · `401` |
| `PUT` | `/me/senha` | Altera a senha (exige `senhaAtual` + `novaSenha` com `@SenhaValida`) | `204` · `400` senha atual incorreta ou nova inválida · `401` |

### Admin · `/admin/**` (exclusivo de administradores)

Gestão de contas do SaaS. Toda chamada revalida a flag `admin` **no banco** (não só no claim do token); não-admin → `403`. Expõe apenas dados cadastrais e contratuais — **nunca dados clínicos** (pacientes/consultas).

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/admin/psicologas?busca=&limit=20&offset=0` | Lista paginada com contrato ativo e pendências (busca por nome/e-mail). Envelope: `{ psicologas, total, temMais }`. | `200` · `401` · `403` |
| `PUT` | `/admin/psicologas/{id}/bloqueio` | Bloqueia/desbloqueia acesso (`{ bloqueada: bool }`). Vale a partir do **próximo login**. Não permite bloquear a si mesmo nem outra conta admin. | `204` · `400` · `403` · `404` |
| `GET` | `/admin/psicologas/{id}/contratos` | Histórico de contratos (mais recentes primeiro) | `200` · `403` |
| `POST` | `/admin/psicologas/{id}/contratos` | Cria contrato (`dataInicio`, `dataFim?`, `valorMensal`); o ativo anterior é desativado | `201` · `400` · `403` · `404` |
| `PUT` | `/admin/contratos/{id}/encerrar` | Encerra contrato — para de gerar novas mensalidades | `200` · `403` · `404` |
| `GET` | `/admin/psicologas/{id}/mensalidades` | Histórico de mensalidades. Competências vencidas são **materializadas automaticamente** a partir do contrato ativo. | `200` · `403` |
| `PUT` | `/admin/mensalidades/{id}/baixa` | Dá baixa ou estorna (`{ paga: bool }`) | `200` · `403` · `404` |

### Pacientes · `/pacientes/**`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/pacientes?incluirInativos=false` | Lista pacientes (ativos por padrão). Use `?incluirInativos=true` para incluir inativos. | `200` · `401` |
| `GET` | `/pacientes/{id}` | Busca um paciente por id | `200` · `404` |
| `POST` | `/pacientes` | Cria um novo paciente | `201` · `400` validação · `409` CPF já cadastrado pra essa psicóloga |
| `PUT` | `/pacientes/{id}` | Atualiza dados de um paciente | `200` · `400` · `404` · `409` |
| `DELETE` | `/pacientes/{id}` | Inativa (soft delete) e **hard-deleta consultas futuras AGENDADA/CONFIRMADA** | `204` · `404` |
| `POST` | `/pacientes/{id}/reativar` | Reativa um paciente previamente inativado. Não traz consultas canceladas de volta. | `200` · `404` |
| `GET` | `/pacientes/{id}/consultas?tipo=proximas|historico&limit=5&offset=0` | Lista paginada de consultas do paciente. Envelope: `{ consultas, total, temMais }`. `tipo` default `historico`; `limit` ∈ [1, 50]; `offset` ≥ 0. | `200` · `404` |

### Consultas · `/consultas/**`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/consultas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Lista consultas no intervalo (datas inclusivas, fuso `America/Sao_Paulo`) | `200` · `401` |
| `GET` | `/consultas/a-revisar?limit=20&offset=0` | Lista paginada de consultas **passadas sem desfecho** (ainda `AGENDADA/CONFIRMADA`), mais antigas primeiro. Envelope: `{ consultas, total, temMais }`. `limit` ∈ [1, 50]. | `200` · `401` |
| `GET` | `/consultas/{id}` | Busca uma consulta por id | `200` · `404` |
| `POST` | `/consultas` | Cria uma consulta avulsa | `201` · `400` · `404` paciente · `409` conflito de horário |
| `POST` | `/consultas/recorrente` | Cria N consultas semanalmente entre `inicioEm` e `fimEm` (**transacional** — se qualquer ocorrência conflita, **nenhuma** é criada). Aceita `intervaloSemanas`. | `201` · `400` validação · `404` paciente · `409` conflito |
| `PUT` | `/consultas/{id}` | Atualiza dados, status e pago | `200` · `400` · `404` · `409` |
| `DELETE` | `/consultas/{id}` | Remove a consulta | `204` · `404` |

### Dashboard · `/dashboard`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/dashboard` | Retorna métricas de hoje, mês corrente, comparativo, próximos 7 dias, pacientes, consultas futuras agendadas e próximas consultas. Calcula tudo numa janela única do mês anterior até daqui a 7 dias. | `200` · `401` |

### Financeiro · `/financeiro/**`

Visão financeira por **regime de competência** — o recorte é sempre pelo mês/ano da consulta (`inicio`), não pela data do pagamento. `periodo` aceita `YYYY-MM` (mês) ou `YYYY` (ano inteiro); formato inválido → `400`.

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/financeiro/resumo?periodo=2026-06` | Totais (quantidade + soma) de pendentes, realizados, futuros e pendências **anteriores** ao período, mais `anosDisponiveis` pro filtro anual. | `200` · `400` período inválido · `401` |
| `GET` | `/financeiro/pendentes?periodo=2026-06&anteriores=false&limit=10&offset=0` | Pagamentos pendentes **agrupados por paciente** (ordenados por total devido desc), paginado **por paciente**. `anteriores=true` lista o acumulado anterior ao início do período. Envelope: `{ grupos, totalGrupos, temMais }`. `limit` ∈ [1, 50]. | `200` · `400` · `401` |
| `GET` | `/financeiro/consultas?periodo=2026-06&categoria=realizados&limit=20&offset=0` | Lista cronológica paginada. `categoria` ∈ `realizados` (pagos, mais recentes primeiro) \| `futuros` (agendadas/confirmadas, ascendente). Envelope: `{ consultas, total, temMais }`. `limit` ∈ [1, 50]. | `200` · `400` categoria/período inválido · `401` |

### WhatsApp · `/me/whatsapp/**`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/me/whatsapp` | Configuração de lembretes (cria com defaults na 1ª chamada). `templateMensagem` é **read-only**: prévia do template aprovado na Meta, placeholders `{{1}}`..`{{4}}`. | `200` · `401` |
| `PUT` | `/me/whatsapp` | Atualiza `ativo` e `horarioEnvioLembrete` (hora cheia 07:00–20:00). O template **não é editável** — é registrado e aprovado na plataforma da Meta. | `200` · `400` · `401` |
| `POST` | `/me/whatsapp/teste` | Dispara o template `hello_world` da Meta pro telefone informado (smoke test do canal) | `202` · `400` |
| `GET` | `/me/whatsapp/lembretes` | Histórico paginado de lembretes pra auditoria. Filtros opcionais: `consultaId`, `etapa`, `statusEntrega`, `inicioEm`, `fimEm`; `limit` ∈ [1, 200]. | `200` · `401` |

### Interno (fora da API pública, oculto do Swagger)

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `POST` | `/internal/whatsapp/tick` | Gatilho do scheduler de lembretes pra Cloud Run (Cloud Scheduler chama de hora em hora). Auth por header `X-Tick-Token` (constant-time); token não configurado = sempre `401`. | `204` · `401` |

---

## Códigos HTTP por convenção

| Código | Quando |
|---|---|
| `200 OK` | Sucesso em `GET`, `PUT`, `POST` que retornam corpo |
| `201 Created` | Criação bem-sucedida (`POST /auth/signup`, `POST /pacientes`, `POST /consultas`, `POST /consultas/recorrente`) |
| `204 No Content` | Sucesso sem corpo (`DELETE /pacientes/{id}`, `DELETE /consultas/{id}`) |
| `400 Bad Request` | Erro de validação (Jakarta Validation) ou regra de negócio fundamental quebrada |
| `401 Unauthorized` | Sem JWT, JWT inválido/expirado, credenciais inválidas no login |
| `404 Not Found` | Recurso não existe ou não pertence à psicóloga autenticada |
| `409 Conflict` | Estado conflita (duplicidade, conflito de horário, etc.) |
| `500 Internal Server Error` | Erro inesperado — `GlobalExceptionHandler` retorna mensagem genérica |

---

## Convenções de payload

### Tipos primitivos

| Tipo | Formato JSON |
|---|---|
| UUID | string (`"f47ac10b-58cc-4372-a567-0e02b2c3d479"`) |
| Timestamp absoluto | ISO 8601 com offset (`"2026-05-29T14:00:00-03:00"`) |
| Data (sem hora) | ISO 8601 simples (`"2026-05-29"`) |
| Hora (sem data) | `"HH:mm"` (`"14:30"`) — usado em `ConsultaRecorrenteRequest.horario` |
| Decimal | número JSON com duas casas (`180.00`) |
| CPF | string só com dígitos (`"39053344705"`) — backend normaliza |
| CEP | string só com dígitos (`"01310100"`) — backend normaliza |

### Endereço (`EnderecoDto`)

```json
{
  "cep": "01310100",
  "logradouro": "Av. Paulista",
  "numero": "1000",
  "complemento": "10º andar",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "uf": "SP"
}
```

Embarcado dentro de `Psicologa`, `Paciente` e `AtualizarPerfilRequest`. Mesmo formato em todos.

### Status de consulta

Enum no payload:

```
"AGENDADA" | "CONFIRMADA" | "REALIZADA" | "FALTA"
```

Em `GET /consultas`, o response inclui `pacienteNome` resolvido server-side — frontend não precisa fazer N+1.

---

## Exemplos rápidos

### Login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@psi.com","senha":"senha123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "psicologa": { "id": "...", "nomeCompleto": "Dra. Ana Silva", ... }
}
```

### Listar consultas da semana atual

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@psi.com","senha":"senha123"}' | jq -r .token)

curl http://localhost:8080/consultas?inicio=2026-05-25&fim=2026-05-31 \
  -H "Authorization: Bearer $TOKEN"
```

### Histórico paginado do paciente

```bash
curl "http://localhost:8080/pacientes/{id}/consultas?tipo=historico&limit=5&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

Para a próxima página: `&offset=5`. Continue até `temMais: false`.

---

## Documentação ao vivo

- **Swagger UI**: http://localhost:8080/swagger-ui.html — explora, testa endpoints diretamente, mostra schemas dos DTOs.
- **Spec OpenAPI 3.0**: http://localhost:8080/v3/api-docs — JSON cru.

Todos os endpoints têm `@Operation(summary = ...)` em pt-BR. Adicionar novo endpoint sem anotação **deve** ser caught em code review.
