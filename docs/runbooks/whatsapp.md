# Runbook — Lembretes WhatsApp

Operação do canal WhatsApp: o que checar quando algo trava, como observar saúde, como rotacionar credenciais. Referência rápida — o spec completo fica em [docs/specs/whatsapp-lembrete.md](../specs/whatsapp-lembrete.md).

---

## Variáveis de ambiente

| Variável | Quando precisa | Como obter |
|---|---|---|
| `WHATSAPP_MOCK` | sempre (default `true`) | set `false` quando quiser usar Meta real |
| `WHATSAPP_PHONE_NUMBER_ID` | `mock=false` | painel Meta → WhatsApp → API Setup → "Phone number ID" |
| `WHATSAPP_ACCESS_TOKEN` | `mock=false` | painel Meta → System User → Generate Token |
| `WHATSAPP_APP_SECRET` | webhook recebendo eventos reais | painel Meta → App Settings → Basic → "App Secret" (Show) |
| `WHATSAPP_VERIFY_TOKEN` | webhook (handshake) | inventado por nós — qualquer string |
| `WHATSAPP_GRAPH_API_VERSION` | default `v21.0` | revisar 1x/trimestre |
| `WHATSAPP_TEMPLATE_LEMBRETE_NOME` | default `lembrete_consulta_v1` | só sobrescreva se renomear o template Meta |
| `WHATSAPP_TEMPLATE_LEMBRETE_IDIOMA` | default `pt_BR` | idem |
| `WHATSAPP_SCHEDULER_CRON` | default `0 0 * * * *` (UTC) | dev: `0 */2 * * * *` (cada 2 min) |
| `WHATSAPP_DEV_TOOLS` | default `false` | `true` ativa `/dev/whatsapp/simular-resposta` |

**Nunca** subir `mock=false` em produção sem `WHATSAPP_APP_SECRET` preenchido — o webhook rejeita todo POST com 401 e os eventos ficam sem processar.

---

## Saúde do canal

### Endpoints de observação

- `GET /actuator/health` — UP/DOWN
- `GET /actuator/prometheus` — métricas (scraping pull)
- `GET /swagger-ui.html` — docs interativos
- `GET /me/whatsapp/lembretes?inicioEm=YYYY-MM-DD&fimEm=...` — auditoria via UI também em `/configuracoes/whatsapp/historico`

### Métricas-chave a olhar

| Métrica | Tags | Quando preocupar |
|---|---|---|
| `whatsapp.enviados.total` | `tipo=msg1\|msg2\|msg3` | queda brusca em msg1 = scheduler ou Meta caiu |
| `whatsapp.confirmacao_dupla.reenviados.total` | — | acima de ~20% dos msg1 = mensagens iniciais não estão entregando direito |
| `whatsapp.expirados.total` | — | spike pode indicar problema sistêmico de entrega |
| `whatsapp.congelados_loop.total` | — | qualquer valor é pouco; spike = UX confusa |
| `whatsapp.falhas.total` | `codigo` | qualquer valor > 0 em `http_4xx` exige investigação imediata |
| `whatsapp.pulados.total` | `motivo=opt_in_ausente\|telefone_invalido\|paciente_inativo` | normal ter alguns; valor anormalmente alto = problema de dados |
| `whatsapp.respostas.total` | `etapa, escolha` | distribuição mostra adesão das pacientes ao fluxo |
| `whatsapp.eventos.orfaos.total` | — | webhook recebendo evento sem `context.id` resolvível — investigar |
| `whatsapp.eventos.ambiguos.total` | — | fallback por telefone achou lembretes ativos de 2+ psicólogas pra mesma paciente; resposta descartada por segurança — se recorrente, orientar paciente a usar os botões |
| `whatsapp.estados.orfaos.total` | — | lembrete cuja consulta/paciente foi deletado após o envio; flow segue sem ação — spike indica deleções em massa ou bug de integridade |
| `whatsapp.webhook.latencia` | — | p99 acima de 2s = Meta vai retentar agressivamente |

> **Deploy Cloud Run:** o cron interno (`@Scheduled`) é desligado com `WHATSAPP_SCHEDULER_CRON="-"`; quem dispara o tick é o **Cloud Scheduler** chamando `POST /internal/whatsapp/tick` (header `X-Tick-Token` = `SCHEDULER_TICK_TOKEN`). Tick não rodando? Cheque o job no Cloud Scheduler e o token antes de suspeitar do app. ShedLock segue prevenindo disparo duplo.

### Logs estruturados

Prefixos no log:
- `[scheduler]` — execução do cron
- `[scheduler-a]` / `[scheduler-b]` / `[scheduler-c]` — passos individuais
- `[lembrete-enviado]` — Msg 1 OK
- `[lembrete-falhou]` — Msg 1 erro Meta
- `[lembrete-pulado]` — skip rule disparou
- `[maquina]` — transição da máquina de estados
- `[webhook]` — handshake/HMAC/evento

