package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

/**
 * Contrato de uso do sistema — a psicóloga é a CLIENTE do SaaS aqui.
 * Pode haver vários por psicóloga ao longo do tempo; o service garante
 * no máximo um ativo (criar novo desativa o anterior).
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

    @Column(name = "ativo", nullable = false)
    private boolean ativo;

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
        this.ativo = true;
        this.criadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPsicologaId() { return psicologaId; }
    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate d) { this.dataInicio = d; }
    public LocalDate getDataFim() { return dataFim; }
    public void setDataFim(LocalDate d) { this.dataFim = d; }
    public BigDecimal getValorMensal() { return valorMensal; }
    public void setValorMensal(BigDecimal v) { this.valorMensal = v; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public Instant getCriadoEm() { return criadoEm; }
}
