package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

/**
 * Contrato de uso do sistema — o psicólogo é o CLIENTE do SaaS aqui.
 * Sem flag de estado: a vigência é determinada pelas datas (sobreposição
 * é proibida na criação). Vigente = dataInicio <= hoje <= dataFim (null = ∞).
 */
@Entity
@Table(name = "contrato")
public class Contrato {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    /** null = vigência por prazo indeterminado. */
    @Column(name = "data_fim")
    private LocalDate dataFim;

    @Column(name = "valor_mensal", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorMensal;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Contrato() {}

    public Contrato(UUID id, UUID psicologaId, LocalDate dataInicio,
                    LocalDate dataFim, BigDecimal valorMensal) {
        this.id = id;
        this.psicologaId = psicologaId;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.valorMensal = valorMensal;
        this.criadoEm = Instant.now();
    }

    /** Cobre o dia d? (dataFim null = prazo indeterminado) */
    public boolean cobre(LocalDate d) {
        return !d.isBefore(dataInicio) && (dataFim == null || !d.isAfter(dataFim));
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate d) { this.dataInicio = d; }
    public LocalDate getDataFim() { return dataFim; }
    public void setDataFim(LocalDate d) { this.dataFim = d; }
    public BigDecimal getValorMensal() { return valorMensal; }
    public void setValorMensal(BigDecimal v) { this.valorMensal = v; }
    public Instant getCriadoEm() { return criadoEm; }
}
