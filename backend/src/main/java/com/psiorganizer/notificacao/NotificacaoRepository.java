package com.psiorganizer.notificacao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacaoRepository extends JpaRepository<Notificacao, UUID> {

    Optional<Notificacao> findByIdAndPsicologaId(UUID id, UUID psicologaId);

    /** Top 50 não-lidas pra polling do frontend. */
    @Query("""
            select n from Notificacao n
            where n.psicologaId = :psicologaId
              and n.lidaEm is null
            order by n.criadaEm desc
            """)
    List<Notificacao> naoLidas(@Param("psicologaId") UUID psicologaId,
                               org.springframework.data.domain.Pageable pageable);

    long countByPsicologaIdAndLidaEmIsNull(UUID psicologaId);
}
