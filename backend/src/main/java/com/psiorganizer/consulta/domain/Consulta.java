package com.psiorganizer.consulta.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "consulta")
public class Consulta {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "paciente_id", nullable = false)
    private UUID pacienteId;

    @Column(name = "inicio", nullable = false)
    private Instant inicio;

    @Column(name = "duracao_minutos", nullable = false)
    private int duracaoMinutos;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private StatusConsulta status;

    @Column(name = "pago", nullable = false)
    private boolean pago;

    @Column(name = "pago_em")
    private Instant pagoEm;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_confirmacao", nullable = false, length = 32)
    private StatusConfirmacao statusConfirmacao;

    @Column(name = "confirmada_pela_paciente_em")
    private Instant confirmadaPelaPacienteEm;

    @Column(name = "observacoes", columnDefinition = "text")
    private String observacoes;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Consulta() {}

    public Consulta(UUID id, UUID psicologaId, UUID pacienteId, Instant inicio,
                    int duracaoMinutos, BigDecimal valor, String observacoes) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.pacienteId = pacienteId;
        this.inicio = inicio;
        this.duracaoMinutos = duracaoMinutos;
        this.valor = valor;
        this.status = StatusConsulta.AGENDADA;
        this.pago = false;
        this.statusConfirmacao = StatusConfirmacao.AGUARDANDO;
        this.observacoes = observacoes;
        this.criadoEm = Instant.now();
    }

    public Instant fim() {
        return inicio.plusSeconds(duracaoMinutos * 60L);
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public UUID getPacienteId() { return pacienteId; }
    public Instant getInicio() { return inicio; }
    public void setInicio(Instant i) { this.inicio = i; }
    public int getDuracaoMinutos() { return duracaoMinutos; }
    public void setDuracaoMinutos(int d) { this.duracaoMinutos = d; }
    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal v) { this.valor = v; }
    public StatusConsulta getStatus() { return status; }
    public void setStatus(StatusConsulta s) { this.status = s; }
    public boolean isPago() { return pago; }
    public void setPago(boolean pago) { this.pago = pago; }

    public Instant getPagoEm() { return pagoEm; }
    public void setPagoEm(Instant pagoEm) { this.pagoEm = pagoEm; }

    public StatusConfirmacao getStatusConfirmacao() { return statusConfirmacao; }
    public void setStatusConfirmacao(StatusConfirmacao s) { this.statusConfirmacao = s; }

    public Instant getConfirmadaPelaPacienteEm() { return confirmadaPelaPacienteEm; }
    public void setConfirmadaPelaPacienteEm(Instant c) { this.confirmadaPelaPacienteEm = c; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String o) { this.observacoes = o; }
    public Instant getCriadoEm() { return criadoEm; }
}
