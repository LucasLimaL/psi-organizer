-- psi-organizer: schema inicial consolidado (reset pré-produção em 2026-06-12,
-- squash das antigas V1–V10 — histórico no git se precisar de arqueologia).
-- Endereço é embeddable: colunas inline com prefixo endereco_*

-- =====================================================================
-- Psicóloga (tenant) — perfil, flags de admin/bloqueio, faturamento,
-- preferências e validação de e-mail
-- =====================================================================

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
    criado_em           TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Gestão SaaS: admin gerencia CONTAS (cadastro, bloqueio, cobrança) — nunca dados clínicos.
    admin               BOOLEAN      NOT NULL DEFAULT FALSE,
    bloqueada           BOOLEAN      NOT NULL DEFAULT FALSE,
    bloqueada_em        TIMESTAMP,
    -- Distingue bloqueio manual (ADMIN) do automático por situação irregular
    -- (INADIMPLENCIA) — só o automático é desfeito sozinho na regularização.
    bloqueada_motivo    VARCHAR(20),

    -- Faturamento por ciclo de fechamento (estilo fatura de banco): dia escolhido
    -- no signup; vencimento = fechamento + 7 corridos.
    dia_fechamento      INT          NOT NULL DEFAULT 31
                        CHECK (dia_fechamento BETWEEN 1 AND 31),

    -- Consultas com status FALTA entram (ou não) na cobrança da paciente.
    cobrar_faltas       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Validação de e-mail pra ativar a conta: signup nasce não validado, recebe
    -- link por e-mail (token de 24h) e só loga depois de validar. O token é
    -- guardado como hash SHA-256 — vazamento de banco não vira ativação.
    email_validado            BOOLEAN NOT NULL DEFAULT FALSE,
    validacao_token_hash      VARCHAR(64),
    validacao_token_expira_em TIMESTAMP
);

-- =====================================================================
-- Paciente
-- =====================================================================

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

    -- Opt-in pra lembretes via WhatsApp (LGPD: consentimento explícito).
    opt_in_whatsapp     BOOLEAN      NOT NULL DEFAULT FALSE,
    opt_in_whatsapp_em  TIMESTAMP,

    CONSTRAINT uq_paciente_cpf_por_psicologa UNIQUE (psicologa_id, cpf)
);

CREATE INDEX idx_paciente_psicologa ON paciente(psicologa_id);
CREATE INDEX idx_paciente_ativo     ON paciente(psicologa_id, ativo);

-- =====================================================================
-- Consulta — agenda + financeiro + confirmação pela paciente (WhatsApp)
-- =====================================================================

CREATE TABLE consulta (
    id                UUID PRIMARY KEY,
    psicologa_id      UUID NOT NULL REFERENCES psicologa(id),
    paciente_id       UUID NOT NULL REFERENCES paciente(id),
    inicio            TIMESTAMP    NOT NULL,
    duracao_minutos   INTEGER      NOT NULL CHECK (duracao_minutos > 0),
    valor             NUMERIC(10,2) NOT NULL,
    -- CANCELADA só pela paciente via WhatsApp no MVP.
    status            VARCHAR(20)  NOT NULL
                      CHECK (status IN ('AGENDADA','CONFIRMADA','REALIZADA','FALTA','CANCELADA')),
    pago              BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Instante da transição não-pago → pago; desmarcar como pago limpa a data.
    -- Viabiliza visão de caixa no futuro (a aba financeiro opera por competência).
    pago_em           TIMESTAMP,
    observacoes       TEXT,
    criado_em         TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Resposta da paciente ao lembrete via WhatsApp.
    status_confirmacao VARCHAR(32) NOT NULL DEFAULT 'AGUARDANDO'
                       CHECK (status_confirmacao IN ('AGUARDANDO','CONFIRMADA','CANCELADA_PELA_PACIENTE')),
    confirmada_pela_paciente_em TIMESTAMP
);

CREATE INDEX idx_consulta_psicologa_inicio ON consulta(psicologa_id, inicio);
CREATE INDEX idx_consulta_paciente         ON consulta(paciente_id);

-- =====================================================================
-- WhatsApp: lembretes (spec: docs/specs/whatsapp-lembrete.md)
-- =====================================================================

