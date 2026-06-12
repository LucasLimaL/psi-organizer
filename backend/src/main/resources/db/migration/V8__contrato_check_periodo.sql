-- Blindagem: período de contrato invertido (fim < início) nunca deve existir,
-- nem via SQL manual — a validação da API não basta. Corrige eventuais linhas
-- inválidas (dados de teste) antes de ativar a constraint.

UPDATE contrato SET data_fim = data_inicio WHERE data_fim < data_inicio;

ALTER TABLE contrato ADD CONSTRAINT ck_contrato_periodo
    CHECK (data_fim IS NULL OR data_fim >= data_inicio);
