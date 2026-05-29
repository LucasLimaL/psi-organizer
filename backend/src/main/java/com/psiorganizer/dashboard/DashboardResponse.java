package com.psiorganizer.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.psiorganizer.consulta.StatusConsulta;

/**
 * Métricas agregadas para os widgets do dashboard.
 * Frontend escolhe quais widgets ativar — backend retorna tudo
 * e quem decide o que mostrar é o usuário.
 */
public record DashboardResponse(
        HojeStats hoje,
        MesStats mes,
        ComparativoStats comparativo,
        List<DiaStats> proximos7Dias,
        PacientesStats pacientes,
        long consultasFuturasAgendadas,
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
            BigDecimal faturamentoPendente,
            /** null se ainda não houve consulta com status REALIZADA ou FALTA. */
            Double taxaComparecimento) {}

    public record ComparativoStats(
            int consultasMesAnterior,
            BigDecimal faturamentoMesAnterior) {}

    public record DiaStats(LocalDate dia, int total) {}

    public record PacientesStats(int ativos, int novosNoMes) {}

    public record ProximaConsulta(
            UUID id,
            Instant inicio,
            int duracaoMinutos,
            String pacienteNome,
            StatusConsulta status) {}
}
