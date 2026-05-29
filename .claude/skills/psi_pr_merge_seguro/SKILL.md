---
name: psi_pr_merge_seguro
description: Mergea uma PR do psi-organizer seguindo o protocolo correto (multi-tenant check, dança de PRs empilhadas, squash+delete, rebase de stack, force-push-with-lease). Use sempre que precisar mergear uma PR — não use `gh pr merge` direto.
---

# psi_pr_merge_seguro

Objetivo: executar o ciclo completo de merge sem perder PRs empilhadas pelo caminho e sem deixar passar vazamento multi-tenant.

## Argumentos

| Arg | Obrigatório? | Descrição |
|---|---|---|
| `pr_numero` | sim | PR a mergear (ex: `12`) |
| `proxima_pr` | não | PR empilhada a rebasear depois. Se omitido, **detectar automaticamente** PRs abertas cujo `baseRefName` é a branch da PR sendo mergeada |

## Fluxo de execução

### Etapa 1 — Validação prévia

1. `gh pr view <pr_numero> --json state,mergeable,headRefName,baseRefName,title` — confirma:
   - `state == "OPEN"` (senão, abortar e reportar)
   - `mergeable in ("MERGEABLE","UNKNOWN")` (se `CONFLICTING`, abortar)
2. Salvar `headRefName` (branch da PR) — será usada na detecção de stack.

### Etapa 2 — Multi-tenant check (gate de segurança)

Pega o diff backend da PR: `gh pr diff <pr_numero> -- 'backend/**/*.java'`.

Procurar **violações potenciais** — chamadas a métodos do repositório que **não** sejam multi-tenant-aware:

**Padrões suspeitos** (regex sobre código adicionado):
- `repository\.findById\(` sem ser seguido de `.filter(p -> p.getPsicologaId().equals(...))` no mesmo bloco
- `repository\.findAll\(` (qualquer uso)
- `repository\.save\(` ou `saveAll\(` em service cujo método não recebe `psicologaId` como parâmetro
- `repository\.delete\(` ou `deleteAll\(` em contexto sem filtro de psicologa
- `repository\.count\(\)` (sem `ByPsicologaId`)

**Considerar OK** se:
- O método do repositório tem `AndPsicologaId` no nome (`findByIdAndPsicologaId`, `findByPsicologaIdAnd...`)
- A query JPQL anotada com `@Query` tem `where c.psicologaId = :psicologaId`
- A chamada está dentro de `validarPaciente` ou similar que já fez ownership-check antes

Output:
- Se zero violações: `✅ Multi-tenant: nenhum risco aparente`
- Se houver: lista cada chamada (arquivo:linha + trecho), pergunta ao user se aprova ou aborta

### Etapa 3 — Detecção de PRs empilhadas

Se `proxima_pr` não foi fornecida, rodar:
```bash
gh pr list --json number,baseRefName,headRefName --jq '.[] | select(.baseRefName == "<headRefName>")'
```

Para cada match, registrar como "empilhada". Se existem múltiplas, perguntar ao user qual rebasear (raramente).

### Etapa 4 — Dança preventiva (se há PR empilhada)

Para **cada** PR empilhada detectada:
```bash
gh pr edit <numero_empilhada> --base main
```

Reportar: `🔁 Base da PR #<n> mudada de '<branch>' para 'main' (previne fechamento automático).`

### Etapa 5 — Merge

```bash
gh pr merge <pr_numero> --squash --delete-branch
```

Validar: `gh pr view <pr_numero> --json state,mergedAt` → confirma `MERGED`.

### Etapa 6 — Sync main local

```bash
git checkout main
git pull --ff-only
git log --oneline -3  # confirma o squash entrou
```

### Etapa 7 — Rebase de stack (se houver PR empilhada)

Para cada PR empilhada:

1. `git checkout <branch_empilhada>` (de `headRefName` da próxima PR)
2. `git rebase main`
   - Se rebase detecta "skipped previously applied commit" → ok, esperado (commits da PR base agora estão em main)
   - Se conflito → abortar, reportar ao user (`git rebase --abort`)
3. `git push --force-with-lease`
   - **Pedir aprovação explícita** ao user antes deste comando se ele ainda não autorizou nesta sessão. Force-push pode ser bloqueado pelo classificador.
4. Verificar `gh pr view <numero_empilhada> --json mergeable` — esperar até `MERGEABLE` ou `CONFLICTING`

### Etapa 8 — Resumo final

```markdown
✅ PR #<n> mergeada (squash, branch deletada)
✅ Main atualizada localmente
[se houver stack]
✅ PR #<n+1> rebaseada em main e force-pushed
```

## Quando ABORTAR

- `state != OPEN` na Etapa 1
- `mergeable == CONFLICTING` na Etapa 1
- User recusa após Etapa 2 reportar violações multi-tenant
- Rebase com conflito real na Etapa 7 → aborta, reporta, deixa branch no estado original

## Restrições

- Nunca rodar `git push --force` (sem `--with-lease`). Force-push **sempre** com `--with-lease`.
- Nunca mergear via `--merge` ou `--rebase` (PR squash é o padrão do projeto).
- Não deletar branch local após merge (pode haver work em progresso — `git branch -D` é decisão do user).