Filtrar logs por `consulta_id` no observability stack identifica todo o ciclo de vida de 1 lembrete.

---

## Procedimentos comuns

### Token expirou (4xx código 190 da Meta)

Sintoma: `whatsapp.falhas.total{codigo=http_401}` subindo, ou log `[lembrete-falhou] codigo=http_401`.

Causa: token de System User foi revogado, ou era token de teste de 24h.

Ação:
1. Painel Meta → WhatsApp → API Setup → **Generate access token** (ou System User → Generate Token sem expiração)
2. Atualizar `WHATSAPP_ACCESS_TOKEN` no host
3. Reiniciar backend
4. Conferir `whatsapp.enviados.total{tipo=msg1}` retomando

### Template foi despromovido pela Meta

Sintoma: `whatsapp.falhas.total{codigo=http_400}` + logs com `132xxx` no `erro_codigo`.

Causa: template `lembrete_consulta_v1` saiu de `APPROVED` pra `PAUSED`/`PENDING`/`REJECTED`.

Ação:
1. Painel Meta → WhatsApp Manager → Message templates → status do `lembrete_consulta_v1`
2. Se `PAUSED`: reativar (Meta às vezes pausa por baixa taxa de leitura)
3. Se `REJECTED`: ajustar texto, re-submeter, esperar aprovação (1-3 dias)
4. Enquanto isso: psis veem chip cinza "Lembrete será enviado" na agenda, sem disparo. UI deve avisar com banner — futuro item

### Spike de `whatsapp.eventos.orfaos.total`

Sintoma: lots de eventos Meta sem lembrete correspondente.

Causa provável: webhook recebendo eventos de números que não estão no `lembrete_enviado` da app — ex: paciente respondeu fora da janela 48h, ou alguém mandou mensagem aleatória pro número da plataforma.

Ação: investigar payload no log (`[webhook] resposta_orfa`) pra entender padrão. Se for spam genuíno, considerar pequena lista de allowlist no controller. Pra MVP, deixar passar e ignorar.

### Pacientes não recebem lembrete

Em ordem:
1. **`paciente.opt_in_whatsapp = true`**? Senão o sistema pula com `[lembrete-pulado] motivo=opt_in_ausente`. UI deve mostrar isso no detalhe do paciente.
2. **`paciente.telefone` em E.164 válido**? Pula com `motivo=telefone_invalido`.
3. **`configuracao_whatsapp.ativo = true`** pra essa psi? Senão o scheduler nem pega.
4. **Hora do cron + janela 07-20h SP**? Fora disso o scheduler retorna em <10ms.
5. **`consulta.status_confirmacao = AGUARDANDO`** + `status IN (AGENDADA, CONFIRMADA)`? Outras combinações são puladas.
6. **`consulta.inicio` entre amanhã 00:00 e 23:59:59 SP** (passo a) ou criada após horário escolhido (passo b)? Outras consultas não entram no escopo do cron atual.

---

## Pausa de emergência

### Pausar lembretes de **uma psi específica**
UI → `/configuracoes/whatsapp` → desliga o toggle. Scheduler para de enviar pra essa psi imediatamente (na próxima execução do cron).

### Pausar **todo o canal**
Set `WHATSAPP_MOCK=true` + reiniciar backend. Todas as chamadas pra Meta viram log local (Mock). Banco continua persistindo `lembrete_enviado` com `mock-id`, sem custo nem efeito real.

Pra reativar: `WHATSAPP_MOCK=false` + reiniciar.

---

## Custo

- `UTILITY` BR ≈ R$0,04 por Msg 1
- Msg 2 / Msg 3 / retries → grátis dentro da service window 24h
- Projeção MVP §8 do spec: ~R$88/mês a 10 psi × 10 pacientes/dia

Tracking: `whatsapp.enviados.total{tipo=msg1}` × R$0,04 = custo mensal aproximado. Msg 2/3 não contam.

Quando reavaliar:
- 50+ psis ativas (R$440+/mês)
- Mudança de preço Meta (aviso 90 dias)
- Adoção futura de `MARKETING` ou `AUTHENTICATION`

---

## Procedimentos não-cobertos por este runbook

- **Embedded Signup** (psi com número próprio) — fora do MVP, descrito em [§11 do spec](../specs/whatsapp-lembrete.md#114-follow-ups-registrados-não-bloqueiam-mvp).
- **Mudança do CNPJ** da Meta Business Account — exige re-verificação de negócio, 1-2 semanas.
- **Rotação de `WHATSAPP_APP_SECRET`** — exige reconfigurar webhook na Meta + atualizar env var + reiniciar. Planejar janela curta.
