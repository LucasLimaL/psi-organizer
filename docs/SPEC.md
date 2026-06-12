# psi-organizer — Especificação Técnica

Sistema web para psicólogas organizarem cadastro de pacientes e agenda de consultas.

Documento vivo. Última atualização: 2026-05-27.

---

## 1. Visão Geral

**Problema:** psicólogas precisam de uma ferramenta centralizada para cadastrar pacientes e gerenciar sua agenda de consultas, sem depender de planilhas ou agendas em papel.

**Usuária-alvo:** psicóloga autônoma (consultório individual).

**Modelo de uso:** multi-tenant — cada psicóloga cria sua própria conta e enxerga apenas seus próprios pacientes e sua própria agenda. Não há compartilhamento entre contas.

**Escopo MVP (este documento):**
- Cadastro e login de psicóloga
- CRUD de pacientes (com soft delete)
- Agenda com consultas avulsas e recorrentes
- Visualização semanal da agenda

**Fora de escopo (MVP):**
- Testes unitários/integração (serão adicionados depois)
- Prontuário eletrônico / notas de sessão estruturadas
- Relatórios financeiros
- Notificações por e-mail/SMS
- Integração com calendários externos (Google Calendar, etc.)
- Upload de documentos/anexos
- Recuperação de senha por e-mail

---

## 2. Stack Tecnológica

### Backend
- **Linguagem:** Java 21
- **Framework:** Spring Boot (versão estável mais recente)
- **Build:** Maven
- **Banco:** PostgreSQL (rodando via Docker Compose em desenvolvimento)
- **Migrations:** Flyway
- **Autenticação:** Spring Security + JWT (stateless)
- **Documentação de API:** Swagger / OpenAPI (springdoc-openapi)
- **Arquitetura:** MVC clássico — Controller → Service → Repository
- **Lombok:** não será usado

### Frontend
- **Build:** Vite
- **Linguagem:** TypeScript
- **Framework:** React
- **Roteamento:** React Router
- **HTTP:** fetch nativo ou axios (decidir na implementação)
- **UI:** Material UI (MUI) — priorizar componentes prontos e reutilizáveis; manter o uso simples

### Infra de desenvolvimento
- `docker-compose.yml` na raiz sobe Postgres local
- Backend e frontend rodam separadamente (`mvn spring-boot:run` e `npm run dev`)

---

## 3. Estrutura de Pastas

```
psi-organizer/
├── docs/
│   └── SPEC.md              ← este documento
├── docker-compose.yml       ← Postgres local
├── backend/
│   ├── pom.xml
│   └── src/main/java/...    ← Spring Boot
└── frontend/
    ├── package.json
    └── src/                 ← React + TS
```

---

## 4. Arquitetura do Backend

### Camadas (MVC clássico)

```
Controller  ←  DTOs de request/response (exclusivos da camada web)
    ↓ mapeia para
Service     ←  regras de negócio, trabalha com objetos de domínio
    ↓
Repository  ←  Spring Data JPA, trabalha com entidades
    ↓
PostgreSQL
```

**Regra arquitetural importante:**
- DTOs de request/response existem **apenas** na camada Controller.
- O Controller é responsável por mapear `RequestDTO → objeto de domínio` antes de chamar o Service, e `objeto de domínio → ResponseDTO` antes de retornar.
- O Service **não conhece** os DTOs da camada web.

### Pacotes (sugestão)
```
com.psiorganizer
├── config/          ← Spring Security, CORS, Swagger
├── auth/            ← login, signup, JWT
│   ├── controller/
│   ├── service/
│   └── dto/
├── psicologa/       ← conta da usuária (perfil)
├── paciente/        ← CRUD pacientes
├── consulta/        ← agendamentos
└── common/          ← exceções, utils, tipos compartilhados
```

### Documentação de API
- Todos os endpoints devem ser documentados com anotações OpenAPI/Swagger (`@Operation`, `@ApiResponse`, etc.).
- Swagger UI disponível em `/swagger-ui.html`.

