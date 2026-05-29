---
name: psi-estado
description: Carrega contexto rápido do psi-organizer no início de uma sessão. Lê branch atual, PRs abertas, últimos commits e próximos itens pendentes do SPEC.md §11. Retorna resumo conciso (~200 palavras). Invoque com `/psi-estado` sempre que abrir uma sessão nova ou voltar depois de uma pausa longa.
disable-model-invocation: true
---

# psi_estado

Objetivo: dar contexto suficiente em ~200 palavras pra retomar trabalho no psi-organizer **sem reler o repo inteiro**.

## Argumentos

| Arg | Valores | Default |
|---|---|---|
| `detalhe` | `basico` \| `completo` | `basico` |

- `basico` (default): só essencial — branch, PRs abertas, último commit, próximo pendente
- `completo`: inclui breakdown por área (backend/frontend/docs) e referências a docs que podem precisar consulta

## O que fazer

1. **Estado git** — executar e parsear:
   - `git branch --show-current` → branch atual
   - `git status --short` → arquivos sujos (se houver)
   - `git log main..HEAD --oneline` → commits ainda não em main (se branch ≠ main)
   - `git log --oneline -5` → últimos 5 commits da branch atual

2. **PRs abertas** — `gh pr list` (parse: número, título, branch, status).
   - Para cada uma, anotar se é `MERGEABLE` ou tem `CONFLICTING`.

3. **Próximo item** — abrir `docs/SPEC.md` §11 e identificar:
   - O primeiro item `[ ]` (pendente) da seção "Pendente / próximas frentes"
   - OU, se §11 está toda concluída, abrir `docs/design/README.md` "Prioridades pendentes"

4. **Sintetizar** — markdown estruturado, ~200 palavras (basico) ou ~400 (completo):

```markdown
## Estado atual — <data>

**Branch:** `<nome>` · <N> commits ainda não em main

**PRs abertas:**
- #<n> <título> (base: <base>) — <status>

**Últimos commits:**
- `<hash>` <título>
- ...

**Próximo pendente:** <descrição>

**Sujo no working tree:** <lista ou "limpo">
```

5. Se `detalhe=completo`, adicionar:
   - Endpoints recentes em `docs/API.md` (últimas 3 linhas modificadas)
   - Pendências do audit de design (`docs/design/README.md`)
   - Decisões pendentes em `docs/SPEC.md` §10

## Restrições

- **Não** abrir TODOS os arquivos do projeto. Só os listados acima.
- **Não** especular sobre próximos passos — só reportar o que está documentado.
- Se algo está confuso (ex: 2 PRs com mesma branch base), reportar como observação no rodapé, não tentar resolver.
- Saída em pt-BR.
- Se `git` ou `gh` não estão disponíveis, reportar e seguir só com o que conseguir ler de arquivos.
