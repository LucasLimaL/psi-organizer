---
name: psi-consolidar-migracoes
description: Consolida (faz squash de) todas as migrações Flyway do psi-organizer numa única V1 com o schema final, recria o banco de dev local, valida (Flyway + Hibernate validate + seed + mvn verify), abre PR e limpa o banco no Cloud SQL antes do deploy. Esta operação APAGA TODO O BANCO de todo ambiente onde as migrações já rodaram — inclusive PROD assim que a branch for mergeada e deployada — então só faz sentido enquanto a aplicação ainda não tem dados reais em produção. A validação de que prod não está em uso é SEMPRE obrigatória.
when_to_use: Invocar quando o usuário pedir para consolidar, resetar, "squashar", limpar ou unificar as migrações do banco — exemplos "consolida as migrações", "reseta as migrations", "junta tudo numa V1", "limpa o histórico de migração". SEMPRE lembrar que apaga o banco inteiro e SEMPRE confirmar que a app ainda não está em produção com dados reais — mesmo que o usuário diga "só local", porque consolidar local inevitavelmente quebra prod quando a branch for mergeada e deployada (o histórico Flyway antigo de prod conflita com a nova V1). NÃO invocar para criar UMA migração nova (isso é fluxo normal de feature), nem para rodar migração pendente.
argument-hint: [prod-agora | prod-no-deploy]
---

# psi-consolidar-migracoes

Objetivo: transformar uma pilha de migrações Flyway (`V1__…`, `V2__…`, … `VN__…`) numa **única `V1__schema_inicial.sql`** que descreve o schema final, sem perder nenhuma estrutura, e deixar todos os ambientes alvo num estado limpo onde essa V1 aplica do zero.

Isso só é seguro **enquanto o produto não tem dados reais em produção**. Flyway grava o checksum de cada migração aplicada em `flyway_schema_history`; reescrever a V1 e remover V2–VN faz o histórico antigo conflitar com o novo conjunto. A única forma de o Flyway aceitar o novo conjunto é o schema estar **vazio** (sem `flyway_schema_history`). Por isso a consolidação **obriga a apagar o banco** de cada ambiente onde já tinha rodado.

### Não existe "resetar só local"

Mesmo que o pedido seja "consolida só no meu ambiente", a operação **inevitavelmente atinge produção**: a branch um dia vira merge na `main` e a `main` um dia é deployada. No deploy, o jar leva só a nova V1, mas o `flyway_schema_history` de prod ainda tem V1–VN registradas — o Flyway detecta "applied migration not resolved locally" + checksum divergente da V1 e **a app não sobe em PROD**. Logo:

- A pergunta "prod já está em uso com dados reais?" **sempre** precisa ser respondida — ela decide se a consolidação pode acontecer *de todo*, não apenas se "também mexo em prod agora".
- A única variável de verdade é o **timing do wipe de prod**: junto com a consolidação (`prod-agora`) ou adiado para a hora do deploy (`prod-no-deploy`). Adiar é legítimo (você pode mergear sem deployar), mas o wipe **tem que** preceder ou acompanhar o deploy — nunca é opcional.

## Argumentos

| Arg | Obrigatório? | Descrição |
|---|---|---|
| `quando_prod` | não | Timing do wipe de prod. `prod-agora` (default): consolida, valida local, abre PR, limpa prod e mergeia no mesmo fluxo. `prod-no-deploy`: faz a consolidação + PR agora e **deixa o wipe de prod explicitamente pendente para a hora do deploy** (re-invocar a skill, ou seguir [references/reset-prod-cloudsql.md](references/reset-prod-cloudsql.md) na janela do deploy). Em ambos os casos o gate da Etapa 0 roda. |

## ⚠️ Etapa 0 — Gate de segurança (SEMPRE, antes de qualquer coisa)

Esta etapa não é opcional e não pode ser pulada nem quando o usuário parece com pressa, **nem quando o pedido é "só local"** — porque, como explicado acima, não existe consolidação que fique só no local.

1. **Avisar, com todas as letras**, que a consolidação **apaga todo o conteúdo do banco** de cada ambiente onde as migrações já rodaram — incluindo PROD no próximo deploy (todas as tabelas + histórico Flyway). Não é um "talvez": é o mecanismo. Quem aprova precisa entender isso.

2. **Confirmar explicitamente com o usuário que a aplicação ainda NÃO está em uso em produção** — sem clientes reais, sem dados de pacientes reais. Isto vale **sempre**, independente de `prod-agora` ou `prod-no-deploy`, porque é o que determina se a consolidação é permitida de todo. É uma pergunta direta, não uma suposição. Se a resposta for "já está em produção" ou ambígua → **ABORTAR** e explicar que consolidar migração com dados reais exige outra abordagem (nova migração aditiva, nunca reescrita da V1).

