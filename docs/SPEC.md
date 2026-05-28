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

### Consultas (agenda)
- `GET /consultas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` — lista por intervalo
- `GET /consultas/{id}`
- `POST /consultas` — cria consulta avulsa
- `POST /consultas/recorrente` — cria N consultas a partir de uma regra de recorrência (ver §5.5); retorna a lista de consultas criadas
- `PUT /consultas/{id}` — atualiza dados/status/pago
- `DELETE /consultas/{id}` — remove a consulta

---

## 7. Frontend — Telas

1. **Login** (`/login`) — e-mail + senha
2. **Cadastro de conta** (`/signup`) — todos os campos da psicóloga
3. **Agenda** (`/`) — tela principal após login
   - Visão semanal (segunda a domingo)
   - Toggle "ocultar fim de semana"
   - Navegação semana anterior / próxima
   - Navegação mês anterior / próximo: pula para a semana que contém o **primeiro dia útil** do mês alvo
   - Clicar em horário vazio → modal de nova consulta
   - Clicar em consulta existente → modal de detalhes/edição (status, pago, observações)
4. **Pacientes** (`/pacientes`) — listagem + busca por nome/CPF
5. **Detalhe/edição do paciente** (`/pacientes/{id}`) — todos os campos + histórico de consultas
6. **Perfil** (`/perfil`) — editar dados da própria conta

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

Nenhuma no momento. Decisões anteriormente em aberto foram fechadas em 2026-05-27:
- UI: Material UI
- Soft delete de paciente: remove consultas futuras automaticamente
- Recorrência: sem tabela, materializa as N consultas no momento da criação
- Senha: mínimo 8 caracteres com pelo menos 1 dígito
- CPF: validação com cálculo dos dígitos verificadores

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
