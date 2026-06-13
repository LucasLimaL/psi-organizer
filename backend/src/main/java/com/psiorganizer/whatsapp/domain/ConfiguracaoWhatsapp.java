package com.psiorganizer.whatsapp.domain;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "configuracao_whatsapp")
public class ConfiguracaoWhatsapp {

    public static final LocalTime HORARIO_DEFAULT = LocalTime.of(18, 0);

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false, unique = true)
    private UUID psicologaId;

    @Column(name = "ativo", nullable = false)
    private boolean ativo;

    @Column(name = "horario_envio_lembrete", nullable = false)
    private LocalTime horarioEnvioLembrete;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected ConfiguracaoWhatsapp() {}

    public ConfiguracaoWhatsapp(UUID id, UUID psicologaId) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.ativo = false;
        this.horarioEnvioLembrete = HORARIO_DEFAULT;
        Instant agora = Instant.now();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    public void atualizar(boolean ativo, LocalTime horarioEnvioLembrete) {
        this.ativo = ativo;
        this.horarioEnvioLembrete = horarioEnvioLembrete;
        this.atualizadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public boolean isAtivo() { return ativo; }
    public LocalTime getHorarioEnvioLembrete() { return horarioEnvioLembrete; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
