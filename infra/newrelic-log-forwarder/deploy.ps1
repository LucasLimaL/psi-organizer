# Provisiona o pipeline Cloud Logging -> Pub/Sub -> Cloud Function -> New Relic.
# Idempotente: pode rodar de novo sem quebrar (checa existencia antes de criar).
# Requer a ingest key ja' no Secret Manager (secret `newrelic-license-key`).
# Na maquina do Lucas: usar gcloud.cmd no PowerShell.
#
# Uso:
#   .\deploy.ps1                      # US (default)
#   .\deploy.ps1 -NrRegion EU         # se a conta NR for EU

param(
  [ValidateSet('US', 'EU')]
  [string]$NrRegion = 'US'
)

# NB: nao usar $ErrorActionPreference='Stop' aqui - o gcloud escreve em stderr mesmo
# em sucesso, e sob 'Stop' isso vira erro terminante. Conferimos $LASTEXITCODE na mao.

$PROJECT  = 'psi-organizer-prod'
$REGION   = 'us-central1'
$SERVICE  = 'psi-organizer-api'          # so' os logs do backend
$TOPIC    = 'psi-logs-newrelic'
$SINK     = 'psi-logs-to-newrelic'
$FUNC     = 'newrelic-log-forwarder'
$SECRET   = 'newrelic-license-key'

if ($NrRegion -eq 'EU') { $NR_LOG_API = 'https://log-api.eu.newrelic.com/log/v1' }
else                    { $NR_LOG_API = 'https://log-api.newrelic.com/log/v1' }

function Assert-Ok($msg) {
  if ($LASTEXITCODE -ne 0) { Write-Host "FALHOU: $msg (exit $LASTEXITCODE)" -ForegroundColor Red; exit 1 }
}

Write-Host "==> 1. Habilitando APIs" -ForegroundColor Cyan
gcloud.cmd services enable `
  cloudfunctions.googleapis.com run.googleapis.com eventarc.googleapis.com `
  pubsub.googleapis.com cloudbuild.googleapis.com logging.googleapis.com `
  secretmanager.googleapis.com --project $PROJECT
Assert-Ok 'enable APIs'

Write-Host "==> 2. Conferindo secret da ingest key" -ForegroundColor Cyan
gcloud.cmd secrets describe $SECRET --project $PROJECT | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "FALHOU: secret '$SECRET' nao existe. Crie antes:" -ForegroundColor Red
  Write-Host '  "<INGEST_LICENSE>" | gcloud.cmd secrets create newrelic-license-key --data-file=- --project psi-organizer-prod' -ForegroundColor DarkGray
  exit 1
}

Write-Host "==> 3. Topico Pub/Sub" -ForegroundColor Cyan
gcloud.cmd pubsub topics describe $TOPIC --project $PROJECT | Out-Null
if ($LASTEXITCODE -ne 0) {
  gcloud.cmd pubsub topics create $TOPIC --project $PROJECT
  Assert-Ok 'criar topico'
} else { Write-Host '    (topico ja existe)' -ForegroundColor DarkGray }

Write-Host "==> 4. Deploy da Cloud Function (gen2) - pode levar alguns minutos" -ForegroundColor Cyan
gcloud.cmd functions deploy $FUNC `
  --gen2 --runtime nodejs20 --region $REGION `
  --source . --entry-point forwardLog `
  --trigger-topic $TOPIC `
  --set-env-vars "NR_LOG_API=$NR_LOG_API" `
  --set-secrets "NR_LICENSE_KEY=${SECRET}:latest" `
  --memory 256Mi --timeout 60s --max-instances 3 `
  --project $PROJECT
Assert-Ok 'deploy da function'

Write-Host "==> 5. Log Router sink -> Pub/Sub (so' o backend)" -ForegroundColor Cyan
$dest = "pubsub.googleapis.com/projects/$PROJECT/topics/$TOPIC"
$filter = "resource.type=`"cloud_run_revision`" AND resource.labels.service_name=`"$SERVICE`""
gcloud.cmd logging sinks describe $SINK --project $PROJECT | Out-Null
if ($LASTEXITCODE -ne 0) {
  gcloud.cmd logging sinks create $SINK $dest --log-filter $filter --project $PROJECT
  Assert-Ok 'criar sink'
} else {
  gcloud.cmd logging sinks update $SINK $dest --log-filter $filter --project $PROJECT
  Assert-Ok 'atualizar sink'
}

Write-Host "==> 6. Permissao: SA do sink publica no topico" -ForegroundColor Cyan
$writer = (gcloud.cmd logging sinks describe $SINK --project $PROJECT --format='value(writerIdentity)')
Assert-Ok 'ler writerIdentity'
gcloud.cmd pubsub topics add-iam-policy-binding $TOPIC `
  --member $writer --role roles/pubsub.publisher --project $PROJECT
Assert-Ok 'IAM binding'

Write-Host "==> Pronto. Faca uma request na API e veja em New Relic > Logs (app:psi-organizer)." -ForegroundColor Green
