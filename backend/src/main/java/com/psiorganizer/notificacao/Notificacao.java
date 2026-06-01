package com.psiorganizer.notificacao;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notificacao")
public class Notificacao {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "tipo", nullable = false, length = 64)
    private String tipo;

    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJson;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm;

    @Column(name = "lida_em")
    private Instant lidaEm;

    protected Notificacao() {}

    public Notificacao(UUID id, UUID psicologaId, String tipo, String payloadJson) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.tipo = tipo;
        this.payloadJson = payloadJson;
        this.criadaEm = Instant.now();
    }

    public void marcarLida() {
        if (this.lidaEm == null) this.lidaEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public String getTipo() { return tipo; }
    public String getPayloadJson() { return payloadJson; }
    public Instant getCriadaEm() { return criadaEm; }
    public Instant getLidaEm() { return lidaEm; }
}
