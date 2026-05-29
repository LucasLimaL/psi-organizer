package com.psiorganizer.consulta;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsultaRepository extends JpaRepository<Consulta, UUID> {

    Optional<Consulta> findByIdAndPsicologaId(UUID id, UUID psicologaId);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :inicio
              and c.inicio < :fim
            order by c.inicio asc
            """)
    List<Consulta> listarIntervalo(@Param("psicologaId") UUID psicologaId,
                                   @Param("inicio") Instant inicio,
                                   @Param("fim") Instant fim);

    List<Consulta> findByPacienteIdOrderByInicioDesc(UUID pacienteId);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio < :fim
              and c.inicio >= :janelaMin
            """)
    List<Consulta> candidatosConflito(@Param("psicologaId") UUID psicologaId,
                                      @Param("janelaMin") Instant janelaMin,
                                      @Param("fim") Instant fim);

    @Modifying
    @Query("""
            delete from Consulta c
            where c.pacienteId = :pacienteId
              and c.inicio > :agora
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
            """)
    int apagarFuturasDoPaciente(@Param("pacienteId") UUID pacienteId,
                                @Param("agora") Instant agora);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :agora
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
            order by c.inicio asc
            """)
    List<Consulta> proximasConsultas(@Param("psicologaId") UUID psicologaId,
                                     @Param("agora") Instant agora,
                                     org.springframework.data.domain.Pageable pageable);

    @Query("""
            select count(c) from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio > :agora
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
            """)
    long contarFuturasAgendadas(@Param("psicologaId") UUID psicologaId,
                                @Param("agora") Instant agora);
}
