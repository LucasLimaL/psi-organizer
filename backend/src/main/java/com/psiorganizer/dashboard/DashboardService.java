package com.psiorganizer.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.ConsultaRepository;
import com.psiorganizer.consulta.StatusConsulta;
import com.psiorganizer.paciente.Paciente;
import com.psiorganizer.paciente.PacienteRepository;

@Service
public class DashboardService {

    private final ConsultaRepository consultaRepository;
    private final PacienteRepository pacienteRepository;

    public DashboardService(ConsultaRepository consultaRepository,
                            PacienteRepository pacienteRepository) {
        this.consultaRepository = consultaRepository;
        this.pacienteRepository = pacienteRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResponse calcular(UUID psicologaId) {
        Instant agora = Instant.now();
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        Instant hojeIni = hoje.atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant hojeFim = hoje.plusDays(1).atStartOfDay(Fusos.ZONA_BR).toInstant();

        YearMonth mesAtual = YearMonth.from(hoje);
        Instant mesAtualIni = mesAtual.atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant mesAtualFim = mesAtual.plusMonths(1).atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant();

        YearMonth mesAnterior = mesAtual.minusMonths(1);
        Instant mesAntIni = mesAnterior.atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant mesAntFim = mesAtualIni;

        Instant proxima7Fim = hoje.plusDays(7).atStartOfDay(Fusos.ZONA_BR).toInstant();

        // Carrega tudo do mês anterior até daqui a 7 dias — uma query só.
        List<Consulta> janela = consultaRepository.listarIntervalo(psicologaId, mesAntIni, proxima7Fim);

        List<Consulta> proximas = consultaRepository.proximasConsultas(
                psicologaId, agora, PageRequest.of(0, 5));
        Map<UUID, String> nomes = nomesDePacientes(
                proximas.stream().map(Consulta::getPacienteId).distinct().toList());

        var hojeStats = calcularHoje(janela, hojeIni, hojeFim);
        var mesStats = calcularMes(janela, mesAtualIni, mesAtualFim);
        var comp = calcularComparativo(janela, mesAntIni, mesAntFim);
        var dias7 = calcularProximos7Dias(janela, hoje);

        int ativos = pacienteRepository.countByPsicologaIdAndAtivo(psicologaId, true);
        int novosNoMes = pacienteRepository.countByPsicologaIdAndCriadoEmGreaterThanEqual(
                psicologaId, mesAtualIni);
        long futuras = consultaRepository.contarFuturasAgendadas(psicologaId, agora);

        return new DashboardResponse(
                hojeStats, mesStats, comp, dias7,
                new DashboardResponse.PacientesStats(ativos, novosNoMes),
                futuras,
                proximas.stream()
                        .map(c -> new DashboardResponse.ProximaConsulta(
                                c.getId(), c.getInicio(), c.getDuracaoMinutos(),
                                nomes.getOrDefault(c.getPacienteId(), "?"),
                                c.getStatus()))
                        .toList());
    }

    private DashboardResponse.HojeStats calcularHoje(List<Consulta> janela, Instant ini, Instant fim) {
        List<Consulta> hoje = filtrarPorInicio(janela, ini, fim);
        ContagemPorStatus contagem = contarPorStatus(hoje);
        return new DashboardResponse.HojeStats(hoje.size(), contagem.agendadas(),
                contagem.confirmadas(), contagem.realizadas(), contagem.faltas());
    }

    private DashboardResponse.MesStats calcularMes(List<Consulta> janela, Instant ini, Instant fim) {
        List<Consulta> mes = filtrarPorInicio(janela, ini, fim);
        ContagemPorStatus contagem = contarPorStatus(mes);

        BigDecimal faturamentoRealizado = somarValores(mes, c -> c.getStatus() == StatusConsulta.REALIZADA);
        BigDecimal faturamentoPago = somarValores(mes,
                c -> c.getStatus() == StatusConsulta.REALIZADA && c.isPago());
        BigDecimal faturamentoPendente = somarValores(mes,
                c -> c.getStatus() == StatusConsulta.REALIZADA && !c.isPago());

        int realizadas = contagem.realizadas();
        int faltas = contagem.faltas();
        Double taxa = (realizadas + faltas) == 0
                ? null
                : (double) realizadas / (realizadas + faltas);

        return new DashboardResponse.MesStats(
                mes.size(), contagem.agendadas(), contagem.confirmadas(), realizadas, faltas,
                faturamentoRealizado, faturamentoPago, faturamentoPendente, taxa);
    }

    private DashboardResponse.ComparativoStats calcularComparativo(List<Consulta> janela,
                                                                   Instant ini, Instant fim) {
        List<Consulta> mes = filtrarPorInicio(janela, ini, fim);
        BigDecimal faturamento = somarValores(mes, c -> c.getStatus() == StatusConsulta.REALIZADA);
        return new DashboardResponse.ComparativoStats(mes.size(), faturamento);
    }

    /** Consultas cujo início cai em [ini, fim). */
    private static List<Consulta> filtrarPorInicio(List<Consulta> janela, Instant ini, Instant fim) {
        return janela.stream()
                .filter(c -> !c.getInicio().isBefore(ini) && c.getInicio().isBefore(fim))
                .toList();
    }

    private record ContagemPorStatus(int agendadas, int confirmadas, int realizadas, int faltas) {}

    /** CANCELADA não entra em nenhum contador — só no total (size da lista filtrada). */
    private static ContagemPorStatus contarPorStatus(List<Consulta> consultas) {
        int agendadas = 0;
        int confirmadas = 0;
        int realizadas = 0;
        int faltas = 0;
        for (Consulta c : consultas) {
            switch (c.getStatus()) {
                case AGENDADA -> agendadas++;
                case CONFIRMADA -> confirmadas++;
                case REALIZADA -> realizadas++;
                case FALTA -> faltas++;
                default -> { }
            }
        }
        return new ContagemPorStatus(agendadas, confirmadas, realizadas, faltas);
    }

    private List<DashboardResponse.DiaStats> calcularProximos7Dias(List<Consulta> janela, LocalDate hoje) {
        Map<LocalDate, Integer> porDia = new HashMap<>();
        for (Consulta c : janela) {
            LocalDate dia = c.getInicio().atZone(Fusos.ZONA_BR).toLocalDate();
            porDia.merge(dia, 1, Integer::sum);
        }
        return java.util.stream.IntStream.range(0, 7)
                .mapToObj(i -> {
                    LocalDate d = hoje.plusDays(i);
                    return new DashboardResponse.DiaStats(d, porDia.getOrDefault(d, 0));
                })
                .toList();
    }

    private BigDecimal somarValores(List<Consulta> consultas, java.util.function.Predicate<Consulta> p) {
        return consultas.stream()
                .filter(p)
                .map(Consulta::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<UUID, String> nomesDePacientes(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return pacienteRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Paciente::getId, Paciente::getNome, (a, b) -> a));
    }
}
