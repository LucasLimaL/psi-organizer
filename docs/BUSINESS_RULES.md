# Regras de Negócio — psi-organizer

Todas as regras enforced pelo sistema, em um único lugar. Cada regra cita onde é aplicada no código.

> Modelo de dados e nomes de tabelas: **[SPEC.md §5](SPEC.md#5-modelo-de-domínio)** · Endpoints: **[API.md](API.md)** · Arquitetura: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 1. Identidade e unicidade

| Regra | Onde |
|---|---|
| **E-mail de psicóloga** é único globalmente | `PsicologaService.criar` (`existsByEmail`) → `409 conflito("E-mail já cadastrado")` |
| **CPF de psicóloga** é único globalmente | `PsicologaService.criar` (`existsByCpf`) → `409 conflito("CPF já cadastrado")` |
| **CPF de paciente** é único **por psicóloga** (a mesma pessoa pode ser paciente de psicólogas diferentes) | `PacienteService.criar`/`atualizar` (`existsByPsicologaIdAndCpf`) → `409 conflito("Já existe um paciente com este CPF")` · Constraint composta `uq_paciente_cpf_por_psicologa(psicologa_id, cpf)` |
| **IDs** são UUID v4, gerados na aplicação | Construtor de entidade |
| **Campos imutáveis no perfil** | `AtualizarPerfilRequest` aceita apenas `nomeCompleto`, `crp`, `telefone`, `endereco`. **E-mail e CPF não são editáveis** por aqui (alterá-los exigiria fluxo de verificação separado, fora de escopo). Senha tem endpoint próprio (não implementado no MVP). |

---

## 2. Multi-tenancy

| Regra | Onde |
|---|---|
| Toda query de domínio filtra por `psicologa_id` | Métodos do repositório com sufixo `AndPsicologaId` ou via JPQL parametrizada |
| O `psicologaId` vem sempre do contexto de segurança, nunca do payload | `PsicologaPrincipal.corrente().id()` em cada Controller |
| Toda tabela de domínio tem coluna `psicologa_id NOT NULL` com FK | `V1__schema_inicial.sql` |

Detalhes do modelo em [ARCHITECTURE.md §2.3](ARCHITECTURE.md#23-multi-tenancy).

---

## 3. Validação de entrada (declarativa, nos DTOs)

### Senha

- **Mínimo 8 caracteres** + **pelo menos 1 dígito numérico**.
- Anotação `@SenhaValida` (`common/validation/SenhaValida.java`), implementação em `SenhaValidaValidator`.
- Armazenada com **BCrypt** (default 10 rounds).
- Validada apenas no `SignupRequest` (no MVP não há endpoint de troca de senha).

### CPF

- **Validação com cálculo dos dígitos verificadores** (algoritmo oficial da Receita).
- Anotação `@Cpf` (`common/validation/Cpf.java`), lógica em `CpfUtil.isValido`.
- Persistido **sem máscara** (apenas dígitos). `CpfUtil.somenteDigitos` normaliza antes de salvar.
- Aplicado em `SignupRequest.cpf` (psicóloga) e `PacienteRequest.cpf` (paciente).

### E-mail

- `@Email` (Jakarta Validation) em `SignupRequest`, `LoginRequest` e `PacienteRequest.email` (opcional para paciente).
- Sem domínio bloqueado, sem MX-check.

### CEP, telefone, UF

- CEP: `@Pattern("\\d{8}")` em `EnderecoDto`. Persistido sem máscara.
- UF: `@Size(min = 2, max = 2)` em `EnderecoDto`. Frontend força uppercase.
- Telefone: `@NotBlank` apenas. Sem formato fixo — usuário entra como preferir.

### Datas e horários

- `LocalDate dataNascimento` em `PacienteRequest`: `@PastOrPresent`.
- `Instant inicio` em `ConsultaRequest`: `@NotNull`. Aceita qualquer ponto no tempo (passado/futuro), mas conflitos com consultas existentes são bloqueados.
- `LocalDate inicioEm` / `LocalDate fimEm` em `ConsultaRecorrenteRequest`: ambos `@NotNull`. Service verifica `fimEm >= inicioEm`.

### Valores e durações

- `BigDecimal valor` em `ConsultaRequest`, `ConsultaUpdateRequest`, `ConsultaRecorrenteRequest`, `PacienteRequest.valorConsulta`: `@DecimalMin("0.00", inclusive = true)`.
- `int duracaoMinutos`: `@Min(1) @Max(600)` (10 horas máximas).
- `int intervaloSemanas` (recorrência): `@Min(1) @Max(52)` (1 ano).

---

## 4. Status de consulta

```
AGENDADA   ← default ao criar (avulsa ou via recorrência)
CONFIRMADA ← psicóloga confirmou presença
REALIZADA  ← sessão aconteceu
FALTA      ← paciente não compareceu (no-show)
```

| Regra | Onde |
|---|---|
| Default ao criar é **AGENDADA** | Construtor de `Consulta` |
| Status pode mudar livremente via `PUT /consultas/{id}` | `ConsultaService.atualizar` — sem state machine que bloqueie transições "estranhas" (ex: REALIZADA → AGENDADA). Decisão consciente: psicóloga pode corrigir lançamentos. |
| `pago` é **boolean independente do status** | Coluna própria na tabela. Pode ser true para qualquer status; uso prático é com REALIZADA. |
| `valor` é **snapshot** do `paciente.valorConsulta` no momento da criação, mas pode ser editado por consulta | `ConsultaController.criar` envia o valor do paciente como default; payload pode sobrescrever |

---

## 5. Validação de conflito de horário

| Regra | Onde |
|---|---|
| **Não é permitido criar duas consultas que se sobreponham** para a mesma psicóloga | `ConsultaService.validarConflito` → `409 conflito("Já existe uma consulta neste horário")` |
| A janela considerada é `[inicio, inicio + duracaoMinutos)` | `Consulta.fim()` |
| Em update, o **id da própria consulta é excluído** da verificação | `ConsultaService.atualizar` passa `c.getId()` como `idIgnorar` |
| Conflito **vale para qualquer status** | Não é filtrado por status — uma REALIZADA também bloqueia. Decisão: tempo é um recurso, mesmo histórico ocupa slot. |
| Otimização: a query carrega apenas candidatos dentro de uma janela de 12h | `ConsultaRepository.candidatosConflito` + `JANELA_CONFLITO = Duration.ofHours(12)`. Filtragem fina feita em Java. |

---

## 6. Recorrência

Visão de produto em [SPEC.md §5.5](SPEC.md#55-recorrência-sem-tabela).

| Regra | Onde |
|---|---|
| **Recorrência não é entidade persistida** — gera N consultas individuais e independentes | `ConsultaService.criarRecorrente` |
| `fimEm` é **obrigatório** | `@NotNull` em `ConsultaRecorrenteRequest` |
| `fimEm` deve ser `>= inicioEm` | Service → `400 requisicaoInvalida("fimEm precisa ser >= inicioEm")` |
| `intervaloSemanas` configurável (1 = toda semana, 2 = quinzenal, etc.) | `@Min(1) @Max(52)` |
| Hard limit de **520 ocorrências** (≈ 10 anos semanais) como salvaguarda | `MAX_OCORRENCIAS = 520` → `400 "Intervalo gera mais de 520 consultas"` |
| Se a janela não contém nenhuma data com o `diaDaSemana` informado → `400` | `"Nenhuma ocorrência no intervalo para o dia da semana informado"` |
| **Atomicidade total**: valida conflito de **TODAS** as N ocorrências antes de salvar; se **qualquer uma** conflita, NENHUMA é criada | `@Transactional` + loop de validação antes do `saveAll` |
| Após criadas, **cada consulta é editada/cancelada individualmente** — não há conceito de "série" para alterações em massa | — |

---

## 7. Soft delete de paciente

| Regra | Onde |
|---|---|
| `DELETE /pacientes/{id}` faz **soft delete** (`ativo = false`) | `PacienteService.inativar` |
| **Consultas passadas permanecem intactas** no histórico | — |
| **Consultas futuras com status AGENDADA ou CONFIRMADA são HARD-deletadas** | `ConsultaRepository.apagarFuturasDoPaciente(pacienteId, agora)` — JPQL `DELETE` |
| Consultas futuras com status REALIZADA ou FALTA (incomum, mas possível por edição manual) **NÃO são apagadas** | A query filtra explicitamente `status in (AGENDADA, CONFIRMADA)` |
| **Reativar não traz as consultas canceladas de volta** | `PacienteService.reativar` só seta `ativo = true` |
| Paciente **inativo não pode receber novas consultas** | `ConsultaService.validarPaciente` → `400 requisicaoInvalida("Paciente inativo não pode receber novas consultas")` |
| `GET /pacientes` retorna apenas ativos por padrão; `?incluirInativos=true` inclui todos | `PacienteService.listar` |

A UI reforça a regra com o `InativarPacienteDialog` (Alert outlined warning explicando que consultas futuras serão removidas permanentemente).

---

## 8. Listagem paginada de consultas do paciente

| Regra | Onde |
|---|---|
| **Próximas**: `inicio > agora`, ordem ASC | `ConsultaRepository.proximasDoPaciente` |
| **Histórico**: `inicio <= agora`, ordem DESC | `ConsultaRepository.historicoDoPaciente` |
| `limit` clampado entre **1 e 50** | `PacienteController.listarConsultas`: `Math.max(1, Math.min(50, limit))` |
| `offset` clampado em **≥ 0** | Idem: `Math.max(0, offset)` |
| Resposta inclui `temMais` (calculado como `offset + items.size() < total`) | `ConsultaService.listarDoPaciente` |
| Paciente verificado contra `psicologa_id` antes de qualquer query | `findByIdAndPsicologaId` → `404 naoEncontrado` |

---

## 9. Convenções de domínio

### Valor da consulta

- Cada paciente tem um `valorConsulta` padrão no cadastro.
- Ao criar uma consulta, o frontend pré-preenche o campo com esse valor, mas o usuário pode sobrescrever no submit.
- Cada consulta guarda seu próprio `valor` — alterar `paciente.valorConsulta` no futuro **não altera** consultas passadas.

### Pago vs faturamento

- `consulta.pago` é boolean, independente do status.
- Para fins de **faturamento no dashboard**: somente consultas com `status = REALIZADA` entram no cálculo.
  - `faturamentoRealizado` = soma de `valor` onde `status = REALIZADA`
  - `faturamentoPago` = soma onde `status = REALIZADA AND pago = true`
  - `faturamentoPendente` = soma onde `status = REALIZADA AND pago = false`
- Consultas FALTA não contam em nenhum dos três (paciente não compareceu).

### Duração

- Configurável **por consulta** (não por paciente).
- Backend aceita 1..600 minutos. Frontend não impõe limite além desse.

### Template do lembrete WhatsApp

- O texto da Msg 1 é um **template HSM registrado e aprovado na plataforma da Meta** (nome em `psi.whatsapp.template-lembrete-nome`). **Não é editável pela psicóloga** — mudar o texto exige criar novo template e passar por nova aprovação da Meta.
- O sistema expõe a prévia read-only em `GET /me/whatsapp` (`templateMensagem`), espelhada na constante `ConfiguracaoWhatsappResponse.TEMPLATE_LEMBRETE_META`. Parâmetros preenchidos a cada envio por `LembreteEnvioService.renderParametros`: `{{1}}` primeiro nome da paciente · `{{2}}` nome da psicóloga · `{{3}}` data `dd/MM/yyyy` · `{{4}}` hora `HH:mm` (fuso SP).
- `PUT /me/whatsapp` aceita apenas `ativo` e `horarioEnvioLembrete`.

---

## 10. Convenções de validação no frontend

### CEP autofill (ViaCEP)

- Quando o usuário digita CEP e atinge 8 dígitos, dispara `GET https://viacep.com.br/ws/{cep}/json/`.
- **Sucesso** preenche `logradouro`, `bairro`, `cidade`, `uf` e **trava** esses 4 campos (`disabled`).
- **Número** e **complemento** seguem editáveis — não vêm do CEP.
- Trava destrava em:
  - **Mudança do CEP** (usuário digita outro)
  - **Falha do ViaCEP** (404, JSON inválido, campo `erro: true`)
- Hook: `frontend/src/hooks/useAutofillCep.ts`. Componente: `frontend/src/components/EnderecoForm.tsx`.

### Busca de pacientes

- Aceita **nome** (case-insensitive `includes`), **CPF** (compara dígitos) ou **telefone** (compara dígitos).
- Implementação client-side em `PacientesPage.filtrados`.
- Placeholder: "Buscar por nome, CPF ou telefone".

---

## 11. Convenções gerais

| Item | Convenção |
|---|---|
| Idioma | **pt-BR** em todo lugar — código, validações, mensagens de erro, UI, commits, docs |
| IDs externos | UUID v4 |
| Timestamps na API | ISO-8601 com offset (ex: `2026-05-29T14:00:00-03:00`) |
| Datas-apenas na API (ex: query params) | ISO-8601 simples (ex: `2026-05-29`) |
| Erros da API | `{ "erro": "Mensagem pt-BR", "detalhes": {...} }` |
| Timezone | UTC no banco + backend interno · America/Sao_Paulo na borda (Controller e frontend) |
| Persistência local (browser) | Apenas preferências e cache resumido — nada sensível além do JWT |