3. **Corroborar com os dados**, não só com a palavra: na hora de conectar em prod (Etapa 4), antes de dropar nada, contar registros das tabelas de domínio (`select count(*) from paciente`, `from consulta`, listar `psicologa.email`). Se aparecer volume/identidade de dado real incompatível com "ambiente de teste", **parar e mostrar ao usuário** o que foi encontrado em vez de prosseguir. (No `prod-no-deploy`, essa corroboração acontece quando o wipe for de fato executado, na janela do deploy — mas a confirmação verbal do item 2 é feita agora, antes de mexer no repo.)

4. Só depois de (1) e (2) confirmados, seguir para a Etapa 1.

## Etapa 1 — Levantamento das migrações

1. Listar `backend/src/main/resources/db/migration/V*.sql`.
2. **Ler todas**, em ordem de versão. A consolidação tem que preservar o estado final — toda coluna, índice, constraint, `CHECK`, tabela e `INSERT` idempotente de bootstrap que sobreviveu até a última versão precisa existir na V1 nova.
3. Prestar atenção a migrações que **alteram** o que veio antes (`ALTER … DROP COLUMN`, `DROP TABLE`, `ALTER … ADD CONSTRAINT`, troca de enum em `CHECK`): o efeito líquido é o que vai pra V1. Não recrie o que foi descartado no meio do caminho.

## Etapa 2 — Consolidação no repositório

1. Criar branch a partir de `main` limpa (ex.: `chore/reset-migracoes`).
2. **Reescrever `V1__schema_inicial.sql`** como o schema final consolidado:
   - Um cabeçalho deixando claro que é um squash e a data, apontando o git pra arqueologia.
   - Agrupar por domínio (psicologa, paciente, consulta, whatsapp, notificacao, admin/faturamento…), preservando os comentários de contexto de cada feature — eles explicam o *porquê* de colunas não óbvias e têm valor de documentação.
   - Colunas que nasceram com `DEFAULT`/backfill numa migração tardia (ex.: `email_validado`, `dia_fechamento`): na V1 nova elas já nascem na definição da tabela. **Cuidado com backfills que numa V tardia ajustavam linhas pré-existentes** (ex.: `UPDATE psicologa SET email_validado = TRUE`): se um `INSERT` de bootstrap depende desse estado, replicar o valor **direto no INSERT** (a migração consolidada roda uma vez só, não há "linha pré-existente" pra atualizar depois).
3. `git rm` das migrações V2…VN.
4. **Sincronizar referências nas docs**: procurar menções às versões antigas (`grep -rn "V[0-9]\+__" docs/` e nomes como "migração V5") e atualizar para `V1__schema_inicial.sql`. `docs/BUSINESS_RULES.md` costuma citar a migração que ancora cada regra.
5. **Revisar o seed / bootstrap**: se a V1 consolidada passou a inserir uma linha que antes só existia numa migração tardia (ex.: o usuário admin do dono), qualquer checagem de "banco vazio" baseada em `count() > 0` vai passar a **sempre detectar banco populado** e nunca semear. Ajustar a checagem para ignorar as linhas inseridas pela própria migração (ex.: `existsByAdminFalse()` em vez de `count()`). Esse é um efeito colateral fácil de passar batido e quebra o seed de dev silenciosamente.

## Etapa 3 — Verificação local (sempre, mesmo quando o alvo é prod)

Recriar o Postgres de dev do zero e provar que a V1 única aplica e a app sobe:

```powershell
docker compose -f <repo>/docker-compose.yml down -v   # -v zera o volume → banco limpo
docker compose -f <repo>/docker-compose.yml up -d
cd <repo>/backend; mvn clean -q
mvn spring-boot:run                                    # em background; acompanhar o log
```

No log, confirmar nesta ordem:
- `Successfully validated 1 migration` (e **não** 10) — o conjunto é só a V1.
- `Migrating schema "public" to version "1 - schema inicial"` → `Successfully applied 1 migration`.
- `Started PsiOrganizerApplication` — Hibernate em `validate` aceitou o schema (entities batem com a V1).
- `SeedDataRunner` rodou e inseriu os dados amostrais (se não-prod).

Parar a app (matar o processo na porta 8080), formatar e validar:

```powershell
mvn spotless:apply -q
mvn verify -q          # spotless:check + lint
```

> Gotchas de PowerShell aqui: o `spring-boot:run` ocupa a 8080 — antes de re-subir, matar quem estiver escutando (`Get-NetTCPConnection -LocalPort 8080 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`). E o `mvn` joga warnings no stderr; não trate exit-code de warning como falha.

Commitar, pushar por refspec explícito e abrir a PR:

