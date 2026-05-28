-- psi-organizer: schema inicial
-- Endereço é embeddable: colunas inline com prefixo endereco_*

CREATE TABLE psicologa (
    id                  UUID PRIMARY KEY,
    nome_completo       VARCHAR(200) NOT NULL,
    email               VARCHAR(200) NOT NULL UNIQUE,
    senha_hash          VARCHAR(255) NOT NULL,
    cpf                 VARCHAR(11)  NOT NULL UNIQUE,
    crp                 VARCHAR(50)  NOT NULL,
    telefone            VARCHAR(30)  NOT NULL,
    endereco_cep        VARCHAR(8)   NOT NULL,
    endereco_logradouro VARCHAR(200) NOT NULL,
    endereco_numero     VARCHAR(20)  NOT NULL,
    endereco_complemento VARCHAR(100),
    endereco_bairro     VARCHAR(100) NOT NULL,
    endereco_cidade     VARCHAR(100) NOT NULL,
    endereco_uf         VARCHAR(2)   NOT NULL,
    criado_em           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE paciente (
    id                  UUID PRIMARY KEY,
    psicologa_id        UUID NOT NULL REFERENCES psicologa(id),
    nome                VARCHAR(200) NOT NULL,
    cpf                 VARCHAR(11)  NOT NULL,
    data_nascimento     DATE         NOT NULL,
    telefone            VARCHAR(30)  NOT NULL,
    email               VARCHAR(200),
    endereco_cep        VARCHAR(8)   NOT NULL,
    endereco_logradouro VARCHAR(200) NOT NULL,
    endereco_numero     VARCHAR(20)  NOT NULL,
    endereco_complemento VARCHAR(100),
    endereco_bairro     VARCHAR(100) NOT NULL,
    endereco_cidade     VARCHAR(100) NOT NULL,
    endereco_uf         VARCHAR(2)   NOT NULL,
    valor_consulta      NUMERIC(10,2) NOT NULL,
    observacoes         TEXT,
    ativo               BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_paciente_cpf_por_psicologa UNIQUE (psicologa_id, cpf)
);

CREATE INDEX idx_paciente_psicologa ON paciente(psicologa_id);
CREATE INDEX idx_paciente_ativo     ON paciente(psicologa_id, ativo);

CREATE TABLE consulta (
    id                UUID PRIMARY KEY,
    psicologa_id      UUID NOT NULL REFERENCES psicologa(id),
    paciente_id       UUID NOT NULL REFERENCES paciente(id),
    inicio            TIMESTAMP    NOT NULL,
    duracao_minutos   INTEGER      NOT NULL CHECK (duracao_minutos > 0),
    valor             NUMERIC(10,2) NOT NULL,
    status            VARCHAR(20)  NOT NULL
                      CHECK (status IN ('AGENDADA','CONFIRMADA','REALIZADA','FALTA')),
    pago              BOOLEAN      NOT NULL DEFAULT FALSE,
    observacoes       TEXT,
    criado_em         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consulta_psicologa_inicio ON consulta(psicologa_id, inicio);
CREATE INDEX idx_consulta_paciente         ON consulta(paciente_id);
