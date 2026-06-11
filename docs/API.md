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
| `POST` | `/auth/login` | Autentica e retorna JWT | `200` · `401` credenciais inválidas |

### Perfil · `/me`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/me` | Retorna dados da psicóloga autenticada | `200` · `401` |
| `PUT` | `/me` | Atualiza nome, CRP, telefone, endereço. **E-mail e CPF não são editáveis.** | `200` · `400` validação · `401` |

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
| `GET` | `/consultas/{id}` | Busca uma consulta por id | `200` · `404` |
| `POST` | `/consultas` | Cria uma consulta avulsa | `201` · `400` · `404` paciente · `409` conflito de horário |
| `POST` | `/consultas/recorrente` | Cria N consultas semanalmente entre `inicioEm` e `fimEm` (**transacional** — se qualquer ocorrência conflita, **nenhuma** é criada). Aceita `intervaloSemanas`. | `201` · `400` validação · `404` paciente · `409` conflito |
| `PUT` | `/consultas/{id}` | Atualiza dados, status e pago | `200` · `400` · `404` · `409` |
| `DELETE` | `/consultas/{id}` | Remove a consulta | `204` · `404` |

### Dashboard · `/dashboard`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/dashboard` | Retorna métricas de hoje, mês corrente, comparativo, próximos 7 dias, pacientes, consultas futuras agendadas e próximas consultas. Calcula tudo numa janela única do mês anterior até daqui a 7 dias. | `200` · `401` |

### WhatsApp · `/me/whatsapp/**`

| Método | Path | Sumário | Códigos |
|---|---|---|---|
| `GET` | `/me/whatsapp` | Configuração de lembretes (cria com defaults na 1ª chamada). `templateMensagem` é **read-only**: prévia do template aprovado na Meta, placeholders `{{1}}`..`{{4}}`. | `200` · `401` |
| `PUT` | `/me/whatsapp` | Atualiza `ativo` e `horarioEnvioLembrete` (hora cheia 07:00–20:00). O template **não é editável** — é registrado e aprovado na plataforma da Meta. | `200` · `400` · `401` |
| `POST` | `/me/whatsapp/teste` | Dispara o template `hello_world` da Meta pro telefone informado (smoke test do canal) | `202` · `400` |
| `GET` | `/me/whatsapp/lembretes` | Histórico paginado de lembretes pra auditoria. Filtros opcionais: `consultaId`, `etapa`, `statusEntrega`, `inicioEm`, `fimEm`; `limit` ∈ [1, 200]. | `200` · `401` |

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
