# newrelic-log-forwarder

Encaminha os logs do backend (Cloud Run) pro **New Relic Log API**, sem acoplar a
aplicação ao vendor. O backend só emite JSON em stdout; o Cloud Logging ingere; um
**Log Router sink** publica num **Pub/Sub topic**; esta **Cloud Function** lê e faz
`POST` no New Relic. É a peça única que conhece o vendor — coerente com a regra de
[docs/OBSERVABILITY.md](../../docs/OBSERVABILITY.md) ("coletor é decisão de deploy-time").

```
Cloud Run (stdout JSON) ─auto→ Cloud Logging ─sink→ Pub/Sub ─trigger→ Function ─HTTPS→ NR Log API
```

## Por que não shipping direto do app

Cloud Run com `min-instances=0` faz *CPU throttling* fora do request — uma thread
assíncrona de envio não tem garantia de flush antes da instância congelar, então logs
se perderiam. Além disso acoplaria o Spring ao New Relic. O sink mantém os logs
duráveis no Cloud Logging mesmo se o forward falhar (Pub/Sub faz retry).

## Custo

Free-tier friendly: Pub/Sub + invocações de Function ficam no free tier no volume MVP;
New Relic free dá 100 GB/mês de ingest. O sink filtra só `service_name=psi-organizer-api`
pra não mandar ruído de plataforma.

## Deploy

Pré-requisito — criar a conta New Relic free (US, sem cartão), pegar a **INGEST -
LICENSE** key e gravá-la no Secret Manager:

```powershell
"<SUA_INGEST_KEY>" | gcloud.cmd secrets create newrelic-license-key --data-file=- --project psi-organizer-prod
```

Depois rode o script (idempotente):

```powershell
cd infra/newrelic-log-forwarder
.\deploy.ps1            # US (default); use -NrRegion EU se a conta for EU
```

## Rotação da key

```powershell
"<NOVA_KEY>" | gcloud.cmd secrets versions add newrelic-license-key --data-file=- --project psi-organizer-prod
# a Function lê :latest a cada cold start; force um novo deploy pra pegar na hora
```

## Validação

1. Faça uma request na API (`/actuator/health` ou login).
2. New Relic → **Logs** → filtre `app:psi-organizer`.
3. As chaves do MDC (`requestId`, `psicologaId`, `pacienteId`...) aparecem como
   atributos filtráveis. Logs de plataforma vêm com `message` (textPayload).
