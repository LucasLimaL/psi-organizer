package com.psiorganizer.admin.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

/** Rateio da fatura por contrato — pro-rata = dias usados / dias do ciclo. */
@Entity
@Table(name = "fatura_item")
public class FaturaItem {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "fatura_id", nullable = false)
    private UUID faturaId;

    @Column(name = "contrato_id", nullable = false)
    private UUID contratoId;

    @Column(name = "periodo_inicio", nullable = false)
    private LocalDate periodoInicio;

    @Column(name = "periodo_fim", nullable = false)
    private LocalDate periodoFim;

    @Column(name = "dias", nullable = false)
    private int dias;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    protected FaturaItem() {}

    public FaturaItem(UUID id, UUID faturaId, UUID contratoId, LocalDate periodoInicio,
                      LocalDate periodoFim, int dias, BigDecimal valor) {
        this.id = id;
        this.faturaId = faturaId;
        this.contratoId = contratoId;
        this.periodoInicio = periodoInicio;
        this.periodoFim = periodoFim;
        this.dias = dias;
        this.valor = valor;
    }

    public UUID getId() { return id; }
    public UUID getFaturaId() { return faturaId; }
    public UUID getContratoId() { return contratoId; }
    public LocalDate getPeriodoInicio() { return periodoInicio; }
    public LocalDate getPeriodoFim() { return periodoFim; }
    public int getDias() { return dias; }
    public BigDecimal getValor() { return valor; }
}
