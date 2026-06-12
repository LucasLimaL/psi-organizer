# Arquitetura — psi-organizer

Decisões técnicas que se aplicam a todo o sistema. Mudanças aqui exigem PR explícita (não passar por refactor incidental).

> Visão de produto e telas: **[SPEC.md](SPEC.md)** · Regras de negócio: **[BUSINESS_RULES.md](BUSINESS_RULES.md)** · Endpoints: **[API.md](API.md)**

---

## 1. Visão geral

```
                    ┌─────────────────┐
                    │  Browser (SPA)  │
                    │  Vite + React   │
                    └────────┬────────┘
                             │ HTTPS / JWT
                             ▼
                    ┌─────────────────┐
                    │  Spring Boot    │
                    │  REST + JWT     │
                    └────────┬────────┘
                             │ JDBC
                             ▼
                    ┌─────────────────┐
                    │  PostgreSQL 16  │
                    │  Flyway-managed │
                    └─────────────────┘
```

- **Frontend** consome **um único backend** REST. Sem BFF, sem gateway.
- **Multi-tenant** via **discriminator column** — uma instância serve todas as psicólogas, isolamento por `psicologa_id` em cada linha.
- **Deploy** assumido como **single binary** + Postgres gerenciado. Sem microsserviços.

---

## 2. Backend

### 2.1 Camadas (MVC clássico)

```
Controller   ←  recebe Request DTO, retorna Response DTO
    │              (DTOs vivem APENAS aqui)
    ▼
Service      ←  regras de negócio, transações, domínio puro
    │
    ▼
Repository   ←  Spring Data JPA, queries
    │
    ▼
PostgreSQL
```

**Regra arquitetural crítica:** DTOs de request/response existem **apenas** na camada Controller. O Controller mapeia `RequestDTO → objeto de domínio` antes de chamar Service e `objeto de domínio → ResponseDTO` antes de retornar. Services nunca tocam em DTOs da camada web.

> **Exceção registrada (2026-06-11):** projeção **read-only** pode nascer no Service quando o mapeamento pra DTO seria 1:1 sem domínio intermediário significativo — caso do `DashboardService`, que monta `DashboardResponse` direto (refazer no Controller seria espelhar campo a campo sem ganho). Vale só pra leitura; comandos seguem a regra. Ver discussão em docs/REFACTOR_PLAN.md A9.

### 2.2 Estrutura de pacotes

```
com.psiorganizer/
├── auth/             ← signup, login, JwtService, AuthController
│   └── dto/          ← LoginRequest, LoginResponse, SignupRequest
├── consulta/         ← Consulta + StatusConsulta + DiaSemana
│   └── dto/          ← Request, UpdateRequest, RecorrenteRequest, Response, PaginadoResponse
├── dashboard/        ← DashboardController + Service + Response
├── financeiro/       ← FinanceiroController + Service + Repository (regime de competência)
│   └── dto/          ← FinanceiroResumoResponse, FinanceiroPendentesPaginadoResponse, FinanceiroConsultasPaginadoResponse
├── notificacao/      ← Notificacao + Repository + Service + Controller (notificações in-app)
│   └── dto/          ← NotificacaoResponse, NotificacoesEnvelope
├── paciente/         ← Paciente + Repository + Service + Controller
│   └── dto/          ← PacienteRequest, PacienteResponse
├── psicologa/        ← Psicologa + PerfilController + AtualizarPerfilRequest
│   └── dto/          ← PsicologaResponse, EnderecoDto, AtualizarPerfilRequest
├── whatsapp/         ← lembretes: LembreteScheduler + tick, envio, webhook, máquina de estados, configuração
│   ├── client/       ← WhatsappClient (MetaWhatsappClient real + MockWhatsappClient dev)
│   └── dto/          ← ConfiguracaoWhatsappResponse, EnviarTeste*, LembreteResponse, LembretesEnvelope
├── common/
│   ├── Endereco                   ← @Embeddable usado em Psicologa e Paciente
│   ├── validation/                ← @Cpf, @SenhaValida, CpfUtil
│   ├── security/PsicologaPrincipal ← record com {id, email}, posto no SecurityContext
│   └── exception/                 ← ApiException, GlobalExceptionHandler
└── config/
    ├── SecurityConfig             ← stateless, CORS, BCrypt
    ├── JwtAuthFilter              ← parseia Bearer, popula SecurityContext
    ├── OpenApiConfig              ← metadata Swagger
    └── SeedDataRunner             ← @Profile("!prod"), popula banco vazio
```