### Autenticação
- Endpoints `/auth/signup` e `/auth/login` são públicos.
- Demais endpoints exigem `Authorization: Bearer <jwt>`.
- JWT contém o ID da psicóloga (claim `sub`).
- Toda query no banco filtra implicitamente pelo `psicologaId` da usuária autenticada (multi-tenancy via filtro de aplicação).

---

## 5. Modelo de Domínio

### 5.1 Psicóloga (conta)
| Campo            | Tipo            | Obrigatório | Notas                                |
|------------------|-----------------|-------------|--------------------------------------|
| id               | UUID            | sim         | PK                                   |
| nomeCompleto     | string          | sim         |                                      |
| email            | string          | sim         | único, usado no login                |
| senhaHash        | string          | sim         | BCrypt                               |
| cpf              | string (11)     | sim         | único                                |
| crp              | string          | sim         | registro profissional                |
| telefone         | string          | sim         |                                      |
| endereco         | Endereco (embed)| sim         | ver §5.4                             |
| criadoEm         | timestamp       | sim         |                                      |

### 5.2 Paciente
| Campo            | Tipo            | Obrigatório | Notas                                |
|------------------|-----------------|-------------|--------------------------------------|
| id               | UUID            | sim         | PK                                   |
| psicologaId      | UUID            | sim         | FK → Psicóloga                       |
| nome             | string          | sim         |                                      |
| cpf              | string (11)     | sim         | único por psicóloga                  |
| dataNascimento   | date            | sim         |                                      |
| telefone         | string          | sim         |                                      |
| email            | string          | não         |                                      |
| endereco         | Endereco (embed)| sim         | ver §5.4                             |
| valorConsulta    | decimal(10,2)   | sim         | valor padrão usado ao criar consulta |
| observacoes      | text            | não         | notas livres                         |
| ativo            | boolean         | sim         | soft delete (default `true`)         |
| criadoEm         | timestamp       | sim         |                                      |

**Soft delete:** ao "excluir" um paciente, `ativo = false`. Consultas históricas são preservadas. Pacientes inativos não aparecem nas listagens padrão.

### 5.3 Consulta (agendamento)
| Campo              | Tipo                                              | Obrigatório | Notas                                |
|--------------------|---------------------------------------------------|-------------|--------------------------------------|
| id                 | UUID                                              | sim         | PK                                   |
| psicologaId        | UUID                                              | sim         | FK                                   |
| pacienteId         | UUID                                              | sim         | FK                                   |
| inicio             | timestamp                                         | sim         | data/hora de início                  |
| duracaoMinutos     | int                                               | sim         | configurável por consulta            |
| valor              | decimal(10,2)                                     | sim         | snapshot do valorConsulta no momento |
| status             | enum: AGENDADA, CONFIRMADA, REALIZADA, FALTA      | sim         | default AGENDADA                     |
| pago               | boolean                                           | sim         | default false                        |
| observacoes        | text                                              | não         |                                      |
| criadoEm           | timestamp                                         | sim         |                                      |

### 5.4 Endereço (embeddable)
| Campo      | Tipo        | Obrigatório |
|------------|-------------|-------------|
| cep        | string (8)  | sim         |
| logradouro | string      | sim         |
| numero     | string      | sim         |
| complemento| string      | não         |
| bairro     | string      | sim         |
| cidade     | string      | sim         |
| uf         | string (2)  | sim         |

### 5.5 Recorrência (sem tabela)

Recorrência **não é uma entidade persistida**. Quando a psicóloga cria um agendamento recorrente, o backend **materializa todas as consultas individuais de uma vez** na tabela `consulta`. Cada consulta gerada é independente e indistinguível de uma consulta avulsa.

**Inputs ao criar recorrência (apenas no request, não persistidos):**
- `pacienteId`
- `diaDaSemana` (SEG..DOM)
- `horario` (time)
- `duracaoMinutos`
- `valor`
- `inicioEm` (date) — primeira ocorrência
- `fimEm` (date) — última ocorrência (**obrigatório**, para limitar o volume)

