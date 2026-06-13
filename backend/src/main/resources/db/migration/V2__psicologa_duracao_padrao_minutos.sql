-- Duração padrão das consultas, por psicóloga — pré-preenche o campo ao criar
-- uma consulta nova (a psicóloga ainda pode alterar na hora). Default 50 (sessão
-- típica). Contas existentes herdam 50 pelo DEFAULT.
ALTER TABLE psicologa
    ADD COLUMN duracao_padrao_minutos INT NOT NULL DEFAULT 50
        CHECK (duracao_padrao_minutos BETWEEN 5 AND 600);