-- Configuração por psicóloga (1:1). O template da mensagem é registrado e
-- aprovado na plataforma da Meta (HSM) — não é editável, não fica no banco.
CREATE TABLE configuracao_whatsapp (
    id                       UUID PRIMARY KEY,
    psicologa_id             UUID NOT NULL UNIQUE REFERENCES psicologa(id),
    ativo                    BOOLEAN NOT NULL DEFAULT FALSE,
    horario_envio_lembrete   TIME NOT NULL DEFAULT '18:00',
    criado_em                TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Estado por consulta (1:1, idempotência via UNIQUE consulta_id)
CREATE TABLE lembrete_enviado (
    id                                UUID PRIMARY KEY,
    consulta_id                       UUID NOT NULL UNIQUE REFERENCES consulta(id) ON DELETE CASCADE,
    psicologa_id                      UUID NOT NULL REFERENCES psicologa(id),
    enviado_em                        TIMESTAMP,
    mensagem_id_externa               VARCHAR(128),
    status_entrega                    VARCHAR(16) NOT NULL DEFAULT 'PENDENTE'
                                      CHECK (status_entrega IN ('PENDENTE','ENVIADO','ENTREGUE','LIDO','FALHOU')),
    erro_codigo                       VARCHAR(32),
    erro_descricao                    TEXT,
    etapa                             VARCHAR(32) NOT NULL DEFAULT 'AGUARDANDO_ESCOLHA'
                                      CHECK (etapa IN ('AGUARDANDO_ESCOLHA','AGUARDANDO_CONFIRMACAO_DUPLA','FINALIZADO','EXPIRADO','CONGELADO_POR_LOOP')),
    escolha_inicial                   VARCHAR(16)
                                      CHECK (escolha_inicial IN ('CONFIRMAR','CANCELAR')),
    mensagem_confirmacao_dupla_id     VARCHAR(128),
    confirmacao_dupla_enviada_em      TIMESTAMP,
    confirmacao_dupla_tentativas      INTEGER NOT NULL DEFAULT 0 CHECK (confirmacao_dupla_tentativas >= 0 AND confirmacao_dupla_tentativas <= 3),
    ciclos_voltar                     INTEGER NOT NULL DEFAULT 0 CHECK (ciclos_voltar >= 0 AND ciclos_voltar <= 3),
    escolha_final                     VARCHAR(16)
                                      CHECK (escolha_final IN ('CONFIRMAR','CANCELAR')),
    finalizado_em                     TIMESTAMP
);

CREATE INDEX idx_lembrete_psicologa_etapa     ON lembrete_enviado(psicologa_id, etapa);
CREATE INDEX idx_lembrete_etapa_envio_2       ON lembrete_enviado(confirmacao_dupla_enviada_em)
    WHERE etapa = 'AGUARDANDO_CONFIRMACAO_DUPLA';
CREATE INDEX idx_lembrete_mensagem_externa    ON lembrete_enviado(mensagem_id_externa);
CREATE INDEX idx_lembrete_mensagem_dupla      ON lembrete_enviado(mensagem_confirmacao_dupla_id);

-- ShedLock: lock distribuído do scheduler de lembretes.
CREATE TABLE shedlock (
    name        VARCHAR(64)  NOT NULL,
    lock_until  TIMESTAMP    NOT NULL,
    locked_at   TIMESTAMP    NOT NULL,
    locked_by   VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);

-- =====================================================================
-- Notificações in-app (sino na AppBar) — payload polimórfico em JSON
-- =====================================================================

CREATE TABLE notificacao (
    id            UUID PRIMARY KEY,
    psicologa_id  UUID NOT NULL REFERENCES psicologa(id),
    tipo          VARCHAR(64) NOT NULL,
    payload_json  TEXT NOT NULL,
    criada_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    lida_em       TIMESTAMP
);

-- Index pra query "não lidas mais recentes da psi" do polling do frontend
CREATE INDEX idx_notificacao_psi_naolida_criada
    ON notificacao(psicologa_id, criada_em DESC)
    WHERE lida_em IS NULL;

-- =====================================================================
-- Gestão SaaS: contrato + fatura por ciclo (a psicóloga é a CLIENTE aqui)
-- =====================================================================

-- Vários contratos por psicóloga ao longo do tempo; no máximo um ativo
-- (vigência pelas datas; regra no service).
CREATE TABLE contrato (
    id            UUID PRIMARY KEY,
    psicologa_id  UUID NOT NULL REFERENCES psicologa(id),
    data_inicio   DATE NOT NULL,
    data_fim      DATE,
    valor_mensal  NUMERIC(10,2) NOT NULL CHECK (valor_mensal >= 0),
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_contrato_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX idx_contrato_psicologa ON contrato(psicologa_id);

-- Fatura por ciclo do psicólogo. Materializada apenas quando o ciclo FECHA;
-- ciclo corrente/próximo são prévias calculadas, nunca persistidas.
-- Pro-rata = dias usados / dias do ciclo; fatura de valor 0 nasce paga.
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

-- =====================================================================
-- Usuário administrador do dono do sistema — garantido em QUALQUER ambiente
-- (local/prod, banco novo ou existente). Conta exclusiva de gestão: dados
-- cadastrais são placeholders, CPF '00000000000' nunca colide com cadastro
-- real (signup valida dígito verificador). Senha: bcrypt; trocar via
-- PUT /me/senha no primeiro acesso em produção. Nasce com e-mail validado
-- (login exige validação).
-- =====================================================================

INSERT INTO psicologa (id, nome_completo, email, senha_hash, cpf, crp, telefone,
                       endereco_cep, endereco_logradouro, endereco_numero,
                       endereco_bairro, endereco_cidade, endereco_uf, admin,
                       email_validado)
SELECT '5a1c7e2b-94d3-4f6a-b8e1-3c2d9f0a6e47',
       'Lucas Lima Leão',
       'lucas_221910@hotmail.com',
       '$2a$10$jtOE1r1xJe6RymGaNCLx4.9.7v6ZSIxWLfpGRS/ivS1lLno6Qwvc6',
       '00000000000',
       'ADMIN',
       'N/A',
       '00000000', 'N/A', 'S/N', 'N/A', 'N/A', 'NA',
       TRUE,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM psicologa WHERE email = 'lucas_221910@hotmail.com'
);
