-- Validação de e-mail para ativar a conta: signup nasce não validado, recebe
-- link por e-mail (token de 24h) e só consegue logar depois de validar.
-- O token é guardado como hash SHA-256 — vazamento de banco não vira ativação.

ALTER TABLE psicologa ADD COLUMN email_validado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE psicologa ADD COLUMN validacao_token_hash VARCHAR(64);
ALTER TABLE psicologa ADD COLUMN validacao_token_expira_em TIMESTAMP;

-- Contas existentes são confiáveis — nascem validadas.
UPDATE psicologa SET email_validado = TRUE;