**Comportamento:**
- O endpoint cria N consultas com status `AGENDADA`, uma para cada semana entre `inicioEm` e `fimEm` no dia/horário indicados.
- Após criadas, cada consulta é editada/cancelada individualmente. Não há conceito de "série".
- Para estender a recorrência além do `fimEm` original, a usuária cria uma nova recorrência com novo intervalo.
- Cancelar "todas as futuras" da série não é uma operação de primeira classe no MVP (a usuária pode filtrar por paciente/intervalo e cancelar manualmente; reavaliar se virar dor).

---

## 6. Endpoints (visão inicial)

Todos retornam JSON. Todos exceto `/auth/*` exigem JWT.

### Auth
- `POST /auth/signup` — cria conta de psicóloga
- `POST /auth/login` — retorna `{ token, psicologa }`

### Perfil (psicóloga logada)
- `GET /me` — retorna dados da conta
- `PUT /me` — atualiza dados da conta

### Pacientes
- `GET /pacientes` — lista (apenas ativos por padrão; `?incluirInativos=true` opcional)
- `GET /pacientes/{id}`
- `POST /pacientes`
- `PUT /pacientes/{id}`
- `DELETE /pacientes/{id}` — soft delete
- `POST /pacientes/{id}/reativar`
- `GET /pacientes/{id}/consultas?tipo=proximas|historico&limit=&offset=` — lista paginada (envelope `{consultas, total, temMais}`)

### Consultas (agenda)
- `GET /consultas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` — lista por intervalo
- `GET /consultas/{id}`
- `POST /consultas` — cria consulta avulsa
- `POST /consultas/recorrente` — cria N consultas a partir de uma regra de recorrência (ver §5.5); retorna a lista de consultas criadas
- `PUT /consultas/{id}` — atualiza dados/status/pago
- `DELETE /consultas/{id}` — remove a consulta

### Dashboard
- `GET /dashboard` — métricas agregadas para a tela inicial (hoje, mês, comparativo, próximos 7 dias, pacientes, consultas futuras agendadas, próximas consultas)

> Sumário completo dos endpoints em **[docs/API.md](API.md)**. Swagger interativo em `/swagger-ui.html`.

---

## 7. Frontend — Telas

1. **Login** (`/login`) — e-mail + senha, com `AuthShell` (logo + tagline + fundo tonal)
2. **Cadastro de conta** (`/signup`) — formulário em seções (Dados pessoais / Registro profissional / Endereço), CEP autofill via ViaCEP
3. **Início / Dashboard** (`/`) — tela principal após login
   - Sistema de **widgets configuráveis** (catálogo de 10): user escolhe quais ativar via drawer (⚙️ Tune)
   - Drag & drop com `@dnd-kit` — swap on drop ou após **1s de hover** (preview animado)
   - Preferências persistidas em `localStorage` (`psi.dashboard.widgets`)
   - Default ativos: Hoje, Mês, Recebido, Consultas futuras, Próximos 7 dias, Próximas consultas
4. **Agenda** (`/agenda`)
   - Desktop: visão semanal (Seg-Dom) com grade 07h-21h, toggle ocultar FDS, navegação mensal pelo 1º dia útil, indicador de "agora"
   - Mobile (<md): **week-strip** estilo Google Calendar + drill-down por dia
   - Cores das consultas vêm de `theme.palette.statusConsulta` (parametrizado pela paleta ativa)
5. **Pacientes** (`/pacientes`) — listagem + busca por nome / CPF / telefone, toggle "incluir inativos", empty state ilustrado
   - Desktop: tabela com avatar + status
   - Mobile: lista de cards com chevron
6. **Detalhe do paciente** (`/pacientes/{id}`) — header card + **tabs** (Dados / Próximas / Histórico)
   - Tabs de consultas paginadas estilo extrato bancário ("Ver mais" anexa lote abaixo, sem paginação lateral)
   - Modal de inativação dedicado (`InativarPacienteDialog`) que reforça a remoção de consultas futuras
7. **Perfil** (`/perfil`) — editar dados (nome, CRP, telefone, endereço); e-mail e CPF são imutáveis (mostrados com ícone de cadeado)