```powershell
git push -u origin <branch>:<branch>
gh pr create --base main --title "chore(db): reseta migracoes — squash …" --body "…"
```

O corpo da PR **deve** incluir um aviso de que o banco de prod precisa ser recriado antes do próximo deploy (o `flyway_schema_history` antigo conflita com a nova V1).

**Se o modo é `prod-no-deploy`**, parar aqui — mas **não** como se estivesse "concluído e seguro". Deixar explícito no resumo (Etapa 6) que **o deploy desta branch vai quebrar prod até o wipe ser feito**, e que o wipe (Etapa 4) é uma pendência obrigatória pra janela do deploy. Não mergear ainda, ou mergear deixando claro que ninguém deve deployar antes do wipe.

## Etapa 4 — Reset do banco de PROD

Acontece agora (modo `prod-agora`) ou na janela do deploy (modo `prod-no-deploy`) — mas **sempre antes ou junto do deploy**, nunca depois. Reconfirmar o gate da Etapa 0 (app não está em produção) **antes de conectar**. Então seguir o procedimento detalhado em **[references/reset-prod-cloudsql.md](references/reset-prod-cloudsql.md)** — ele cobre: ler o runbook de infra pra pegar instância/usuário/secret, subir o Cloud SQL Auth Proxy numa rede Docker privada (sem expor porta no host), inspecionar tabelas + histórico + **contagem de dados** (corroboração da Etapa 0), dropar todas as tabelas do schema `public` como o usuário da app, e limpar o proxy.

A escolha de **dropar as tabelas** (em vez de deletar/recriar o database via gcloud) é deliberada: preserva os privilégios já concedidos ao usuário da app sobre o schema `public`. No Postgres 16 o `public` não dá `CREATE` ao `PUBLIC` por padrão, então um database recriado do zero poderia deixar o usuário da app sem permissão de criar tabelas e o deploy seguinte quebraria.

## Etapa 5 — Merge + deploy

Com prod limpo (ou com o wipe agendado e combinado para imediatamente antes do deploy) e a PR verde, mergear. Preferir o protocolo do projeto: invocar **`psi-pr-merge-seguro <pr>`** (faz multi-tenant check, gestão de stack, squash+delete, sync main). Se o usuário não quiser o protocolo, `gh pr merge <pr> --squash --delete-branch`.

**Ordem que não pode inverter:** o wipe de prod (Etapa 4) precede ou acompanha o deploy. Deployar a nova V1 contra um prod ainda populado com o histórico antigo = app não sobe. Se o wipe foi adiado, lembrar o usuário disso no momento de deployar.

## Etapa 6 — Resumo final

Reportar de forma fiel:
- ✅ Migrações consolidadas (N → 1) e docs sincronizadas.
- ✅ Verificação local: Flyway aplicou a V1, `validate` passou, seed rodou, `mvn verify` ok.
- ✅ PR aberta/mergeada (com link).
- [modo `prod-agora`] ✅ Banco de prod limpo (X tabelas dropadas; dados eram só de teste — listar o que foi encontrado). O próximo deploy aplica a V1 do zero e recria os dados de bootstrap (admin etc.).
- [modo `prod-no-deploy`] ⚠️ **Wipe de prod PENDENTE** — a branch não pode ser deployada antes de rodar a Etapa 4. Deixar isso em destaque, não enterrado no resumo.
- **Próximo passo**: confirmar com o usuário o timing do deploy + wipe. Se há artefato com prazo (janela de deploy combinada), pode valer um `/schedule` pra lembrar do wipe pendente.

## Quando ABORTAR

- App **já em produção** com dados reais (Etapa 0) → abortar; orientar migração aditiva.
- Contagem de dados em prod revela dado real inesperado (Etapa 4) → parar e mostrar ao usuário.
- `validate` reclama de divergência entity↔schema na Etapa 3 → a V1 consolidada não reflete o que as entities esperam; corrigir a V1 antes de seguir, nunca relaxar o `validate`.

## Restrições

- **Nunca** apagar banco (local ou prod) sem o aviso explícito + confirmação de que a app não está em produção. Essa confirmação é **sempre** exigida, mesmo no pedido "só local" — porque consolidar é intrinsecamente uma mudança que atinge prod no deploy.
- **Nunca** deployar a nova V1 sem antes ter limpado o banco de prod. Wipe precede ou acompanha o deploy.
- **Nunca** expor o Cloud SQL Auth Proxy no `0.0.0.0` do host. Rodá-lo dentro de rede Docker privada, sem publicar porta.
- Em prod, **dropar tabelas** preservando o schema; não deletar/recriar o database via gcloud (risco de privilégio no PG16).
- Idioma pt-BR em tudo (V1, comentários, commit, PR, docs).
