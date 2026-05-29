-- WhatsApp: feature de lembretes (PR A — fundação)
-- Spec: docs/specs/whatsapp-lembrete.md

-- 1) Configuração por psicóloga (1:1)
CREATE TABLE configuracao_whatsapp (
    id                       UUID PRIMARY KEY,
    psicologa_id             UUID NOT NULL UNIQUE REFERENCES psicologa(id),
    ativo                    BOOLEAN NOT NULL DEFAULT FALSE,
    template_mensagem        TEXT NOT NULL,
    horario_envio_lembrete   TIME NOT NULL DEFAULT '18:00',
    criado_em                TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) Estado por consulta (1:1, idempotência via UNIQUE consulta_id)
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

-- 3) Confirmação da paciente em consulta
--    Enum 'status' ganha 'CANCELADA' (estado novo, antes inexistente — só pela paciente no MVP).
ALTER TABLE consulta DROP CONSTRAINT consulta_status_check;
ALTER TABLE consulta ADD CONSTRAINT consulta_status_check
    CHECK (status IN ('AGENDADA','CONFIRMADA','REALIZADA','FALTA','CANCELADA'));

ALTER TABLE consulta
    ADD COLUMN status_confirmacao VARCHAR(32) NOT NULL DEFAULT 'AGUARDANDO'
        CHECK (status_confirmacao IN ('AGUARDANDO','CONFIRMADA','CANCELADA_PELA_PACIENTE')),
    ADD COLUMN confirmada_pela_paciente_em TIMESTAMP;

-- 4) Opt-in da paciente
ALTER TABLE paciente
    ADD COLUMN opt_in_whatsapp     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN opt_in_whatsapp_em  TIMESTAMP;

-- 5) ShedLock (instalado já na PR A; uso entra na PR B)
CREATE TABLE shedlock (
    name        VARCHAR(64)  NOT NULL,
    lock_until  TIMESTAMP    NOT NULL,
    locked_at   TIMESTAMP    NOT NULL,
    locked_by   VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