**Shell de aplicação** (rotas autenticadas): `AppShell` com drawer lateral permanente em desktop / temporário em mobile, AppBar com `PaletteSwitcher` (troca de paleta em runtime).

---

## 8. Regras de Negócio

- E-mail da psicóloga é único globalmente.
- CPF do paciente é único **por psicóloga** (a mesma pessoa pode ser paciente de psicólogas diferentes).
- Ao criar uma consulta, `valor` herda de `paciente.valorConsulta`, mas pode ser editado.
- Não é possível criar duas consultas que se sobreponham para a mesma psicóloga (validação de conflito de horário).
  - Na criação recorrente, se **qualquer** das N consultas conflitar, a operação falha como um todo (transacional) e nenhuma é criada.
- Soft delete de paciente: consultas passadas permanecem intactas; consultas futuras (`inicio > agora` e status `AGENDADA` ou `CONFIRMADA`) são **removidas** (hard delete) — como ainda não ocorreram, não há histórico relevante a preservar.
- **Senha:** mínimo 8 caracteres, com pelo menos 1 dígito numérico. Armazenada com BCrypt.
- **CPF:** validado com cálculo dos dígitos verificadores (algoritmo oficial da Receita), tanto no cadastro de psicóloga quanto de paciente. Persistido sem máscara (apenas dígitos).

---

## 9. Convenções

- **Timezone:** America/Sao_Paulo. Backend persiste em UTC, converte na borda.
- **Datas na API:** ISO-8601 (`2026-05-27T14:00:00-03:00`).
- **IDs:** UUID v4.
- **Erros:** resposta padrão `{ "erro": "MENSAGEM", "detalhes": {...} }` com HTTP status apropriado.
- **Idioma:** PT-BR em campos, mensagens de erro e UI.

---

## 10. Decisões Pendentes

Nenhuma no momento. Decisões fechadas até agora:

| Decisão | Resolução | Quando |
|---|---|---|
| UI library | Material UI 9 | 2026-05-27 |
| Soft delete de paciente | Hard-delete consultas futuras (AGENDADA/CONFIRMADA com `inicio > agora`) | 2026-05-27 |
| Recorrência | Sem tabela — materializa N consultas no momento da criação, transacional | 2026-05-27 |
| Senha | Mínimo 8 caracteres + ≥ 1 dígito numérico, BCrypt | 2026-05-27 |
| CPF | Validação com cálculo de dígitos verificadores | 2026-05-27 |
| Autofill de endereço | ViaCEP (gratuito, sem auth, padrão BR) | 2026-05-28 |
| Lock após CEP | Travar logradouro/bairro/cidade/UF; manter número e complemento editáveis | 2026-05-29 |
| Endpoint de recorrência | Separado (`POST /consultas/recorrente`) em vez de unificado com `/consultas` — preserva contratos estritos | 2026-05-28 |
| Comparativos no dashboard | Disponíveis como widgets opcionais (não default ativos) — evitar pressão de crescimento como default | 2026-05-29 |
| WhatsApp provider | Meta Cloud API direto, número único da plataforma — custo ~R$88/mês a 10 psi × 10 pacientes/dia, sem risco de ban, suporte nativo a HSM/botões/webhook. Modo número-próprio (Embedded Signup) postergado até demanda real. | 2026-05-29 |

---

## 11. Próximos Passos

Checklist vivo — marcar `[x]` quando concluído, com data.

