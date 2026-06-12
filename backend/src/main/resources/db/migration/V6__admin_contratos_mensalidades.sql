-- Painel admin: flags na psicologa + contrato/mensalidade do SaaS.
-- Admin gerencia CONTAS (cadastro, bloqueio, cobrança) — nunca dados clínicos.

ALTER TABLE psicologa ADD COLUMN admin        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE psicologa ADD COLUMN bloqueada    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE psicologa ADD COLUMN bloqueada_em TIMESTAMP;

-- Contrato de uso do sistema (a psicóloga é a CLIENTE aqui).
-- Vários por psicóloga ao longo do tempo; no máximo um ativo (regra no service).
CREATE TABLE contrato (
    id            UUID PRIMARY KEY,
    psicologa_id  UUID NOT NULL REFERENCES psicologa(id),
    data_inicio   DATE NOT NULL,
    data_fim      DATE,
    valor_mensal  NUMERIC(10,2) NOT NULL CHECK (valor_mensal >= 0),
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contrato_psicologa ON contrato(psicologa_id);

-- Mensalidade materializada por competência (YYYY-MM). Valor é snapshot do
-- contrato na geração — reajuste não altera competências já lançadas.
CREATE TABLE mensalidade (
    id            UUID PRIMARY KEY,
    contrato_id   UUID NOT NULL REFERENCES contrato(id),
    psicologa_id  UUID NOT NULL REFERENCES psicologa(id),
    competencia   VARCHAR(7) NOT NULL,
    valor         NUMERIC(10,2) NOT NULL,
    paga          BOOLEAN NOT NULL DEFAULT FALSE,
    paga_em       TIMESTAMP,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mensalidade_contrato_competencia UNIQUE (contrato_id, competencia)
);

CREATE INDEX idx_mensalidade_psicologa ON mensalidade(psicologa_id, paga);

-- Usuário administrador do dono do sistema — garantido em QUALQUER ambiente
-- (local/prod, banco novo ou existente). Conta exclusiva de gestão: dados
-- cadastrais são placeholders, CPF '00000000000' nunca colide com cadastro
-- real (signup valida dígito verificador). Senha: bcrypt; trocar via
-- PUT /me/senha no primeiro acesso em produção.
INSERT INTO psicologa (id, nome_completo, email, senha_hash, cpf, crp, telefone,
                       endereco_cep, endereco_logradouro, endereco_numero,
                       endereco_bairro, endereco_cidade, endereco_uf, admin)
SELECT '5a1c7e2b-94d3-4f6a-b8e1-3c2d9f0a6e47',
       'Lucas Lima Leão',
       'lucas_221910@hotmail.com',
       '$2a$10$jtOE1r1xJe6RymGaNCLx4.9.7v6ZSIxWLfpGRS/ivS1lLno6Qwvc6',
       '00000000000',
       'ADMIN',
       'N/A',
       '00000000', 'N/A', 'S/N', 'N/A', 'N/A', 'NA',
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM psicologa WHERE email = 'lucas_221910@hotmail.com'
);
