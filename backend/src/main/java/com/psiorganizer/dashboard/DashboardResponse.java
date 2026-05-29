package com.psiorganizer.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.psiorganizer.consulta.StatusConsulta;

/**
 * Métricas agregadas para a tela inicial. Tudo em uma única chamada
 * pra evitar N round-trips do frontend.
 *
 * Filosofia: informacional, não performativo. Sem comparativos vs
 * mês anterior, sem incentivos a "crescer". O dashboard ajuda a
 * planejar o dia/mês, não a empurrar produtividade.
 */
public record DashboardResponse(
        HojeStats hoje,
        MesStats mes,
        List<DiaStats> proximos7Dias,
        PacientesStats pacientes,
        List<ProximaConsulta> proximasConsultas) {

    public record HojeStats(
            int total,
            int agendadas,
            int confirmadas,
            int realizadas,
            int faltas) {}

    public record MesStats(
            int total,
            int agendadas,
            int confirmadas,
            int realizadas,
            int faltas,
            BigDecimal faturamentoRealizado,
            BigDecimal faturamentoPago,
            BigDecimal faturamentoPendente) {}

    public record DiaStats(LocalDate dia, int total) {}

    public record PacientesStats(int ativos) {}

    public record ProximaConsulta(
            UUID id,
            Instant inicio,
            int duracaoMinutos,
            String pacienteNome,
            StatusConsulta status) {}
}
