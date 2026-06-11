# Plano de Refatoração — auditoria de 2026-06-11

> **Status: EXECUTADO em 2026-06-11.** Todas as fases mergeadas — PRs #25 (F1), #26 (F2), #27 (F3), #28 (F4), #29 (F5) e F6 nesta PR. Ajustes em relação ao plano original: **A12 caiu** (falso positivo — os códigos da tag `codigo` são gerados pela aplicação, cardinalidade limitada) e **A15 foi pulado** (o próprio plano condicionava a extração do hook da AgendaPage a mexer na página por outro motivo). Documento mantido como registro histórico da auditoria.

Auditoria completa de `backend/src/main` e `frontend/src` (3 agentes de exploração + verificação manual dos achados críticos). Nenhum arquivo de código foi alterado nesta fase. Cada fase abaixo = 1 PR independente, ordenada por impacto ÷ risco.

**Restrições herdadas do projeto** (CLAUDE.md, docs/): não tocar em testes, não mudar comportamento externo, não adicionar dependências sem aprovação, política de logs do [OBSERVABILITY.md](OBSERVABILITY.md) é lei.

---

## 1. Diagnóstico geral

O código está **saudável** — a arquitetura declarada (Controller → Service → Repository, pacote por domínio, multi-tenant por discriminator) é seguida com consistência, e a infra de observabilidade é bem construída. Os problemas reais são poucos e concentrados:

1. **A política de MDC foi construída mas não adotada**: `Mdc.with(...)` não é chamado em nenhum lugar do código (só aparece em javadoc). Nenhum controller enriquece o MDC com `pacienteId`/`consultaId` como o OBSERVABILITY.md manda.
2. **1 bug real de multi-tenant** no fallback por telefone do webhook WhatsApp (seção Bugs).
3. Duplicações pequenas e localizadas: `ZoneId` repetido 4×, formatadores repetidos no frontend (CPF ×3, iniciais ×5, moeda ×2), contagem de status duplicada no DashboardService.
4. Duas violações pontuais da regra "DTO só no Controller" (`HistoricoLembretesService`, `DashboardService`).
5. Docs de arquitetura desatualizados — não cobrem os módulos `notificacao/` e `whatsapp/` ("5 controllers / 18 endpoints" já não é verdade).

Falsos positivos descartados na verificação manual (NÃO refatorar): o `log.error` do [WebhookController.java:87](../backend/src/main/java/com/psiorganizer/whatsapp/WebhookController.java:87) é o ponto de absorção documentado ("quem captura, loga"); o `MDC.put` sem remove em `MaquinaEstadosService` é intencional (o `FlowLogger.limpar()` remove `LEMBRETE_ID`/`ETAPA_LEMBRETE`/`WAMID`); a transação por item no `LembreteScheduler` é decisão correta (transação global seguraria locks durante chamadas HTTP à Meta).

---

## 2. Achados por módulo

### Backend — observabilidade (transversal)

**A1 — Controllers não enriquecem MDC com IDs de domínio** · Impacto **alto** · Esforço médio · Risco baixo
[PacienteController.java](../backend/src/main/java/com/psiorganizer/paciente/PacienteController.java), [ConsultaController.java](../backend/src/main/java/com/psiorganizer/consulta/ConsultaController.java), [NotificacaoController.java](../backend/src/main/java/com/psiorganizer/notificacao/NotificacaoController.java), [ConfiguracaoWhatsappController.java](../backend/src/main/java/com/psiorganizer/whatsapp/ConfiguracaoWhatsappController.java).
`grep Mdc\.(with|flow)` só encontra o padrão em javadoc — o helper [Mdc.java](../backend/src/main/java/com/psiorganizer/common/observability/Mdc.java) nunca foi adotado. Ações sobre paciente/consulta não carregam `pacienteId`/`consultaId` no completion log (exceto o que `ResponseFieldExtractor` recupera do response).
**Proposta:** envolver o corpo dos handlers que recebem `{id}` em `try (var scope = Mdc.with(LogFields.PACIENTE_ID, id.toString()))` conforme a recipe do OBSERVABILITY.md §"HTTP endpoint novo".

