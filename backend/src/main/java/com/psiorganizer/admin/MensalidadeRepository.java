package com.psiorganizer.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MensalidadeRepository extends JpaRepository<Mensalidade, UUID> {

    List<Mensalidade> findByContratoId(UUID contratoId);

    List<Mensalidade> findByPsicologaIdOrderByCompetenciaDesc(UUID psicologaId);

    /** Pendências (quantidade + soma) por psicóloga, pra lista do painel. */
    @Query("""
            select new com.psiorganizer.admin.PendenciaProjecao(
                m.psicologaId, count(m), sum(m.valor))
            from Mensalidade m
            where m.psicologaId in :psicologaIds
              and m.paga = false
            group by m.psicologaId
            """)
    List<PendenciaProjecao> pendenciasPorPsicologa(
            @Param("psicologaIds") List<UUID> psicologaIds);
}
