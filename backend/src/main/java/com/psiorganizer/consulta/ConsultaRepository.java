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

    /**
     * Consultas passadas que ficaram sem desfecho (ainda AGENDADA/CONFIRMADA).
     * Alimenta o banner "a revisar" da agenda e o widget do dashboard.
     */
    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio < :agora
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
            order by c.inicio asc
            """)
    List<Consulta> aRevisar(@Param("psicologaId") UUID psicologaId,
                            @Param("agora") Instant agora,
                            org.springframework.data.domain.Pageable pageable);

    @Query("""
            select count(c) from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio < :agora
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
            """)
    long contarARevisar(@Param("psicologaId") UUID psicologaId,
                        @Param("agora") Instant agora);

    @Query("""
            select c from Consulta c
            where c.pacienteId = :pacienteId
              and c.inicio > :agora
            order by c.inicio asc
            """)
    List<Consulta> proximasDoPaciente(@Param("pacienteId") UUID pacienteId,
                                      @Param("agora") Instant agora,
                                      org.springframework.data.domain.Pageable pageable);

    @Query("""
            select count(c) from Consulta c
            where c.pacienteId = :pacienteId
              and c.inicio > :agora
            """)
    long contarProximasDoPaciente(@Param("pacienteId") UUID pacienteId,
                                  @Param("agora") Instant agora);

    @Query("""
            select c from Consulta c
            where c.pacienteId = :pacienteId
              and c.inicio <= :agora
            order by c.inicio desc
            """)
    List<Consulta> historicoDoPaciente(@Param("pacienteId") UUID pacienteId,
                                       @Param("agora") Instant agora,
                                       org.springframework.data.domain.Pageable pageable);

    @Query("""
            select count(c) from Consulta c
            where c.pacienteId = :pacienteId
              and c.inicio <= :agora
            """)
    long contarHistoricoDoPaciente(@Param("pacienteId") UUID pacienteId,
                                   @Param("agora") Instant agora);

    /**
     * Passo (a) — envio do dia. Consultas de uma psi entre amanhã 00:00 e 23:59:59 (SP)
     * com status_confirmacao = AGUARDANDO, status operacional AGENDADA/CONFIRMADA, e que
     * ainda não têm lembrete_enviado.
     */
    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :amanhaInicio
              and c.inicio < :amanhaFim
              and c.statusConfirmacao = com.psiorganizer.consulta.StatusConfirmacao.AGUARDANDO
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
              and not exists (
                  select 1 from LembreteEnviado le where le.consultaId = c.id
              )
            order by c.inicio asc
            """)
    List<Consulta> findPendentesEnvioDoDia(@Param("psicologaId") UUID psicologaId,
                                           @Param("amanhaInicio") Instant amanhaInicio,
                                           @Param("amanhaFim") Instant amanhaFim);

    /**
     * Passo (b) — late-bound. Consultas criadas após o horário escolhido da psi (hoje em SP),
     * com inicio entre agora+2h e agora+36h, AGUARDANDO, status AGENDADA/CONFIRMADA, sem
     * lembrete_enviado.
     */
    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio > :inicioMin
              and c.inicio <= :inicioMax
              and c.criadoEm > :criadoApos
              and c.statusConfirmacao = com.psiorganizer.consulta.StatusConfirmacao.AGUARDANDO
              and c.status in (com.psiorganizer.consulta.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.StatusConsulta.CONFIRMADA)
              and not exists (
                  select 1 from LembreteEnviado le where le.consultaId = c.id
              )
            order by c.inicio asc
            """)
    List<Consulta> findPendentesEnvioLateBound(@Param("psicologaId") UUID psicologaId,
                                               @Param("inicioMin") Instant inicioMin,
                                               @Param("inicioMax") Instant inicioMax,
                                               @Param("criadoApos") Instant criadoApos);
}
