-- Faturamento por ciclo de fechamento (estilo fatura de banco) substitui
-- o modelo de mensalidade por competência-calendário.
-- Decisões: dia de fechamento por psicólogo (1-31, escolhido no signup,
-- default 31 pra contas existentes); vencimento = fechamento + 7 corridos;
-- pro-rata = dias usados / dias do ciclo; fatura de valor 0 nasce paga;
-- cortesia de 1 mês (contrato R$ 0) pra contas novas e existentes.

ALTER TABLE psicologa ADD COLUMN dia_fechamento INT NOT NULL DEFAULT 31
    CHECK (dia_fechamento BETWEEN 1 AND 31);

-- Distingue bloqueio manual (ADMIN) do automático por situação irregular
-- (INADIMPLENCIA) — só o automático é desfeito sozinho na regularização.
ALTER TABLE psicologa ADD COLUMN bloqueada_motivo VARCHAR(20);
UPDATE psicologa SET bloqueada_motivo = 'ADMIN' WHERE bloqueada = TRUE;

-- Modelo antigo descartado (dados de teste, sem cliente pagante real).
DROP TABLE mensalidade;
DELETE FROM contrato;
ALTER TABLE contrato DROP COLUMN ativo;

-- Fatura por ciclo do psicólogo. Materializada apenas quando o ciclo FECHA;
-- ciclo corrente/próximo são prévias calculadas, nunca persistidas.
CREATE TABLE fatura (
    id              UUID PRIMARY KEY,
    psicologa_id    UUID NOT NULL REFERENCES psicologa(id),
    periodo_inicio  DATE NOT NULL,
    periodo_fim     DATE NOT NULL,
    vencimento      DATE NOT NULL,
    valor           NUMERIC(10,2) NOT NULL,
    paga            BOOLEAN NOT NULL DEFAULT FALSE,
    paga_em         TIMESTAMP,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fatura_psicologa_periodo UNIQUE (psicologa_id, periodo_fim)
);

CREATE INDEX idx_fatura_psicologa_paga ON fatura(psicologa_id, paga);

-- Rateio da fatura por contrato (troca/encerramento no meio do ciclo).
CREATE TABLE fatura_item (
    id              UUID PRIMARY KEY,
    fatura_id       UUID NOT NULL REFERENCES fatura(id) ON DELETE CASCADE,
    contrato_id     UUID NOT NULL REFERENCES contrato(id),
    periodo_inicio  DATE NOT NULL,
    periodo_fim     DATE NOT NULL,
    dias            INT NOT NULL,
    valor           NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_fatura_item_fatura ON fatura_item(fatura_id);

-- Cortesia de 1 mês pra contas existentes não-admin (mesma regra do signup).
INSERT INTO contrato (id, psicologa_id, data_inicio, data_fim, valor_mensal, criado_em)
SELECT gen_random_uuid(), id, CURRENT_DATE,
       (CURRENT_DATE + INTERVAL '1 month' - INTERVAL '1 day')::date, 0, NOW()
FROM psicologa WHERE admin = FALSE;