### 2.3 Multi-tenancy

**Modelo escolhido:** single-schema com discriminator (`psicologa_id` como FK em `paciente` e `consulta`).

- Não há schemas/databases por tenant.
- Isolamento é responsabilidade **do código**: services usam métodos do repository que sempre filtram por `psicologaId`:
  - `findByIdAndPsicologaId(...)`
  - `findByPsicologaIdAndAtivoOrderByNomeAsc(...)`
  - `listarIntervalo(psicologaId, inicio, fim)`
  - etc.
- O `psicologaId` vem sempre de `PsicologaPrincipal.corrente().id()`, lido do `SecurityContext` populado pelo `JwtAuthFilter`.
- **Constraint composta** `uq_paciente_cpf_por_psicologa(psicologa_id, cpf)` permite a mesma pessoa ser paciente de psicólogas diferentes.

**Risco assumido:** se algum dia alguém escrever `repository.findById(id)` direto sem o filtro, há vazamento. Mitigações possíveis (não implementadas): Postgres Row-Level Security ou Hibernate `@Filter` global. Listado em [SPEC.md §11](SPEC.md#11-próximos-passos) como hardening pendente.

### 2.4 Autenticação

- **JWT stateless** (HS256, 24h). Header `Authorization: Bearer <token>`.
- `JwtService` (em `auth/`) emite e valida. Segredo em `application.yml` via `psi.jwt.secret` — em produção precisa ser sobrescrito.
- `JwtAuthFilter` parseia, monta `PsicologaPrincipal` e seta no `SecurityContext` para a request.
- `SecurityConfig` deixa públicos: `POST /auth/**`, `/swagger-ui/**`, `/v3/api-docs/**`, `/actuator/health`. Tudo mais exige autenticação.
- Senhas armazenadas com BCrypt (default 10 rounds).
- CORS configurado via `psi.cors.allowed-origins` (default `http://localhost:5173`).

### 2.5 Persistência

- **PostgreSQL 16** — única dependência de runtime além do Java.
- **Flyway** gerencia schema (`backend/src/main/resources/db/migration/`).
- **Hibernate em modo `validate`** — o schema é fonte de verdade, entities precisam refletir. Migrations novas viram V2, V3, etc.
- **UUIDs** como PK em todas as tabelas.
- **Timestamps em UTC** no banco; Hibernate property `jdbc.time_zone: UTC` força isso.
- **Soft delete** apenas em `paciente` (campo `ativo`). Demais entidades usam hard delete.

### 2.6 Validação

Duas camadas:

1. **Declarativa via Jakarta Validation** em DTOs (`@NotBlank`, `@Email`, `@Min`, `@Pattern`, etc.). Customizados: `@Cpf` (com dígito verificador via `CpfUtil`), `@SenhaValida` (≥ 8 chars + ≥ 1 dígito). `MethodArgumentNotValidException` é tratada pelo `GlobalExceptionHandler` retornando `{erro, detalhes}` com `400`.
2. **Imperativa via ApiException nos Services** para conflitos e regras compostas. Ex: `throw ApiException.conflito("CPF já cadastrado")`.

Lista completa em [BUSINESS_RULES.md](BUSINESS_RULES.md).

### 2.7 Tratamento de erros

Formato único de resposta de erro:

```json
{
  "erro": "Mensagem legível em pt-BR",
  "detalhes": { "campo": "motivo do erro" }
}
```

`detalhes` aparece quando há erros de validação por campo; senão é omitido.

`GlobalExceptionHandler` mapeia:
- `ApiException` → status do próprio (404, 409, 401, 400)
- `MethodArgumentNotValidException` → 400 + detalhes por campo
- `Exception` genérica → 500 + mensagem

### 2.8 Timezone

- Banco e código backend operam em **UTC**.
- Conversão para `America/Sao_Paulo` acontece na borda:
  - `ConsultaController.listar`: recebe `LocalDate inicio/fim` e converte para `Instant` em SP.
  - `ConsultaService.criarRecorrente`: combina `LocalDate + LocalTime` em SP para `Instant`.
  - `DashboardService.calcular`: cálculos de "hoje", "mês corrente", "próximos 7 dias" todos em SP.
  - `SeedDataRunner`: idem.
- O frontend recebe `Instant` (ISO 8601 com offset) e renderiza no timezone do browser.

### 2.9 Documentação OpenAPI

- `springdoc-openapi` 2.6 gera spec automaticamente.
- **Todos os controllers** têm `@Tag(name = ..., description = ...)`.
- **Todos os endpoints** têm `@Operation(summary = ...)` em pt-BR.
- Swagger UI em `/swagger-ui.html`.
- Sumário humano em [API.md](API.md).

### 2.10 Lint e formatação

- **Spotless 2.43** em `pom.xml`, ligado à fase `verify`.
- Regras: `removeUnusedImports`, `importOrder` (java, javax, jakarta, org, com), `trimTrailingWhitespace`, `endWithNewline`, indent 4 espaços.
- **Sem auto-formatter pesado** (Palantir/Google Java Format têm incompatibilidade com JDK 25 do ambiente local). Decisão registrada em [SPEC.md](SPEC.md).
- Comandos: `mvn spotless:apply` (corrige) / `mvn spotless:check` (valida).

---

## 3. Frontend

### 3.1 Estrutura

```
src/
├── api/                ← clients tipados (fetch + JWT)
│   ├── client.ts       ← wrapper genérico
│   ├── cep.ts          ← ViaCEP
│   ├── consultas.ts
│   ├── dashboard.ts
│   ├── financeiro.ts
│   ├── notificacoes.ts
│   ├── pacientes.ts
│   ├── perfil.ts
│   └── whatsapp.ts
├── auth/
│   ├── authContext.ts  ← Context + useAuth (separado pra react-refresh)
│   ├── AuthProvider.tsx
│   └── ProtectedRoute.tsx
├── components/         ← reusados em mais de uma página
│   ├── AppShell.tsx, AuthShell.tsx, PaletteSwitcher.tsx
│   ├── PacienteForm.tsx, EnderecoForm.tsx
│   ├── ConsultaDialog.tsx, ConsultaCard.tsx, ConsultasPacienteList.tsx
│   ├── ConsultasARevisarBanner.tsx
│   ├── Financeiro{ConsultaItem,ConsultasList,PendentesList}.tsx
│   ├── NotificacoesBadge.tsx
│   └── InativarPacienteDialog.tsx
├── dashboard/          ← isolado por ser sistema próprio
│   ├── types.ts
│   ├── widgets.tsx     ← 10 widgets + catálogo
│   ├── DashboardGrid.tsx
│   └── WidgetSettings.tsx
├── hooks/
│   └── useAutofillCep.ts
├── pages/              ← uma por rota
│   ├── DashboardPage.tsx
│   ├── AgendaPage.tsx
│   ├── PacientesPage.tsx, PacienteDetalhePage.tsx
│   ├── FinanceiroPage.tsx
│   ├── PerfilPage.tsx
│   ├── ConfiguracoesWhatsappPage.tsx, HistoricoWhatsappPage.tsx
│   ├── LoginPage.tsx, SignupPage.tsx
├── theme/              ← design system
│   ├── tokens.ts       ← PaletteTokens, StatusToken, SurfaceContainerTokens, globalTokens
│   ├── palettes.ts     ← 4 paletas
│   ├── derive.ts       ← derivarStatusConsulta, derivarSurfaceContainer, mix
│   ├── createAppTheme.ts
│   ├── appThemeContext.ts, AppThemeProvider.tsx
│   ├── sx.ts            ← sx helpers compartilhados (sxInputSemSpinner)
│   └── mui-augment.d.ts ← extensão de types do MUI
└── utils/
    └── datas.ts        ← formatadores e cálculos de semana/mês
```

### 3.2 Roteamento

```
/login                  ← LoginPage (público)
/signup                 ← SignupPage (público)
/                               ← DashboardPage           ┐
/agenda                         ← AgendaPage               │
/pacientes                      ← PacientesPage            │
/pacientes/:id                  ← PacienteDetalhe          │ ProtectedRoute → AppShell
/financeiro                     ← FinanceiroPage           │
/perfil                         ← PerfilPage               │
/configuracoes/whatsapp         ← ConfiguracoesWhatsapp    │
/configuracoes/whatsapp/historico ← HistoricoWhatsapp      ┘
```

`ProtectedRoute` checa `useAuth().psicologa`. Se ausente, redireciona pra `/login`.

### 3.3 Design system

> Documentação detalhada em **[design/](design/)**.

- **Tokens parametrizáveis** (`theme/tokens.ts`) — `PaletteTokens` (cores), `StatusToken` (status de domínio), `SurfaceContainerTokens` (escala tonal), `globalTokens` (typography, spacing, radius, shadow, layout, elevation, zIndex, motion).
- **4 paletas pré-definidas** (`palettes.ts`): Lavanda (default), Sálvia, Aurora, Oceano. Todas light.
- **Fábrica `createAppTheme(paleta)`** em `createAppTheme.ts` — transforma tokens em `Theme` do MUI, faz overrides centralizados de Paper/AppBar/Drawer/Button/TextField/Chip/TableCell, respeita `prefers-reduced-motion`.
- **Derivações automáticas** (`derive.ts`) — `derivarStatusConsulta(palette)` e `derivarSurfaceContainer(palette)`. Paletas podem sobrescrever, mas não precisam.
- **Augment do MUI** (`mui-augment.d.ts`) — `theme.palette.statusConsulta` e `theme.palette.surfaceContainer` viraram type-safe.
- **Troca em runtime** via `AppThemeProvider` + `useAppTheme()`. Paleta atual persiste em `localStorage['psi.paleta']`.

### 3.4 Shell de aplicação

`components/AppShell.tsx`:
- **Desktop (≥ md)**: Drawer permanente à esquerda + AppBar fixa em cima.
- **Mobile**: AppBar com hamburger; Drawer temporário (slide-in).
- Avatar com iniciais + logout no rodapé do Drawer.
- `PaletteSwitcher` na AppBar pra trocar paleta em qualquer momento.

`components/AuthShell.tsx` é a versão pública (Login/Signup) — sem drawer, com logo centralizado + background com gradiente radial sutil derivado da paleta.

### 3.5 Sistema de widgets do dashboard

`dashboard/`:
- **Catálogo** (`widgets.tsx`): 11 widgets — Hoje, Mês, Recebido, Futuras, Próximos7Dias, ProximasConsultas, ARevisar, Comparativo, Taxa, Pacientes, NovosPacientes. Cada um declara `defaultAtivo`.
- **Grid** (`DashboardGrid.tsx`): `@dnd-kit/core` + `sortable`. Layout em CSS Grid responsivo (1 col xs / 2 sm / 3 md / 4 lg). Drag handle no canto superior direito do widget (aparece no hover) — permite clicar dentro do widget sem disparar drag.
- **Swap semantics**:
  - Drop direto sobre outro widget → swap imediato
  - **Hover por 1s** sobre outro widget → swap antecipado (state muda → CSS transition anima). Continuar arrastando troca de novo.
  - ESC durante drag → cancela, restaura ordem original
- **Settings drawer** (`WidgetSettings.tsx`): toggles + botão "Restaurar padrão".
- **Persistência** em `localStorage['psi.dashboard.widgets']` como `{ ativos, ordem, conhecidos }`. Higienizado no load: remove widgets fora do catálogo; `conhecidos` distingue widget **novo no catálogo** (entra como default) de **desativado de propósito** (fica fora). Prefs antigas sem o campo assumem `conhecidos = ativos ∪ ordem`.

### 3.6 Persistência local

Chaves usadas no `localStorage`:

| Chave | O que guarda |
|---|---|
| `psi.jwt` | JWT atual (set no login, removido no logout) |
| `psi.user` | Dados resumidos da psicóloga pro AppShell (cache do `/me`) |
| `psi.paleta` | ID da paleta ativa |
| `psi.agenda.ocultarFds` | `'1'` ou `'0'` — toggle ocultar fim de semana |
| `psi.dashboard.widgets` | `{ ativos: WidgetId[], ordem: WidgetId[], conhecidos: WidgetId[] }` |

Nada sensível além do JWT. Sem dados de paciente em cache.

### 3.7 Cliente HTTP

`api/client.ts` exporta `api<T>(path, init)`:
- Adiciona automaticamente `Authorization: Bearer ${psi.jwt}` se presente
- Adiciona `Content-Type: application/json`
- Em status ≠ 2xx, faz throw do body parseado como `ApiError = { erro, detalhes? }`
- Em 204, retorna `undefined`

Cada endpoint REST tem seu wrapper tipado em `api/`. Esses wrappers definem os tipos de request/response — eles são a fronteira contratual com o backend.

### 3.8 Endereço — autofill via ViaCEP

`hooks/useAutofillCep.ts`:
- Dispara `GET https://viacep.com.br/ws/{cep}/json/` quando `cep` atinge 8 dígitos
- Retorna `{ buscando, autoPreenchido }`
- `autoPreenchido` reseta para `false` quando o CEP muda ou ViaCEP falha

`components/EnderecoForm.tsx`:
- Usado em Signup, PacienteForm e Perfil
- CEP, número e complemento: **sempre editáveis**
- Logradouro, bairro, cidade, UF: **travam quando `autoPreenchido === true`** (ViaCEP retornou dados válidos)

### 3.9 Lint e build

- **ESLint 9** + plugins `react-hooks` e `react-refresh`. `npm run lint` deve estar limpo antes de PR.
- **TypeScript strict** (do template do Vite).
- **Vite build** (`npm run build`) faz typecheck via `tsc -b` + bundling. Falha em qualquer erro de TS.

---

## 4. Decisões registradas (resumo)

| Tema | Decisão | Por quê |
|---|---|---|
| MVC vs hexagonal | MVC clássico | MVP rápido, time único, escopo limitado |
| DTOs | Só na camada Controller | Mantém Services puros, contratos web isolados |
| Multi-tenant | Discriminator (psicologa_id) | Operacional simples vs schema/banco por tenant |
| Endereço | `@Embeddable` (não tabela) | 1 endereço por entidade, sem reuso, sem histórico |
| Recorrência | Materializa N consultas, sem tabela | Cancelar/editar uma é trivial, sem conceito de "série" |
| Autofill CEP | ViaCEP | Gratuito, sem auth, padrão BR |
| Comparativos no dashboard | Widgets opcionais (não default) | Evitar pressão por crescimento como default visível |
| Endpoint de recorrência | Separado de `/consultas` | Preserva contratos estritos (input/response distintos) |
| Lock pós-autofill | Trava só os campos do CEP, mantém número/compl. | Número não vem do CEP |
| Java auto-formatter | Spotless sem Palantir/Google | Incompatibilidade com JDK 25 no ambiente local |

Decisões com discussão estendida estão registradas nas mensagens de commit das respectivas PRs.
