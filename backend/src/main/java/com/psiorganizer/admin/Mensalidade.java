package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

/**
 * Mensalidade materializada por competência (YYYY-MM) a partir do contrato.
 * `valor` é snapshot do contrato na geração — reajuste futuro não altera
 * competências já lançadas. `psicologaId` é desnormalizado pra consultas
 * diretas de inadimplência.
 */
@Entity
@Table(name = "mensalidade")
public class Mensalidade {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "contrato_id", nullable = false)
    private UUID contratoId;

    @Column(name = "psicologa_id", nullable = false)
    private UUID psicologaId;

    @Column(name = "competencia", nullable = false, length = 7)
    private String competencia;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "paga", nullable = false)
    private boolean paga;

    @Column(name = "paga_em")
    private Instant pagaEm;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Mensalidade() {}

    public Mensalidade(UUID id, UUID contratoId, UUID psicologaId,
                       String competencia, BigDecimal valor) {
        this.id = id;
        this.contratoId = contratoId;
        this.psicologaId = psicologaId;
        this.competencia = competencia;
        this.valor = valor;
        this.paga = false;
        this.criadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getContratoId() { return contratoId; }
    public UUID getPsicologaId() { return psicologaId; }
    public String getCompetencia() { return competencia; }
    public BigDecimal getValor() { return valor; }
    public boolean isPaga() { return paga; }
    public void setPaga(boolean paga) { this.paga = paga; }
    public Instant getPagaEm() { return pagaEm; }
    public void setPagaEm(Instant p) { this.pagaEm = p; }
    public Instant getCriadoEm() { return criadoEm; }
}
