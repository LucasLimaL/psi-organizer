# Development — psi-organizer

Setup local, comandos do dia-a-dia, padrão de PR e convenções de commit.

> Orientação rápida: **[CLAUDE.md](../CLAUDE.md)** · Arquitetura: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 1. Pré-requisitos

| Ferramenta | Versão | Como obter |
|---|---|---|
| Java | **21** ou superior | Adoptium / Oracle JDK |
| Maven | 3.9+ | manual ou via Maven Wrapper |
| Node.js | **20.19+** ou **22.12+** (LTS) | `winget install OpenJS.NodeJS.LTS` no Windows; `nvm` em macOS/Linux |
| Docker Desktop | qualquer recente | docker.com |
| `git` + `gh` (CLI) | qualquer recente | github.com |

---

## 2. Rodando localmente (3 processos)

### Postgres (Docker Compose)

```bash
docker compose up -d
```

Sobe o container `psi-organizer-db` na porta `5432`. Volume nomeado `psi-organizer_psi_pgdata` persiste os dados entre reinícios. Para zerar tudo:

```bash
docker compose down -v
```

### Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

- Porta `8080`.
- Flyway aplica migrations no startup (`backend/src/main/resources/db/migration/`).
- Em profile `!prod` (default), `SeedDataRunner` popula o banco se estiver vazio.
- Swagger UI: http://localhost:8080/swagger-ui.html

Para rodar **sem o seed** (simula produção):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### Frontend (Vite dev server)

```bash
cd frontend
npm install   # primeira vez
npm run dev
```

- Porta `5173`. Hot Module Replacement ligado.
- O cliente HTTP usa `VITE_API_BASE_URL` (default `http://localhost:8080`).

### Credenciais de seed

Quando o banco está vazio em profile `!prod`:

- **Login**: `ana@psi.com` / `senha123`
- 3 pacientes (Maria, João, Carla) com CPFs válidos
- 6 consultas distribuídas (passadas REALIZADA/FALTA, hoje CONFIRMADA, futuras AGENDADA)

CPFs usados (todos com dígito verificador válido): `11144477735`, `39053344705`, `52998224725`, `12345678909`.

---

## 3. Comandos do dia-a-dia

### Backend

```bash
mvn compile                  # compila (rápido, sem testes)
mvn verify                   # compila + lint (spotless:check)
mvn spotless:apply           # aplica formatação automática
mvn spring-boot:run          # roda em dev
```

### Frontend

```bash
npm run dev                  # dev server com HMR
npm run build                # build de produção (tsc + vite build)
npm run lint                 # ESLint
npm run preview              # serve a build de produção localmente
```

Antes de abrir PR, garanta:
- Backend: `mvn verify` verde.
- Frontend: `npm run build` + `npm run lint` verdes.

---

## 4. Editar o schema do banco

Migrations vão em `backend/src/main/resources/db/migration/` com nome `V<N>__descricao.sql` (versionamento Flyway).

1. Crie `V2__minha_mudanca.sql` (ou número subsequente).
2. Atualize as entidades JPA correspondentes (Hibernate roda em modo `validate` — vai falhar no startup se schema e entities divergirem).
3. **Não** edite migrations já aplicadas (mesmo localmente — Flyway detecta hash divergente). Sempre adicione uma migration nova.
4. Para zerar e re-aplicar tudo do zero em dev: `docker compose down -v && docker compose up -d`.

---

## 5. Padrão de PR

### Branches

| Tipo | Prefixo | Exemplo |
|---|---|---|
| Feature | `feat/` | `feat/dashboard`, `feat/agenda-mobile` |
| Fix | `fix/` | `fix/conflito-horario-recorrencia` |
| Refactor | `refactor/` | `refactor/extrair-endereco-form` |
| Docs | `docs/` | `docs/atualizacao-completa` |

Sempre branch a partir de `main` atualizada. Se a PR depender de outra ainda aberta, branch a partir da feature dependente; quando a base mergea, **rebase em main** e force-push (`--force-with-lease`).

### Merge

- **Squash + delete branch** em todas as PRs (via `gh pr merge <N> --squash --delete-branch`).
- Mensagem de squash usa o título do commit principal.

### Quando PR fecha automaticamente

Se uma PR aberta tem como base outra branch que foi deletada no merge (squash + delete branch), GitHub fecha a PR sozinho. Recriar uma nova PR a partir da mesma feature branch (não dá pra reabrir com base deletada).

