package com.psiorganizer.admin;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FaturaRepository extends JpaRepository<Fatura, UUID> {

    List<Fatura> findByPsicologaIdOrderByPeriodoFimDesc(UUID psicologaId);

    boolean existsByPsicologaIdAndPeriodoFim(UUID psicologaId, LocalDate periodoFim);

    List<Fatura> findByPsicologaIdAndPagaFalse(UUID psicologaId);

    /** Vencidas (quantidade + soma) por psicólogo, pra lista do painel. */
    @Query("""
            select new com.psiorganizer.admin.PendenciaProjecao(
                f.psicologaId, count(f), sum(f.valor))
            from Fatura f
            where f.psicologaId in :psicologaIds
              and f.paga = false
              and f.vencimento < :hoje
            group by f.psicologaId
            """)
    List<PendenciaProjecao> vencidasPorPsicologa(
            @Param("psicologaIds") List<UUID> psicologaIds,
            @Param("hoje") LocalDate hoje);
}
