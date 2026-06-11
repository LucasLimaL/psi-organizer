# Infra GCP — runbook

Provisionado em 2026-06-11. Decisão de arquitetura: Cloud Run + Cloud SQL + Firebase Hosting (mini-ADR na conversa de deploy; critério: menor custo de regime com banco gerenciado pra dado clínico). Região: **`us-central1`** (tier mais barato; SP foi descartada pra economizar ~US$ 5/mês — migração de região testada na prática, ver §Migração).

## Inventário

| Recurso | Nome | Observação |
|---|---|---|
| Projeto | `psi-organizer-prod` | conta `lucas221910@gmail.com` |
| Cloud Run | `psi-organizer-api` | `https://psi-organizer-api-283039307907.us-central1.run.app` · 1 vCPU/1Gi · min 0 / max 2 · `--cpu-boost` |
| Cloud SQL | `psi-organizer-db-us` | Postgres 16, `db-f1-micro`, 10GB HDD, backup 06:00 UTC · **~US$ 10–11/mês (cobra parado)** |
| Database/usuário | `psi_organizer` / `psi_prod` | senha em `db-password` (Secret Manager) |
| Cloud Scheduler | `whatsapp-tick-us` | `0 * * * *` UTC → `POST /internal/whatsapp/tick` com `X-Tick-Token` |
| Artifact Registry | `psi-organizer` (`us-central1`) | imagem `backend:vN` |
| Secrets | `jwt-secret`, `scheduler-tick-token`, `db-password` | replicação user-managed |
| Firebase Hosting | `psi-organizer-prod` | `https://psi-organizer-prod.web.app` |

Custo de regime estimado: **~US$ 11–13/mês** (Cloud SQL domina; Run/Hosting/Scheduler ~zero no volume MVP).

## Envs do Cloud Run

| Env | Valor/origem |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (desliga seed, fecha `/actuator/prometheus`, logs JSON) |
| `WHATSAPP_SCHEDULER_CRON` | `-` (cron interno OFF — quem dispara é o Cloud Scheduler) |
| `DB_URL` | `jdbc:postgresql:///psi_organizer?cloudSqlInstance=psi-organizer-prod:us-central1:psi-organizer-db-us&socketFactory=com.google.cloud.sql.postgres.SocketFactory` |
| `DB_USER` | `psi_prod` |
| `CORS_ALLOWED_ORIGINS` | `https://psi-organizer-prod.web.app,https://psi-organizer-prod.firebaseapp.com` |
| `DB_PASSWORD` / `JWT_SECRET` / `SCHEDULER_TICK_TOKEN` | secrets (`--set-secrets`) |
| `WHATSAPP_MOCK` | default `true` — **canal Meta ainda não ligado**; ligar = setar `false` + secrets `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` e registrar o webhook na Meta |

## Deploy de nova versão

```bash
# Backend (na pasta backend/) — vN = próxima tag
gcloud builds submit --tag us-central1-docker.pkg.dev/psi-organizer-prod/psi-organizer/backend:vN .
gcloud run deploy psi-organizer-api --region=us-central1 \
  --image=us-central1-docker.pkg.dev/psi-organizer-prod/psi-organizer/backend:vN
# (envs/secrets persistem entre deploys; só a imagem muda)

# Frontend (na pasta frontend/)
$env:VITE_API_BASE_URL = "https://psi-organizer-api-283039307907.us-central1.run.app"
npm run build
firebase deploy --only hosting --project psi-organizer-prod
```

## Troubleshooting

- **Site não fala com a API**: cheque CORS (`CORS_ALLOWED_ORIGINS` no serviço) e se o build do front foi feito com `VITE_API_BASE_URL` correto (é baked no bundle).
- **Lembrete não dispara**: Cloud Scheduler → job `whatsapp-tick-us` → última execução. Tick manual: `gcloud scheduler jobs run whatsapp-tick-us --location=us-central1`. Esperado: 204 no log do Cloud Run. 401 = token divergente do secret.
- **Erro de conexão com banco**: Cloud Run precisa do `--add-cloudsql-instances` e o SA default precisa de `roles/cloudsql.client` (já concedido).
- **Logs**: Cloud Logging ingere o JSON do stdout direto — filtre por `resource.type="cloud_run_revision"`; as chaves do MDC (requestId, psicologaId, pacienteId...) viram campos em `jsonPayload`.
- **Cold start** (~10–20s na 1ª request após idle): normal com min-instances=0. Incomodando, `--min-instances=1` (~+US$ 10/mês).

## Migração de região (procedimento testado SP → Iowa)

1. Criar Artifact Registry + `gcloud builds submit` na região nova.
2. Criar instância Cloud SQL nova + database + usuário (senha do Secret Manager — secrets são globais, não recriar).
3. `gcloud run deploy` na região nova mudando só o `cloudSqlInstance` do `DB_URL`.
4. Smoke test: `/actuator/health` UP + tick 204/401.
5. Job novo do Cloud Scheduler; rebuild do front com a URL nova + `firebase deploy`.
6. **Só então** apagar a região velha (Run, Scheduler, SQL, Registry).
7. Com dados reais: entre os passos 2 e 3, `gcloud sql export sql` → bucket → `gcloud sql import sql` (downtime de minutos no volume MVP).

## Pendências conhecidas

- WhatsApp em mock (ver tabela de envs).
- Banco de prod sem seed — primeira conta via `/signup` do site.
- Sem domínio próprio (URLs `*.run.app` / `*.web.app`); plugar domínio não exige retrabalho.
- Alerta de orçamento no billing: recomendado criar no console (Billing → Budgets) — não dá via gcloud sem API extra.