**A2 — WebhookService não enriquece MDC com `wamid`** · Impacto médio · Esforço baixo · Risco baixo
[WebhookService.java:54-71](../backend/src/main/java/com/psiorganizer/whatsapp/WebhookService.java:54) — `processarMensagem`/`processarStatus` não põem `wamid` no MDC (key existe em `LogFields`, `FlowLogger.limpar()` já a remove). Nota: payload pode ter N mensagens — última sobrescreve; aceitável, registrar a limitação em comentário.

**A3 — OBSERVABILITY.md descreve wrapper de webhook que não existe** · Impacto baixo · Esforço baixo · Risco zero
A tabela do doc diz que o flow `webhook-whatsapp` emite log em `WebhookService.processar` via `Mdc.flow`. Na prática o processamento é inline na request HTTP e o log é o do `RequestLoggingFilter` (com sentinela `meta-webhook`). Alinhar o doc à implementação (ou vice-versa — recomendo alinhar o doc, a implementação atual cumpre "1 log por ação").

### Backend — duplicação e limpeza

**A4 — `ZoneId.of("America/Sao_Paulo")` duplicado 4×** · Impacto baixo · Esforço baixo · Risco baixo
[ConsultaService.java:27](../backend/src/main/java/com/psiorganizer/consulta/ConsultaService.java:27), [ConsultaController.java:33](../backend/src/main/java/com/psiorganizer/consulta/ConsultaController.java:33), [DashboardService.java:27](../backend/src/main/java/com/psiorganizer/dashboard/DashboardService.java:27), [SeedDataRunner.java:38](../backend/src/main/java/com/psiorganizer/config/SeedDataRunner.java:38), [LembreteScheduler.java:38](../backend/src/main/java/com/psiorganizer/whatsapp/LembreteScheduler.java:38) (nomes variam: `ZONA` vs `ZONA_BR`).
**Proposta:** constante única `com.psiorganizer.common.Fusos.ZONA_BR`.

**A5 — Método morto no repositório** · Impacto baixo · Esforço baixo · Risco baixo
[ConsultaRepository.java:28](../backend/src/main/java/com/psiorganizer/consulta/ConsultaRepository.java:28) — `findByPacienteIdOrderByInicioDesc` sem nenhum caller (grep confirma). Remover.

**A6 — Contagem por status duplicada no DashboardService** · Impacto médio · Esforço baixo · Risco baixo
`calcularHoje` e `calcularMes` repetem o mesmo filtro de janela + 4 contagens por `StatusConsulta`. Extrair `contarPorStatus(List<Consulta>)` retornando um record.

**A7 — CORS `allowedHeaders("*")` hardcoded** · Impacto baixo · Esforço baixo · Risco baixo
[SecurityConfig.java:57](../backend/src/main/java/com/psiorganizer/config/SecurityConfig.java:57) — `allowedOrigins` é configurável, headers não. Externalizar como `psi.cors.allowed-headers` com default `*`.

### Backend — camadas

**A8 — `HistoricoLembretesService` monta DTO de response** · Impacto médio · Esforço baixo · Risco baixo
[HistoricoLembretesService.java](../backend/src/main/java/com/psiorganizer/whatsapp/HistoricoLembretesService.java) importa `LembreteResponse`/`LembretesEnvelope` e constrói responses — viola "DTO só no Controller". Service deve retornar `List<LembreteEnviado>` + total; controller mapeia.

**A9 — `DashboardService.calcular` retorna `DashboardResponse`** · Impacto baixo · Esforço médio · Risco médio
[DashboardService.java:39](../backend/src/main/java/com/psiorganizer/dashboard/DashboardService.java:39). Mesmo desvio de A8, porém aqui o response é uma projeção read-only 1:1 — mover a montagem pro controller é boilerplate puro. **Recomendação: documentar como exceção consciente** (projeções de leitura podem nascer no service) em ARCHITECTURE.md §2.1, em vez de refatorar. Ver "Decisões a rediscutir".

