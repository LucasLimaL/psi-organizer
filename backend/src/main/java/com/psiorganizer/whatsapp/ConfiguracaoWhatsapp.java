package com.psiorganizer.whatsapp;

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

    public static final String TEMPLATE_DEFAULT =
            "Olá, {paciente}! Aqui é a {psicologa}.\n"
            + "Lembrando da sua consulta amanhã, {data} às {hora}.\n"
            + "Pode confirmar abaixo?";

    public static final LocalTime HORARIO_DEFAULT = LocalTime.of(18, 0);

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false, unique = true)
    private UUID psicologaId;

    @Column(name = "ativo", nullable = false)
    private boolean ativo;

    @Column(name = "template_mensagem", nullable = false, columnDefinition = "text")
    private String templateMensagem;

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
        this.templateMensagem = TEMPLATE_DEFAULT;
        this.horarioEnvioLembrete = HORARIO_DEFAULT;
        Instant agora = Instant.now();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    public void atualizar(boolean ativo, String templateMensagem, LocalTime horarioEnvioLembrete) {
        this.ativo = ativo;
        this.templateMensagem = templateMensagem;
        this.horarioEnvioLembrete = horarioEnvioLembrete;
        this.atualizadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public boolean isAtivo() { return ativo; }
    public String getTemplateMensagem() { return templateMensagem; }
    public LocalTime getHorarioEnvioLembrete() { return horarioEnvioLembrete; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
