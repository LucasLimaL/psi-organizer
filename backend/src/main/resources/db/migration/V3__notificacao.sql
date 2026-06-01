-- Notificações in-app (sino na AppBar). Por enquanto só usado pra alertar a psi
-- quando paciente cancela consulta via WhatsApp (PR C do spec WhatsApp).
-- Pode acomodar outros tipos no futuro — daí o campo polimórfico payload_json.

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