- [x] **1. Aprovar este documento.** _(2026-05-27)_
- [x] **2. Scaffold do backend** _(2026-05-28)_ — Spring Boot 3.3.5 + Java 21 + Maven + Flyway + Postgres via Docker Compose + springdoc-openapi. Schema inicial (`V1__schema_inicial.sql`) com `psicologa`, `paciente`, `consulta` aplicado via Flyway. `mvn compile` passa. Spring Security e validações de domínio (CPF, senha) entram no passo 4. Runtime end-to-end requer `docker compose up -d` + `mvn spring-boot:run`.
- [x] **3. Scaffold do frontend** _(2026-05-28)_ — Vite 5 + React 18 + TS + Material UI 9 + React Router 7. Node atualizado para 24.16.0 LTS via winget. Estrutura: `components/Layout.tsx` (AppBar com navegação), `pages/` (Login, Signup, Agenda, Pacientes, PacienteDetalhe, Perfil — placeholders), `api/client.ts` (fetch wrapper com JWT em localStorage e `VITE_API_BASE_URL`). Theme MUI light com primary `#6750A4`. `npm run build` passa.
- [x] **4. Auth ponta-a-ponta** _(2026-05-28)_ — Backend: `Psicologa` entity + repo, `Endereco` embeddable, validadores `@Cpf` (com dígito verificador via `CpfUtil`) e `@SenhaValida` (≥8 chars + dígito), `JwtService` (HS256), `JwtAuthFilter`, `SecurityConfig` (stateless, CORS para `localhost:5173`, BCrypt), `AuthController` (`POST /auth/signup`, `POST /auth/login`), `PerfilController` (`GET /me`), `GlobalExceptionHandler` retornando `{erro, detalhes}`. JWT secret e CORS origin em `application.yml` via `psi.jwt.*` e `psi.cors.*`. Frontend: `AuthProvider` + `useAuth` com JWT em localStorage, `ProtectedRoute`, Login e Signup ligados aos endpoints, botão Sair no Layout. `mvn compile` e `npm run build` verdes. Runtime end-to-end requer Postgres rodando.
- [x] **5. CRUD de pacientes** _(2026-05-28)_ — Backend: `Paciente` entity, `PacienteRepository` (queries filtradas por `psicologaId`), `PacienteService` (criar/atualizar/inativar/reativar com checagem de CPF único por psicóloga), `PacienteController` (`GET /pacientes`, `?incluirInativos=true`, `GET/PUT/DELETE /pacientes/{id}`, `POST /pacientes/{id}/reativar`). Soft delete usa `ConsultaRepository.apagarFuturasDoPaciente` (entity Consulta + enum StatusConsulta criados aqui pra suportar a operação; CRUD completo de consultas fica no passo 6). Frontend: `api/pacientes.ts` tipado, `components/PacienteForm.tsx` reusável, `PacientesPage` (tabela com busca por nome/CPF, toggle inativos, criar via dialog, inativar/reativar), `PacienteDetalhePage` (edição).
- [x] **6. Agenda — consultas avulsas** _(2026-05-28)_ — Backend: DTOs `{ConsultaRequest,ConsultaUpdateRequest,ConsultaResponse}.java`, `ConsultaService` com `validarConflito` (janela de 12h, exclui id em edição), `ConsultaController` (`GET /consultas?inicio&fim` em fuso America/Sao_Paulo inclusivo, `GET/PUT/DELETE /consultas/{id}`, `POST /consultas`). Paciente inativo bloqueia nova consulta. Frontend: `api/consultas.ts` tipado, `utils/datas.ts` (semana, formatação, datetime-local), `ConsultaDialog.tsx` (criar/editar/remover com pré-preenchimento de valor pelo paciente), `AgendaPage.tsx` (visão semanal Seg-Dom com grade horária 07h-21h, navegação prev/next/hoje, click em slot abre nova, click em consulta abre edição, cores por status). Toggle FDS e navegação mensal pelo 1º dia útil ficam no passo 8.
- [x] **7. Recorrência** _(2026-05-28)_ — Backend: enum `DiaSemana` (SEG..DOM → `DayOfWeek`), DTO `ConsultaRecorrenteRequest` (paciente, dia, horário `HH:mm`, duração, valor, `inicioEm`, `fimEm`, obs), `ConsultaService.criarRecorrente` que materializa N consultas semanalmente em America/Sao_Paulo. Transacional: valida conflito de TODAS as ocorrências antes de salvar; falha de qualquer uma aborta tudo. Guarda contra loops com MAX_OCORRENCIAS=520. Endpoint dedicado `POST /consultas/recorrente` (manter separado de `POST /consultas` para preservar contratos estritos — input e response diferentes; ver discussão na conversa). Frontend: dialog **unificado** `ConsultaDialog.tsx` com toggle "Consulta recorrente (semanal)" — no modo recorrência troca o campo `Início` por `Dia da semana + Horário + Início em + Fim em` e chama `criarRecorrente` no submit; mesma tela tanto pra avulsa quanto recorrente.
- [x] **Lint & formatação** _(2026-05-28)_ — **Frontend:** ESLint 9 (vem do scaffold Vite) + plugins react-hooks/react-refresh; `npm run lint` limpo. Ajustes feitos: `useAuth` movido pra `auth/authContext.ts` (provider em `auth/AuthProvider.tsx`) pra satisfazer `react-refresh/only-export-components`; `useCallback` em AgendaPage/PacientesPage pra resolver `react-hooks/exhaustive-deps`. **Backend:** Spotless 2.43 (sem auto-formatter pesado — palantir/google-java-format têm incompatibilidade com JDK 25 usado pelo Maven local). Regras aplicadas: `removeUnusedImports`, `importOrder` (java/javax/jakarta/org/com), `trimTrailingWhitespace`, `endWithNewline`, `indent` (4 espaços). 42 arquivos reformatados via `mvn spotless:apply`. Ligado à fase `verify` — `mvn verify` falha se algo estiver fora do padrão. Para reformatar: `mvn spotless:apply`.
- [x] **Seed de dados amostrais** _(2026-05-28)_ — `config/SeedDataRunner.java` é `ApplicationRunner` anotado com `@Profile("!prod")`. Roda no startup; se `psicologaRepo.count() == 0`, insere 1 psicóloga (`ana@psi.com` / `senha123`), 3 pacientes (CPFs válidos) e 6 consultas (passadas REALIZADA/FALTA, hoje CONFIRMADA, futuras AGENDADA). Pra desativar em produção: subir com `-Dspring.profiles.active=prod`. CPFs usados: 11144477735, 39053344705, 52998224725, 12345678909.
- [x] **8. UI da visão semanal** _(2026-05-28)_ — Toggle "Ocultar fim de semana" (preferência persistida em `localStorage` sob `psi.agenda.ocultarFds`) — quando ligado, mostra Seg-Sex; senão Seg-Dom. Navegação mensal com botões `<<` / `>>` que pulam para a semana contendo o **1º dia útil** do mês alvo (`primeiroDiaUtilDoMes` em `utils/datas.ts` — pula sáb/dom). Rótulo do mês exibido entre as setas. A busca de consultas continua usando a semana inteira (Seg-Dom) — só a renderização muda — pra não recarregar ao alternar o toggle.

