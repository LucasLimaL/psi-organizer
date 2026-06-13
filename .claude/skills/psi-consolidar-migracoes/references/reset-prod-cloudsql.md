# Reset do banco de PROD via Cloud SQL Auth Proxy

Procedimento testado para limpar o banco de produção do psi-organizer (Cloud SQL Postgres) de forma isolada e segura, a partir da máquina do Lucas (Windows + PowerShell + Docker Desktop).

> **Pré-condição inalienável**: o gate de segurança da SKILL.md já foi confirmado — a aplicação **ainda não está em uso em produção** e os dados são só de teste. Este arquivo é o "como"; o "se pode" já foi decidido antes.

## Por que este caminho

- **Auth Proxy em rede Docker privada, sem publicar porta no host.** O proxy precisa escutar em `0.0.0.0` *dentro do container* para outro container alcançá-lo, mas como não há `-p`, nada fica exposto na rede da máquina. Expor o proxy no `0.0.0.0` do host (processo nativo) é bloqueado — e com razão: abriria a porta do banco de prod pra rede inteira.
- **`psql` via container Docker.** Não há `psql` nem proxy no PATH local; o container `postgres:16-alpine` traz o `psql` e fala com o proxy pelo nome de serviço da rede Docker.
- **Token OAuth do gcloud** (`gcloud auth print-access-token`) evita configurar Application Default Credentials.

## Passo a passo

Na máquina do Lucas, usar **`gcloud.cmd`** (não `gcloud`) no PowerShell.

### 1. Ler o runbook e confirmar contexto

Ler `docs/runbooks/infra-gcp.md` para os dados atuais (podem mudar de região). No momento da escrita:

| Item | Valor |
|---|---|
| Projeto | `psi-organizer-prod` (conta `lucas221910@gmail.com`) |
| Instância (connectionName) | `psi-organizer-prod:us-central1:psi-organizer-db-us` |
| Database / usuário | `psi_organizer` / `psi_prod` |
| Senha | Secret Manager: `db-password` |

```powershell
gcloud.cmd config get-value account    # esperado: lucas221910@gmail.com
gcloud.cmd config get-value project    # esperado: psi-organizer-prod
gcloud.cmd sql instances describe psi-organizer-db-us --project psi-organizer-prod --format="value(connectionName,state)"
```

### 2. Baixar o Cloud SQL Auth Proxy v2 (se ainda não tiver)

```powershell
$dir = "$env:TEMP\psi-sqlproxy"; New-Item -ItemType Directory -Force -Path $dir | Out-Null
$tag = (Invoke-RestMethod "https://api.github.com/repos/GoogleCloudPlatform/cloud-sql-proxy/releases/latest").tag_name
Invoke-WebRequest "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/$tag/cloud-sql-proxy.x64.exe" -OutFile "$dir\cloud-sql-proxy.exe"
```
(Pode rodar via container `gcr.io/cloud-sql-connectors/cloud-sql-proxy:<tag>` também — é o que os passos abaixo usam.)

### 3. Subir o proxy em rede Docker privada

```powershell
$ErrorActionPreference='Continue'   # docker manda NOTICE/avisos no stderr; não tratar como erro
$pw    = (gcloud.cmd secrets versions access latest --secret=db-password --project psi-organizer-prod).Trim()
$token = (gcloud.cmd auth print-access-token).Trim()

docker network create psi-prod-reset *> $null
try { docker rm -f psi-sqlproxy *> $null } catch {}
docker run -d --name psi-sqlproxy --network psi-prod-reset `
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.22.1 `
  --address 0.0.0.0 --port 5432 --token $token `
  "psi-organizer-prod:us-central1:psi-organizer-db-us" *> $null
Start-Sleep -Seconds 7
docker logs psi-sqlproxy 2>&1 | Select-Object -Last 5   # esperar "ready for new connections!"
```

> O `--address 0.0.0.0` aqui é **interno ao container** (rede `psi-prod-reset`). Sem `-p`, o host não expõe nada.

### 4. Inspecionar ANTES de dropar (corroboração do gate)

```powershell
# helper: roda psql num container efêmero na mesma rede
function Invoke-ProdPsql($sql) {
  docker run --rm --network psi-prod-reset -e PGPASSWORD=$pw postgres:16-alpine `
    psql -h psi-sqlproxy -p 5432 -U psi_prod -d psi_organizer -tA -c $sql 2>&1
}

Invoke-ProdPsql "select tablename from pg_tables where schemaname='public' order by 1;"
Invoke-ProdPsql "select version||' '||description||' '||success from flyway_schema_history order by installed_rank;"
# Contagem de dados — se vier dado real inesperado, PARAR e mostrar ao usuário:
Invoke-ProdPsql "select email||' | admin='||admin from psicologa order by criado_em;"
Invoke-ProdPsql "select 'pacientes='||count(*) from paciente union all select 'consultas='||count(*) from consulta;"
```

Esperado num ambiente pré-produção: poucas contas de teste/admin, `pacientes=0`, `consultas=0`.

### 5. Dropar todas as tabelas do schema public

Roda como `psi_prod`, que é dono das tabelas que aplicou — então pode dropá-las. Preserva o schema `public` e seus privilégios (importante no PG16, ver SKILL.md).

```powershell
$sql = "DO `$`$ DECLARE r RECORD; BEGIN FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END `$`$;"
docker run --rm --network psi-prod-reset -e PGPASSWORD=$pw postgres:16-alpine `
  psql -h psi-sqlproxy -p 5432 -U psi_prod -d psi_organizer -v ON_ERROR_STOP=1 -c $sql 2>&1
# Confirmar vazio (esperado: 0 tabelas)
Invoke-ProdPsql "select count(*)||' tabelas' from pg_tables where schemaname='public';"
```

Os `NOTICE: drop cascades to …` são informativos (Postgres avisando FKs em cascata), não erros.

### 6. Limpeza

```powershell
docker rm -f psi-sqlproxy *> $null
docker network rm psi-prod-reset *> $null
```

O token expira sozinho em ~1h; o binário/imagem do proxy podem ficar no cache pra próxima vez.

## Depois do wipe

O schema de prod está vazio (sem `flyway_schema_history`). O **próximo deploy** do backend (`gcloud builds submit` + `gcloud run deploy`, ver runbook) aplica a V1 consolidada do zero e recria os dados de bootstrap (usuário admin do dono etc.). Até o deploy, prod fica sem schema — combinar o timing com o merge da PR.