**A10 — `ConsultaController` consulta `LembreteEnviadoRepository` direto** · Impacto baixo · Esforço médio · Risco médio
[ConsultaController.java:43-57](../backend/src/main/java/com/psiorganizer/consulta/ConsultaController.java:43) — métodos `lembretes()`/`enriquecer()` fazem fetch + join em memória no controller. Mover para `ConsultaService` (controller continua mapeando DTO).

### Backend — qualidade pontual (opcional)

**A11 — `MaquinaEstadosService.voltar()` com 44 linhas e 2 fluxos** · Impacto baixo · Esforço médio · Risco médio
[MaquinaEstadosService.java:171-214](../backend/src/main/java/com/psiorganizer/whatsapp/MaquinaEstadosService.java:171). Extrair `voltarDentroJanela()` / `congelarPorLoop()`. Junto: métrica `estadoOrfao()` quando `consulta == null` (hoje o lembrete fica órfão em silêncio).

**A12 — Tag `codigo` de métrica com cardinalidade aberta** · Impacto baixo · Esforço baixo · Risco baixo
[WhatsappMetricas.java:52-57](../backend/src/main/java/com/psiorganizer/whatsapp/WhatsappMetricas.java:52) — `whatsapp.falhas.total{codigo=...}` aceita qualquer string vinda da Meta. Normalizar (allowlist de códigos conhecidos + bucket `outro`).

### Frontend

**A13 — Formatadores duplicados** · Impacto médio · Esforço baixo · Risco baixo
- `formatarCpf` ×3: [PacientesPage.tsx:21](../frontend/src/pages/PacientesPage.tsx:21), [PacienteDetalhePage.tsx:25](../frontend/src/pages/PacienteDetalhePage.tsx:25), [PerfilPage.tsx:22](../frontend/src/pages/PerfilPage.tsx:22)
- `iniciais` ×5: [AppShell.tsx:39](../frontend/src/components/AppShell.tsx:39), [widgets.tsx:25](../frontend/src/dashboard/widgets.tsx:25), [PacienteDetalhePage.tsx:16](../frontend/src/pages/PacienteDetalhePage.tsx:16), [PacientesPage.tsx:26](../frontend/src/pages/PacientesPage.tsx:26), [PerfilPage.tsx:13](../frontend/src/pages/PerfilPage.tsx:13)
- `brl` ×2: [ConsultaCard.tsx:21](../frontend/src/components/ConsultaCard.tsx:21), [widgets.tsx:22](../frontend/src/dashboard/widgets.tsx:22)
**Proposta:** criar `frontend/src/utils/formatadores.ts` (padrão de [utils/datas.ts](../frontend/src/utils/datas.ts)) e importar nos 8 pontos.

**A14 — Formatação de data fora de `utils/datas.ts`** · Impacto baixo · Esforço baixo · Risco baixo
[NotificacoesBadge.tsx:16,76](../frontend/src/components/NotificacoesBadge.tsx:16) usa `toLocaleString('pt-BR')` direto; [ConsultaCard.tsx:25-29](../frontend/src/components/ConsultaCard.tsx:25) redefine `formatarDataExtenso` quando `formatarDataLonga` já existe em `datas.ts`. Adicionar `formatarDataHora` em `datas.ts` e reutilizar.

**A15 — `AgendaPage.tsx` com 648 linhas** · Impacto baixo · Esforço médio · Risco **médio**
Candidata a extrair hook `useAgendaNavegacao` (semana/mês/dia selecionado). Opcional — a página está bem escrita; só vale se for mexer nela por outro motivo.

---

## 3. Módulos saudáveis (não mexer)

