---
name: psi_docs_sync
description: Identifica quais documentos do psi-organizer precisam de atualização após uma PR mergeada (SPEC §11 checklist, API.md, BUSINESS_RULES.md, design/README.md histórico, ARCHITECTURE.md se aplicável). Propõe diffs e pergunta arquivo por arquivo. Use sempre depois de mergear uma feature visível.
---

# psi_docs_sync

Objetivo: evitar doc drift — todo merge sem update de doc é dívida acumulada (PRs #5–#12 desta sessão são prova).

## Argumentos

| Arg | Obrigatório? | Descrição |
|---|---|---|
| `pr_numero` | sim | Número da PR já mergeada cuja documentação queremos sincronizar |

## Fluxo

### Etapa 1 — Levantar o que a PR mudou

1. `gh pr view <pr_numero> --json title,body,mergedAt,headRefName`
2. `gh pr diff <pr_numero> --name-only` → lista de arquivos
3. Categorizar mudanças por área:
   - `backend/.../controller/...Controller.java` → endpoint novo ou alterado
   - `backend/.../service/...Service.java` → regra de negócio nova
   - `backend/.../validation/` ou `dto/` → validação nova
   - `backend/.../config/SecurityConfig.java` → mudança de auth
   - `frontend/src/theme/`, `components/AppShell`, `components/AuthShell` → design system
   - `frontend/src/dashboard/widgets.tsx` → widget novo
   - `frontend/src/pages/` → tela nova ou refatorada
   - `docker-compose.yml`, `pom.xml`, `package.json` → infra/deps

### Etapa 2 — Checar cada doc

Para cada doc abaixo, decidir se há gap. Se sim, **propor um diff específico** (não vago).

#### `docs/SPEC.md` §11

- Sempre verificar: existe uma entrada `- [x]` correspondente a essa PR?
- Se a PR fechou um pendente de "Pendente / próximas frentes", marcar como `[x]` com data e 1 linha.
- Se entregou algo novo não previsto, adicionar entrada em "Janela de impacto visual + dashboard (entregue ...)".

#### `docs/API.md`

- Houve mudança em algum Controller? → confirmar que a tabela do contexto correspondente tem a linha. Se faltou, adicionar.
- Houve mudança de comportamento (mesmo path, mas summary/codes mudaram)? → atualizar.

#### `docs/BUSINESS_RULES.md`

- Houve novo `throw ApiException` em service? → entrada na seção apropriada (Identidade, Status, Conflito, Soft delete, etc).
- Houve nova validação declarativa (`@Cpf`, `@Pattern`, `@Min`/`@Max`)? → entrada em §3.
- Houve nova regra "silenciosa" (ex: clamp de limit, ordem de listagem)? → entrada na seção apropriada.

#### `docs/design/README.md`

- Houve mudança em `frontend/src/theme/`, `AppShell`, `AuthShell`, ou reskin visível de página? → adicionar linha na tabela "Histórico" com data + descrição + PR.

#### `docs/ARCHITECTURE.md`

- Houve mudança estrutural (camada nova, padrão novo, persistência diferente)? → revisar seção apropriada. **Raramente precisa update** — usar bom senso.

#### `CLAUDE.md`

- Houve adição de comando essencial ou mudança de stack? → revisar §"Comandos essenciais" ou §"Stack".
- Houve mudança de credenciais de seed? → revisar §"Credenciais de seed".

### Etapa 3 — Apresentar diffs

Para cada doc com gap identificado, mostrar:

```markdown
### `docs/<arquivo>.md` — proposta de update

<descrição do gap em 1 frase>

```diff
- linha antiga (se houver)
+ linha nova
```
```

### Etapa 4 — Aplicar com aprovação

Perguntar ao user: **arquivo por arquivo**, qual aplica.

Opções: `aplicar todos` / `aplicar [lista]` / `pular [lista]` / `editar manualmente`.

Aplicar os aprovados via Edit/Write. Não commit — apenas modifica.

### Etapa 5 — Resumo

```markdown
✅ Docs atualizados:
- `docs/SPEC.md` (§11)
- `docs/API.md` (Pacientes)

⏭ Pulados:
- `docs/BUSINESS_RULES.md` (sem regra nova)

➡ Próximo passo: revisar diffs, commitar e abrir PR de docs SE for grande, ou commitar junto da próxima feature se for pequeno.
```

## Diretrizes

- **Propor diffs específicos**, não vagos. "Adicione algo em §3" é ruim. "Adicione linha `| 'GET' | '/foo' | 'descrição' | 200 |` na tabela Pacientes" é bom.
- **Não duplicar** entre arquivos — se uma regra já está em BUSINESS_RULES.md, em SPEC §11 basta linkar.
- **Não apagar** entradas antigas (histórico). Sempre apêndice ou marca-checkbox.
- **Não inventar** mudanças que não foram feitas pra "ficar completo". Honestidade vence completude.
- Se a PR é puramente refactor sem efeito visível, reportar `Nenhum doc precisa de update` e encerrar.

## Restrições

- Não rodar comando que mude estado git (commit/push) — só modifica arquivos em disco. User decide quando commitar.
- Não atualizar arquivos fora de `docs/` e `CLAUDE.md`. Outros docs (README de subpastas, README.md do root se houver) ficam fora do escopo.
