package com.psiorganizer.financeiro;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.psiorganizer.consulta.domain.Consulta;

/**
 * Queries financeiras sobre a entidade Consulta. Repositório separado do
 * ConsultaRepository pra manter o contexto financeiro autocontido.
 *
 * Categorias:
 * - pendente:  status REALIZADA/FALTA e pago = false (cobrável, não recebido)
 * - realizado: status REALIZADA/FALTA e pago = true  (cobrável, recebido)
 * - futuro:    status AGENDADA/CONFIRMADA            (ainda não aconteceu)
 * CANCELADA não entra em nenhuma categoria.
 *
 * FALTA pendente só é cobrável se a psicóloga cobra faltas (:cobrarFaltas,
 * preferência do perfil). FALTA já paga conta sempre — dinheiro recebido não
 * some das somas quando a preferência é desligada.
 */
public interface FinanceiroRepository extends Repository<Consulta, UUID> {

    @Query("""
            select new com.psiorganizer.financeiro.TotalCategoria(sum(c.valor), count(c))
            from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and (c.status = com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA
                   or (c.status = com.psiorganizer.consulta.domain.StatusConsulta.FALTA
                       and :cobrarFaltas = true))
              and c.pago = false
            """)
    TotalCategoria totalPendentes(@Param("psicologaId") UUID psicologaId,
                                  @Param("ini") Instant ini,
                                  @Param("fim") Instant fim,
                                  @Param("cobrarFaltas") boolean cobrarFaltas);

    @Query("""
            select new com.psiorganizer.financeiro.TotalCategoria(sum(c.valor), count(c))
            from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and c.status in (com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA,
                               com.psiorganizer.consulta.domain.StatusConsulta.FALTA)
              and c.pago = true
            """)
    TotalCategoria totalRealizados(@Param("psicologaId") UUID psicologaId,
                                   @Param("ini") Instant ini,
                                   @Param("fim") Instant fim);

    @Query("""
            select new com.psiorganizer.financeiro.TotalCategoria(sum(c.valor), count(c))
            from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and c.status in (com.psiorganizer.consulta.domain.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.domain.StatusConsulta.CONFIRMADA)
            """)
    TotalCategoria totalFuturos(@Param("psicologaId") UUID psicologaId,
                                @Param("ini") Instant ini,
                                @Param("fim") Instant fim);

    @Query("""
            select new com.psiorganizer.financeiro.GrupoPendenteProjecao(
                c.pacienteId, count(c), sum(c.valor))
            from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and (c.status = com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA
                   or (c.status = com.psiorganizer.consulta.domain.StatusConsulta.FALTA
                       and :cobrarFaltas = true))
              and c.pago = false
            group by c.pacienteId
            order by sum(c.valor) desc, c.pacienteId asc
            """)
    List<GrupoPendenteProjecao> gruposPendentes(@Param("psicologaId") UUID psicologaId,
                                                @Param("ini") Instant ini,
                                                @Param("fim") Instant fim,
                                                @Param("cobrarFaltas") boolean cobrarFaltas,
                                                Pageable pageable);

    @Query("""
            select count(distinct c.pacienteId) from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and (c.status = com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA
                   or (c.status = com.psiorganizer.consulta.domain.StatusConsulta.FALTA
                       and :cobrarFaltas = true))
              and c.pago = false
            """)
    long contarGruposPendentes(@Param("psicologaId") UUID psicologaId,
                               @Param("ini") Instant ini,
                               @Param("fim") Instant fim,
                               @Param("cobrarFaltas") boolean cobrarFaltas);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.pacienteId in :pacienteIds
              and c.inicio >= :ini and c.inicio < :fim
              and (c.status = com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA
                   or (c.status = com.psiorganizer.consulta.domain.StatusConsulta.FALTA
                       and :cobrarFaltas = true))
              and c.pago = false
            order by c.inicio asc
            """)
    List<Consulta> pendentesDosPacientes(@Param("psicologaId") UUID psicologaId,
                                         @Param("pacienteIds") List<UUID> pacienteIds,
                                         @Param("ini") Instant ini,
                                         @Param("fim") Instant fim,
                                         @Param("cobrarFaltas") boolean cobrarFaltas);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and c.status in (com.psiorganizer.consulta.domain.StatusConsulta.REALIZADA,
                               com.psiorganizer.consulta.domain.StatusConsulta.FALTA)
              and c.pago = true
            order by c.inicio desc
            """)
    List<Consulta> realizados(@Param("psicologaId") UUID psicologaId,
                              @Param("ini") Instant ini,
                              @Param("fim") Instant fim,
                              Pageable pageable);

    @Query("""
            select c from Consulta c
            where c.psicologaId = :psicologaId
              and c.inicio >= :ini and c.inicio < :fim
              and c.status in (com.psiorganizer.consulta.domain.StatusConsulta.AGENDADA,
                               com.psiorganizer.consulta.domain.StatusConsulta.CONFIRMADA)
            order by c.inicio asc
            """)
    List<Consulta> futuros(@Param("psicologaId") UUID psicologaId,
                           @Param("ini") Instant ini,
                           @Param("fim") Instant fim,
                           Pageable pageable);

    @Query("select min(c.inicio) from Consulta c where c.psicologaId = :psicologaId")
    Instant primeiraConsulta(@Param("psicologaId") UUID psicologaId);
}