- **auth/**, **psicologa/**, **paciente/** (service), **notificacao/** — multi-tenant consistente, camadas corretas.
- **common/observability/** — `RequestLoggingFilter`, `BodyRedactor`, `FlowLogger`, `HmacValidator` bem implementados (constant-time, redação, cleanup de MDC).
- **consulta/ConsultaRepository** — queries com filtro de tenant, janela de conflito conforme decisão.
- **frontend:** `api/client.ts`, `theme/` (zero cor hardcoded), `utils/telefones.ts`, `useNotificacoesPolling` (cleanup correto), `DashboardGrid`, `AuthProvider`. TypeScript strict sem `any`.

---

## 4. Fases de execução (1 PR cada)

| Fase | Conteúdo | Achados | Verificação |
|---|---|---|---|
| **F1 — Bug multi-tenant webhook** ✅ `88598a1` (branch `fix/webhook-fallback-multi-tenant`) | Escopar fallback por telefone (ver Bugs B1). Nota de execução: `phoneNumberId` é global, então a correção foi descarte-se-ambíguo (2+ tenants na janela) em vez de filtro por número; spec §5.3 e runbook atualizados junto. | B1 | `mvn verify` + simular via `DevSimulacaoController` |
| **F2 — Adoção de MDC** ✅ #26 | `MDC.put` nos controllers (a receita com `Mdc.with` estava quebrada — Scope fecha antes do completion log; doc corrigido) + `wamid` no WebhookService + `notificacaoId` novo | A1, A2, A3 | `mvn verify` + conferir log dev com `pacienteId` |
| **F3 — DRY backend** ✅ #27 | `Fusos.ZONA_BR`, remover método morto, `contarPorStatus`, CORS headers | A4–A7 | `mvn verify` |
| **F4 — Camadas** ✅ #28 | HistoricoLembretes DTO→controller, lembretes() → ConsultaService, exceção do dashboard documentada em ARCHITECTURE §2.1 (+6ª cópia de ZoneId) | A8, A10, A9(doc) | `mvn verify` + smoke `/consultas` e histórico |
| **F5 — Formatadores frontend** ✅ #29 | `utils/formatadores.ts` + datas centralizadas | A13, A14 | `npm run lint && npm run build` + smoke visual |
| **F6** ✅ | `voltar()` split em `voltarParaEscolha`/`congelarPorLoop` + métrica `estadoOrfao()`. **A12 descartado** (códigos são app-gerados, cardinalidade ok) · **A15 pulado** (condicional por design) | A11 | `mvn verify` |

Critério de pronto comum: comportamento externo idêntico, testes existentes intactos, `mvn spotless:apply` antes do commit.

---

## 5. Bugs encontrados de passagem

**B1 — Fallback de webhook por telefone vaza entre tenants** · Prioridade **alta**
[LembreteEnviadoRepository.java:57-69](../backend/src/main/java/com/psiorganizer/whatsapp/LembreteEnviadoRepository.java:57) (`findByTelefoneRecente`) + [WebhookService.java:104-109](../backend/src/main/java/com/psiorganizer/whatsapp/WebhookService.java:104).
A mesma pessoa pode ser paciente de duas psicólogas (regra explícita em BUSINESS_RULES §1). Se ambas enviaram lembrete nas últimas 48h, a resposta sem `context.id` é atribuída ao lembrete **mais recente de qualquer tenant** — podendo confirmar/cancelar a consulta da psicóloga errada. O lookup primário por `wamid` é seguro (ID global da Meta); só o fallback é vulnerável.
**Correção sugerida:** extrair `metadata.phone_number_id` do payload, resolver a `ConfiguracaoWhatsapp` dona do número e filtrar o fallback por `le.psicologaId`. Se o deploy atual é single-tenant com um número só, o risco é latente — mas a query deve ser corrigida antes de qualquer segundo tenant ativo.

---

## 6. Decisões que sugiro rediscutir (não são dívida)

1. **A9** — formalizar exceção "projeção read-only pode nascer no service" (dashboard) em ARCHITECTURE.md, ou refatorar para conformidade total. Recomendo formalizar.
2. **Docs desatualizados** — ARCHITECTURE.md §2.2/§2.9 não citam `notificacao/` nem `whatsapp/` ("5 controllers / 18 endpoints" é pré-PR #20). Rodar `/psi-docs-sync` ou incluir na F2/F4.
3. **MockWhatsappClient nunca falha** — caminho de erro só é exercitável contra a Meta real. Se quiserem simular falha em dev, é feature nova (fora deste plano).