**Como evitar**: antes de mergear a base, mude a base da PR empilhada para `main` (`gh pr edit <N> --base main`). Aí ela sobrevive.

### Após o merge

Sincronize main local:

```bash
git checkout main
git pull --ff-only
git branch -d feat/<branch-que-foi-mergeada>
```

---

## 6. Convenção de commits

Inspirado em Conventional Commits, em pt-BR:

```
<tipo>(<escopo>): <título imperativo curto>

<corpo opcional, parágrafos>

Co-Authored-By: ... (quando aplicável)
```

Tipos usados:

| Tipo | Quando |
|---|---|
| `feat` | Nova funcionalidade visível |
| `fix` | Correção de bug |
| `refactor` | Mudança interna sem alterar comportamento externo |
| `docs` | Apenas docs |
| `style` | Formatação, sem mudança de lógica |
| `test` | Adiciona/ajusta testes |
| `chore` | Tarefas auxiliares (build, deps) |

Escopos comuns: `auth`, `agenda`, `pacientes`, `paciente`, `perfil`, `dashboard`, `theme`, `design`, `endereco`.

Exemplo:

```
feat(dashboard): widget de consultas futuras agendadas

Adiciona contagem de consultas com status AGENDADA ou CONFIRMADA
com inicio > now no DashboardResponse. Frontend mostra como widget
opcional, default ativo.
```

---

## 7. Lint e formatação

### Backend

- **Spotless 2.43** rodando na fase `verify`.
- Regras: `removeUnusedImports`, `importOrder` (java, javax, jakarta, org, com), `trimTrailingWhitespace`, `endWithNewline`, indent 4 espaços.
- Sem auto-formatter pesado por incompatibilidade do Palantir/Google Java Format com o JDK do ambiente local.
- Comandos: `mvn spotless:apply` corrige · `mvn spotless:check` valida (executado em `verify`).

### Frontend

- **ESLint 9** + plugins `react-hooks` e `react-refresh`.
- `npm run lint` — falha em qualquer erro/warning.
- **TypeScript strict** (do template Vite). `npm run build` faz typecheck antes do bundling.

---

## 8. Troubleshooting comum

### Backend não sobe — `Schema-validation: wrong column type`

Hibernate em `validate` reclama de divergência entre entity e schema. Verifique se a última migration cobre seus campos novos, e se os tipos batem (ex: `VARCHAR(2)` vs `CHAR(2)`).

### Frontend mostra 401 mesmo após login

JWT no localStorage expirou (24h). Faça logout (`Sair` no AppShell) e login de novo.

### `mvn spring-boot:run` falha com "port 8080 in use"

Backend já está rodando em outra janela ou em background. Encerre antes de iniciar de novo:

```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8080 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### CEP autofill não funciona

ViaCEP é gratuito mas não tem SLA. Testando offline ou se a API estiver fora, os campos derivados ficam editáveis manualmente (o hook é tolerante a falha).

### Vite dev server roda mas API falha

Verifique se o backend está em `localhost:8080` e se a env var `VITE_API_BASE_URL` (se setada) aponta pra ele. Default do `api/client.ts` é `http://localhost:8080`.

---

## 9. Onde olhar quando…

| Pergunta | Onde |
|---|---|
| Como funciona X regra de negócio? | [BUSINESS_RULES.md](BUSINESS_RULES.md) |
| Qual endpoint pra fazer Y? | [API.md](API.md) ou Swagger UI |
| Por que essa decisão foi tomada? | [SPEC.md §10](SPEC.md#10-decisões-pendentes) ou mensagem do commit da PR original |
| Como o frontend está organizado? | [ARCHITECTURE.md §3](ARCHITECTURE.md#3-frontend) |
| Como adicionar um widget no dashboard? | Olhar `frontend/src/dashboard/widgets.tsx` — copiar um existente, registrar no array `WIDGETS` |
| Como adicionar uma paleta nova? | Olhar `frontend/src/theme/palettes.ts` — copiar uma existente e trocar cores |
| Como o design system está estruturado? | [docs/design/](design/) |
| Como adicionar log num endpoint/flow? | [OBSERVABILITY.md — recipe](OBSERVABILITY.md#como-adicionar-log-num-flow-novo--recipe) |
| Onde a senha/CPF/token NÃO podem vazar? | [OBSERVABILITY.md — redação](OBSERVABILITY.md#redação) |
