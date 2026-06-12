package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

/**
 * Fatura de um ciclo de fechamento do psicólogo (estilo fatura de banco).
 * Materializada apenas quando o ciclo FECHA — ciclo corrente e próximo são
 * prévias calculadas. Status é derivado: paga | vencida (vencimento passou)
 * | a vencer. Fatura de valor 0 nasce paga (cortesia).
 */
@Entity
@Table(name = "fatura")
public class Fatura {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "periodo_inicio", nullable = false)
    private LocalDate periodoInicio;

    @Column(name = "periodo_fim", nullable = false)
    private LocalDate periodoFim;

    @Column(name = "vencimento", nullable = false)
    private LocalDate vencimento;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "paga", nullable = false)
    private boolean paga;

    @Column(name = "paga_em")
    private Instant pagaEm;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Fatura() {}

    public Fatura(UUID id, UUID psicologaId, LocalDate periodoInicio,
                  LocalDate periodoFim, LocalDate vencimento, BigDecimal valor) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.periodoInicio = periodoInicio;
        this.periodoFim = periodoFim;
        this.vencimento = vencimento;
        this.valor = valor;
        this.criadoEm = Instant.now();
        // Cortesia/valor zero não é cobrável — nasce quitada
        if (valor.signum() == 0) {
            this.paga = true;
            this.pagaEm = this.criadoEm;
        }
    }

    public boolean vencida(LocalDate hoje) {
        return !paga && vencimento.isBefore(hoje);
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public LocalDate getPeriodoInicio() { return periodoInicio; }
    public LocalDate getPeriodoFim() { return periodoFim; }
    public LocalDate getVencimento() { return vencimento; }
    public BigDecimal getValor() { return valor; }
    public boolean isPaga() { return paga; }
    public void setPaga(boolean paga) { this.paga = paga; }
    public Instant getPagaEm() { return pagaEm; }
    public void setPagaEm(Instant p) { this.pagaEm = p; }
    public Instant getCriadoEm() { return criadoEm; }
}
