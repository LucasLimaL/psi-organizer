# Runbook — E-mail de validação de conta (SMTP Gmail)

O backend envia e-mail de validação de conta no signup (`ValidacaoEmailService`).
Há dois modos, selecionados por `psi.email.modo`:

| Modo | Comportamento | Quando usar |
|---|---|---|
| `log` (default) | Não envia nada — escreve o link de validação no log do backend | Dev local, CI |
| `smtp` | Envia de verdade via `spring.mail.*` | Produção |

## Configurar o Gmail (uma vez)

1. Use uma conta Google dedicada (ex: `psiorganizer.noreply@gmail.com`) — evita
   misturar com conta pessoal e facilita rotação.
2. Ative **verificação em duas etapas** na conta Google (obrigatório pra senha de app).
3. Crie uma **senha de app**: Conta Google → Segurança → Verificação em duas
   etapas → Senhas de app → "Outro" → nomeie `psi-organizer`. Guarde os 16
   caracteres — é o `SMTP_PASSWORD`.

> Limite do Gmail: ~500 destinatários/dia. Suficiente pro volume atual; se o
> SaaS crescer, migrar pra um provedor transacional (Resend/SendGrid/SES).

## Variáveis de ambiente (Cloud Run)

| Env | Valor | Secret? |
|---|---|---|
| `EMAIL_MODO` | `smtp` | não |
| `EMAIL_REMETENTE` | `psiorganizer.noreply@gmail.com` | não |
| `SMTP_USERNAME` | mesma conta do remetente | não |
| `SMTP_PASSWORD` | senha de app de 16 chars | **sim — Secret Manager** |
| `FRONTEND_URL` | `https://psi-organizer-prod.web.app` | não |
| `AUTH_EMAILS_PRE_VALIDADOS` | (opcional) CSV; default `claude-audit@psi.com` | não |

`SMTP_HOST`/`SMTP_PORT` têm default `smtp.gmail.com:587` (STARTTLS) — só
sobrescrever se trocar de provedor.

Aplicar no serviço (exemplo):

```bash
gcloud secrets create psi-smtp-password --replication-policy=automatic
printf '%s' '<senha-de-app>' | gcloud secrets versions add psi-smtp-password --data-file=-

gcloud run services update psi-organizer-api \
  --region us-central1 \
  --update-env-vars EMAIL_MODO=smtp,EMAIL_REMETENTE=psiorganizer.noreply@gmail.com,SMTP_USERNAME=psiorganizer.noreply@gmail.com,FRONTEND_URL=https://psi-organizer-prod.web.app \
  --update-secrets SMTP_PASSWORD=psi-smtp-password:latest
```

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `535-5.7.8 Username and Password not accepted` | Senha de app errada/revogada, ou 2FA desligado | Gerar nova senha de app e atualizar o secret |
| Signup retorna 500 e a conta foi criada | SMTP falhou no envio | Usuária pede reenvio na tela de login (`/auth/reenviar-validacao`); investigar o log ERROR |
| E-mail não chega | Spam, ou limite diário do Gmail estourado | Conferir spam; checar volume; considerar provedor transacional |
| Link abre "inválido ou expirado" | Token >24h ou reenvio gerou token novo (o antigo invalida) | Pedir reenvio |

## Conta da auditoria noturna

A Routine cloud cria `claude-audit@psi.com` via `POST /auth/signup`. Esse e-mail
está em `psi.auth.emails-pre-validados` (default), então a conta **nasce
validada** e o fluxo da Routine segue funcionando sem caixa de entrada.
