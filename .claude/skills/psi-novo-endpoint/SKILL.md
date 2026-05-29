---
name: psi-novo-endpoint
description: Cria um novo endpoint REST no psi-organizer seguindo TODAS as convenções (MVC strict, multi-tenant filter, @Operation pt-BR, ApiException, DTO só no Controller, cliente tipado no frontend, linha em docs/API.md). Use quando precisar adicionar `GET/POST/PUT/DELETE` em qualquer feature.
disable-model-invocation: true
argument-hint: <feature> <metodo> <path> "<summary>"
---

# psi_novo_endpoint

Objetivo: garantir que TODOS os passos do padrão sejam cobertos sem esquecer doc, multi-tenant filter ou validação.

## Argumentos

| Arg | Obrigatório? | Descrição |
|---|---|---|
| `feature` | sim | Pacote backend: `auth`, `consulta`, `dashboard`, `paciente`, `psicologa` ou novo nome |
| `metodo` | sim | `GET` \| `POST` \| `PUT` \| `DELETE` |
| `path` | sim | Path completo (ex: `/pacientes/{id}/notas`) |
| `summary` | sim | Texto pt-BR pra `@Operation(summary = ...)` |
| `request_schema` | só `POST`/`PUT` | Lista de campos com tipos e validações Jakarta |
| `response_schema` | recomendado | Lista de campos do response |

## Pré-requisitos

Antes de começar, ler:
- `docs/ARCHITECTURE.md` §2 (backend layers)
- `docs/BUSINESS_RULES.md` §2 (multi-tenancy)
- `backend/src/main/java/com/psiorganizer/<feature>/` — existe? Se não, criar pasta + dto/ dentro.

## Checklist — não pular nenhum

### Backend (Java)

1. **DTO Request** (se `POST`/`PUT`): criar `dto/<NomeRequest>.java` como `record` com validações Jakarta apropriadas. Sempre usar `@Cpf`, `@SenhaValida` quando aplicável (não inventar regex). Para endereço, **reusar `EnderecoDto`**.

2. **DTO Response**: criar `dto/<NomeResponse>.java` como `record`. Método estático `from(domainObj, [extras])` se houver mapeamento.

3. **Método no Service**: assinatura sempre recebe `UUID psicologaId` como **primeiro** parâmetro. Usa `@Transactional` (`readOnly = true` se GET). Erros via `ApiException.{naoEncontrado, conflito, requisicaoInvalida, naoAutorizado}`.

4. **Endpoint no Controller**:
   ```java
   @<Metodo>Mapping("<path-relativo>")
   @Operation(summary = "<pt-BR summary>")
   public <Response> nome(...) {
       UUID psicologaId = PsicologaPrincipal.corrente().id();
       // delega pro service passando psicologaId
   }
   ```

5. **Multi-tenant filter**: revisar que toda chamada de repository dentro do novo método do service usa um método com sufixo `AndPsicologaId` OU uma query JPQL com `where ... psicologaId = :psicologaId`.

6. **`@Tag` no Controller**: se a feature é nova, adicionar `@Tag(name, description)` no Controller.

### Frontend (TS)

7. **Cliente tipado**: em `frontend/src/api/<feature>.ts`:
   - Tipo do request (se aplicável) — espelho do DTO backend
   - Tipo do response
   - Método em `<feature>Api.<nome>` usando `api<T>(path, init)` do `client.ts`

   Padrão:
   ```ts
   export const <feature>Api = {
     ...
     <nome>: (args) => api<Response>(`/path`, { method: 'X', body: JSON.stringify(req) }),
   }
   ```

### Docs

8. **`docs/API.md`**: adicionar linha na tabela do contexto correspondente (Auth, Perfil, Pacientes, Consultas, Dashboard, ou seção nova):
   ```
   | `<METODO>` | `<path>` | `<summary>` | <códigos relevantes> |
   ```

9. **`docs/BUSINESS_RULES.md`**: SE o endpoint introduz nova regra de negócio (validação, conflito, fluxo de estado), adicionar entrada na seção apropriada. SE não, pular.

### Validação final

10. `mvn -B compile` deve passar (no diretório `backend/`).
11. `cd frontend && npm run build` deve passar (typecheck + bundle).
12. Reportar checklist final ao user.

## Diretrizes de estilo

- **`@Operation(summary = ...)`** em **pt-BR** sempre. Pode ter `description` multi-linha se precisar explicar comportamento não-óbvio.
- **Códigos HTTP padrão**:
  - `201 Created` em criação (use `ResponseEntity.status(HttpStatus.CREATED).body(...)`)
  - `204 No Content` em delete (use `ResponseEntity.noContent().build()`)
  - `200 OK` retorno padrão de Spring
- **Validação de params**: clampar limites (ex: `Math.max(1, Math.min(50, limit))` para paginação), não confiar em `@Min`/`@Max` em `@RequestParam`.
- **Listar paginado**: usar wrapper `<Algo>PaginadoResponse { itens, total, temMais }` (ver `ConsultasPaginadoResponse` como modelo).
- **Não criar** test files nesta skill — projeto ainda não tem testes (decisão registrada em SPEC §1).
- **Não rodar** lint — `mvn verify` e `npm run lint` ficam pra antes da PR.

## Restrições

- **NÃO** criar endpoint sem `psicologaId` no service (mesmo que pareça público — auth filtra antes).
- **NÃO** retornar entity diretamente — sempre via DTO Response.
- **NÃO** colocar lógica de negócio no Controller — apenas mapeamento e delegação.
- **NÃO** usar `@RequestParam` sem `defaultValue` quando o param é opcional.
- **NÃO** atualizar `docs/SPEC.md` §11 ou histórico — isso é trabalho de `psi_docs_sync` depois do merge.