### Janela de impacto visual + dashboard (entregue 2026-05-28 / 2026-05-29)

- [x] **PR #1 — Design system foundation** _(2026-05-28)_ — `theme/` com tokens parametrizáveis, 4 paletas swappable (Lavanda, Sálvia, Aurora, Oceano), `createAppTheme(paleta)` factory, `AppThemeProvider` com troca em runtime + persistência em `localStorage`, `AppShell` substitui o antigo `Layout` (drawer lateral responsivo permanente em desktop / temporary em mobile + AppBar com `PaletteSwitcher`). Fonte Inter via Google Fonts.
- [x] **PR #3 — Status + motion tokens** _(2026-05-28)_ — Tokens semânticos `statusConsulta` derivados de `info/primary/success/error`, função `derivarStatusConsulta`, augment do MUI `Palette` com `statusConsulta`. Tokens de motion (5 durations + 4 easings) aplicados a `theme.transitions` e respeitando `prefers-reduced-motion`. `AgendaPage` refatorada removendo todos os hex hardcoded — verificado por grep.
- [x] **PR #4 — Surface tonal + elevation + zIndex** _(2026-05-28)_ — Escala `surfaceContainer.{low,base,high,highest}` derivada por blend sRGB de `surface` com `primary` (5/8/11/14%), via `derivarSurfaceContainer` + `mix` em `derive.ts`. Tokens explícitos de `elevation` e `zIndex` em `globalTokens`. Drawer items usam `surfaceContainer.high` no hover.
- [x] **PR #5 — Reskin Agenda desktop** _(2026-05-28)_ — Toolbar reorganizada em pills (mês / semana / FDS / Nova consulta), cabeçalho de dias com nome em caption + número em círculo (hoje vira pill cheia primária), blocos de consulta com stripe lateral de status + bg tonal + texto em `text.primary`, indicador "agora" (linha vermelha + bolinha) que atualiza a cada 60s. Hover dos blocos com `translateY(-1px)` + sombra.
- [x] **PR #6 — Agenda mobile (week-strip)** _(2026-05-28)_ — Em `<md`, oculta a grade de 7 colunas e mostra: (1) **week-strip** clicável com bolinhas indicando consultas/dia + pill "hoje", (2) **banner do dia selecionado** com nome longo, (3) grade de **um único dia** com a coluna de horários. Toggle FDS some no mobile. Navegação de semana mantém seleção coerente (hoje se está na semana visível, senão segunda).
- [x] **PR #7 — Reskin Pacientes** _(2026-05-28)_ — Header com subtítulo de contagem + h5 + CTA pill. Busca com `SearchIcon` + clear. Filtro "incluir inativos" virou Chip toggle. Desktop: tabela com avatar + status outlined. Mobile: lista de cards. Empty state contextual com `PeopleOutline` em círculo tonal + CTA. **Busca por nome / CPF / telefone** (mesma lógica de dígitos). `InativarPacienteDialog` substitui `confirm()` nativo, com Alert warning reforçando o cancelamento de consultas futuras.
- [x] **PR #8 — Reskin Login + Signup + ViaCEP + EnderecoForm** _(2026-05-28)_ — `AuthShell` reusável (logo Spa + tagline + background com gradiente radial sutil derivado da paleta). Login com ícones nos campos e toggle de visibilidade de senha. Signup em 3 seções (Dados pessoais / Registro profissional / Endereço) com helpers contextuais. **CEP autofill** via [ViaCEP](https://viacep.com.br): hook `useAutofillCep` dispara busca quando CEP atinge 8 dígitos, preenche logradouro/bairro/cidade/UF, **trava esses campos** após autofill bem-sucedido (destravam em CEP novo ou falha). Componente `EnderecoForm` extraído e reusado entre Signup e PacienteForm.
- [x] **PR #9 — Reskin PacienteDetalhe** _(2026-05-28)_ — Breadcrumb + header card com avatar 64px + nome em h5 + chip de status + ação inline (Inativar/Reativar) + form em paper separado com subtítulo. Skeleton estruturado durante load.
- [x] **PR #10 — Perfil completo** _(2026-05-28)_ — Backend: `AtualizarPerfilRequest` DTO (nomeCompleto, crp, telefone, endereco), `PsicologaService.atualizarPerfil`, endpoint `PUT /me`. E-mail e CPF imutáveis. Frontend: `PerfilPage` com header card + 3 seções editáveis + `EnderecoForm` reusado, Snackbar de sucesso, `AuthContext.atualizarPsicologa` propaga novo nome ao AppShell.
- [x] **PR #11 — Dashboard com sistema de widgets** _(2026-05-29)_ — Backend: pacote `dashboard/` com `DashboardResponse`, `DashboardService.calcular` (carrega janela única, agrega em Java), endpoint `GET /dashboard`. Frontend: **/agenda** passa a ser rota dedicada e **/** vira Dashboard. Sistema de **widgets configuráveis** (10 widgets em `dashboard/widgets.tsx`), `DashboardGrid` com `@dnd-kit` (swap on drop, **1s hover preview** com swap antecipado animado, ESC cancela e restaura ordem original), `WidgetSettings` drawer com toggles. Preferências em `localStorage` (`psi.dashboard.widgets`). Comparativos (delta vs mês anterior) e taxa de comparecimento existem como widgets **opcionais não default** — escolha consciente para evitar pressão por crescimento contínuo na tela inicial.
- [x] **PR #12 — Histórico do paciente com Ver mais** _(2026-05-29)_ — Backend: endpoint `GET /pacientes/{id}/consultas?tipo=proximas|historico&limit&offset` com envelope `{consultas, total, temMais}`. 4 queries novas no `ConsultaRepository`. Frontend: `PacienteDetalhe` ganha 3 tabs (Dados / Próximas / Histórico). Componentes novos `ConsultaCard` (stripe lateral + data extensa + chips status/pago) e `ConsultasPacienteList` (paginação estilo extrato — 5 iniciais + "Ver mais (N restantes)" anexa lote abaixo). Contagem aparece no rótulo da tab após primeiro load.

