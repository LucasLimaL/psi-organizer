# psi-organizer

Sistema web pt-BR para psicólogas organizarem **agenda de consultas**, **cadastro de pacientes** e **dashboard configurável**. Multi-tenant — cada psicóloga vê apenas seus próprios dados. Stack moderna, design system parametrizável, deploy single-tenant ou SaaS no futuro.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Spring Boot 3.3 · Java 21 · Maven · PostgreSQL 16 · Flyway · JWT (jjwt) · springdoc-openapi · Spotless |
| Frontend | Vite 5 · React 18 · TypeScript · Material UI 9 · React Router 7 · @dnd-kit · ViaCEP · ESLint 9 |
| Infra dev | Docker Compose (apenas Postgres) |
| Deploy | Cloud Run + Cloud Build (backend) · Firebase Hosting (frontend) · GitHub Actions com WIF e path filter |

## Estrutura

```
psi-organizer/
├── CLAUDE.md                  ← este arquivo
├── docker-compose.yml         ← Postgres local
├── backend/                   ← Spring Boot
│   ├── pom.xml
│   └── src/main/java/com/psiorganizer/
│       │  (cada domínio: controller/ service/ repository/ domain/ dto/)
│       ├── admin/             ← gestão SaaS: contratos, faturas, bloqueio
│       ├── auth/              ← signup, login, JWT, validação de e-mail (+ email/)
│       ├── consulta/          ← agenda + recorrência + dashboard helpers
│       ├── dashboard/         ← /dashboard
│       ├── financeiro/        ← resumo, pendentes por paciente, listas paginadas
│       ├── notificacao/       ← notificações in-app
│       ├── paciente/          ← CRUD + soft delete + histórico
│       ├── psicologa/         ← perfil + GET/PUT /me
│       ├── whatsapp/          ← lembretes: scheduler + tick, webhook, configuração (+ client/)
│       ├── common/            ← Endereco embeddable, validators, security, observability, exceptions
│       └── config/            ← Security, JWT filter, OpenAPI, Seed
├── frontend/                  ← React SPA
│   └── src/
│       ├── api/               ← clients tipados
│       ├── auth/              ← contexto + provider + protected route
│       ├── components/        ← shells, forms, dialogs reusáveis
│       ├── dashboard/         ← widgets + grid + settings
│       ├── hooks/             ← useAutofillCep
│       ├── pages/             ← 10 telas
│       ├── theme/             ← tokens, paletas, fábrica, augment MUI
│       └── utils/             ← datas
└── docs/                      ← documentação viva (ver índice abaixo)
```

## Comandos essenciais

```bash
# 1) Subir Postgres
docker compose up -d

# 2) Backend (porta 8080, Swagger em /swagger-ui.html)
cd backend
mvn spring-boot:run                       # dev
mvn compile                               # validação rápida
mvn spotless:apply                        # formata Java
mvn verify                                # roda spotless:check + lint

# 3) Frontend (porta 5173)
cd frontend
npm install                               # primeira vez
npm run dev                               # dev server (HMR)
npm run build                             # build prod
npm run lint                              # ESLint

# 4) Desativar seed amostral em prod
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Credenciais de seed

Quando o banco está vazio e o profile **não** é `prod`, `SeedDataRunner` insere:

- **Psicóloga**: `ana@psi.com` / `senha123`
- 3 pacientes (Maria, João, Carla) com CPFs válidos
- 6 consultas distribuídas entre passadas, hoje e futuras

## Pontos importantes pra eu saber

- **Multi-tenant via discriminator** (`psicologa_id` em todas as tabelas de domínio). Single schema. Toda query no service filtra por `PsicologaPrincipal.corrente().id()`.
- **Arquitetura MVC clássica**: Controller → Service → Repository. DTOs de request/response **só na camada Controller** — Services trabalham com objetos de domínio.
- **JWT stateless** (HS256, 24h). Header `Authorization: Bearer <token>`.
- **Timezone**: backend persiste em UTC; conversões para `America/Sao_Paulo` na borda (Controller e frontend).
- **Erros** padronizados como `{ "erro": "mensagem", "detalhes": {...} }` via `GlobalExceptionHandler`.
- **Logs**: 1 entrada por ação completa, MDC em todo lugar, **nunca `log.error` em service** — só `GlobalExceptionHandler` e wrappers de flow async logam. Body nunca aparece em plaintext. **Leia [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) antes de tocar em qualquer `log.*`.**
- **Idioma**: tudo em **pt-BR** — código, validações, commits, docs.

## Documentação

| Arquivo | O que contém |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Spec original do produto + checklist de entregas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura backend e frontend |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | Regras de negócio consolidadas |
| [docs/API.md](docs/API.md) | Sumário de endpoints + link Swagger |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup local + workflow de PR |
| [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | Política de logs: 1 log por ação, MDC, redação LGPD, single error log |
| [docs/design/](docs/design/) | Design system: audit, roadmap, componentes |
| [docs/runbooks/](docs/runbooks/) | Runbooks operacionais: infra GCP (deploy, troubleshooting, migração de região) e WhatsApp |

Antes de qualquer mudança não-trivial, **leia o doc relevante** — eles refletem decisões já fechadas que não devem ser revertidas sem discussão.

## Skills custom (`.claude/skills/`)

Skills project-level automatizam fluxos repetidos do projeto. Invoque com `/<nome>`:

| Skill | Quando usar |
|---|---|
| [`/psi-estado`](.claude/skills/psi-estado/SKILL.md) | Início de sessão — carrega contexto rápido (~200 palavras) |
| [`/psi-pr-merge-seguro`](.claude/skills/psi-pr-merge-seguro/SKILL.md) `<numero>` | Mergear PR seguindo o protocolo (multi-tenant check + stack management + rebase + force-push) |
| [`/psi-novo-endpoint`](.claude/skills/psi-novo-endpoint/SKILL.md) | Adicionar endpoint REST cumprindo todos os 12 passos do padrão |
| [`/psi-docs-sync`](.claude/skills/psi-docs-sync/SKILL.md) `<pr>` | Depois de mergear feature — identifica gaps de doc e propõe diffs |
| [`/psi-consolidar-migracoes`](.claude/skills/psi-consolidar-migracoes/SKILL.md) `[prod-agora\|prod-no-deploy]` | Squash de todas as migrações Flyway numa V1 — **apaga o banco** (inclusive prod no deploy); **sempre** confirma que a app não está em produção, mesmo "só local" |
| [`/trade-off-analysis`](.claude/skills/trade-off-analysis/SKILL.md) | Decisão arquitetural com 2-4 opções — produz mini-ADR opinado |

**Auto-invocação ativa.** O Claude decide sozinho quando carregar cada skill com base no que você pedir (ex: "mergeia o #12" dispara `psi-pr-merge-seguro`; "adiciona GET /pacientes/X" dispara `psi-novo-endpoint`). Você pode forçar manual com `/<nome>`. Se o auto-trigger virar incômodo (carregando demais ou de menos), me avise — calibra-se via `when_to_use` no SKILL.md.