### Frente financeiro + deploy em produção (entregue 2026-06-11/12)

- [x] **PRs #35/#36/#38/#41/#42 — Deploy em produção (GCP)** _(2026-06-11)_ — Backend no Cloud Run (build via Cloud Build assíncrono com poll de status), frontend no Firebase Hosting (SPA rewrite). Pipelines GitHub Actions com path filter (`backend/**` / `frontend/**`), auth keyless via WIF, actions atualizadas para versões Node 24. Scheduler de lembretes acordado por Cloud Scheduler via `POST /internal/whatsapp/tick` (token `X-Tick-Token` constant-time, fail closed); cron interno desligado em prod. Runbook em [docs/runbooks/infra-gcp.md](runbooks/infra-gcp.md).
- [x] **PRs #37 + #39 — Aba Financeiro** _(2026-06-11)_ — Backend: pacote `financeiro/` com `GET /financeiro/{resumo,pendentes,consultas}` por **regime de competência** (`periodo=YYYY-MM|YYYY`, fuso SP na borda), migração V5 (coluna `pago_em`), cobrável = REALIZADA **ou** FALTA (DashboardService alinhado à mesma regra). Frontend: página `/financeiro` com filtro mês/ano, banner fixo de pendências anteriores, cards de resumo clicáveis, pendentes agrupados por paciente com "Marcar pago". Regras em [BUSINESS_RULES.md §9](BUSINESS_RULES.md). (Conteúdo da #39 entrou acidentalmente na main por corrida de branch e foi revertido na #40 antes do merge da stack.)
- [x] **PR #43 — Consultas "a revisar"** _(2026-06-11)_ — Backend: `GET /consultas/a-revisar` paginado (mais antigas primeiro) + campo `consultasARevisar` no `/dashboard`. Frontend: banner âmbar expansível na Agenda com desfecho inline (Realizada/Falta/Cancelada) + widget "A revisar" (`defaultAtivo`, desativável). Fix: preferências de widgets ganham `conhecidos: WidgetId[]` — widget novo no catálogo agora entra como default mesmo com prefs antigas no localStorage.
- [x] **PR #44 — Nova consulta pela página do paciente + inputs** _(2026-06-11)_ — Botão Nova consulta no header de PacienteDetalhe (paciente pré-selecionado e imutável via prop `pacientePadraoId`; na Agenda o select segue livre), `theme/sx.ts` com `sxInputSemSpinner` removendo spinners dos inputs monetários, fix do `min 5` no input de duração (o padrão de 50 min era rejeitado com `min 1` + `step 5`).

### Pendente / próximas frentes (não bloqueador)

- [ ] **Testes** — backend e frontend (mencionado como "fora do MVP" em §1, ainda em aberto)
- [ ] **Hardening multi-tenant** — Row-Level Security do Postgres OU `@Filter` global do Hibernate (ver discussão em [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] **Audit Priority #4** — estados completos do Button (loading, ghost, danger) + TextField error refinado (ver [docs/design/audit-2026-05-28.md](design/audit-2026-05-28.md))
- [ ] **Audit Priority #5** — density toggle + dark mode + validação de contraste no CI
- [x] **Lembretes via WhatsApp** _(entregue; em produção via Cloud Scheduler desde a #35, 2026-06-11)_ — automação de envio 1 dia antes da consulta com confirmação bidirecional dupla, número único da plataforma, scheduler horário 07h-20h, PRs incrementais. Spec em [docs/specs/whatsapp-lembrete.md](specs/whatsapp-lembrete.md) · runbook em [docs/runbooks/whatsapp.md](runbooks/whatsapp.md).
