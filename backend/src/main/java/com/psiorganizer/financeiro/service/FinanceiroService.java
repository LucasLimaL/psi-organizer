package com.psiorganizer.financeiro.service;

import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.consulta.domain.Consulta;
import com.psiorganizer.financeiro.domain.GrupoPendenteProjecao;
import com.psiorganizer.financeiro.domain.TotalCategoria;
import com.psiorganizer.financeiro.dto.FinanceiroConsultaResponse;
import com.psiorganizer.financeiro.dto.FinanceiroConsultasPaginadoResponse;
import com.psiorganizer.financeiro.dto.FinanceiroPendentesPaginadoResponse;
import com.psiorganizer.financeiro.dto.FinanceiroResumoResponse;
import com.psiorganizer.financeiro.repository.FinanceiroRepository;
import com.psiorganizer.paciente.domain.Paciente;
import com.psiorganizer.paciente.repository.PacienteRepository;
import com.psiorganizer.psicologa.service.PsicologaService;

/**
 * Visão financeira por competência: tudo é recortado pelo mês/ano da CONSULTA
 * (`inicio`), não pela data do pagamento. `pago_em` é registrado mas ainda não
 * usado em filtro — fica disponível pra uma futura visão de caixa.
 *
 * Monta DTOs de response direto (projeção read-only) — mesma exceção
 * registrada pro DashboardService em ARCHITECTURE.md §2.1.
 */
@Service
public class FinanceiroService {

    /** Listagem cronológica da tela financeiro. */
    public enum Categoria { REALIZADOS, FUTUROS }

    private final FinanceiroRepository financeiroRepository;
    private final PacienteRepository pacienteRepository;
    private final PsicologaService psicologaService;

    public FinanceiroService(FinanceiroRepository financeiroRepository,
                             PacienteRepository pacienteRepository,
                             PsicologaService psicologaService) {
        this.financeiroRepository = financeiroRepository;
        this.pacienteRepository = pacienteRepository;
        this.psicologaService = psicologaService;
    }

    @Transactional(readOnly = true)
    public FinanceiroResumoResponse resumo(UUID psicologaId, Instant ini, Instant fim) {
        boolean cobrarFaltas = psicologaService.buscarPorId(psicologaId).isCobrarFaltas();
        TotalCategoria pendentes = financeiroRepository.totalPendentes(psicologaId, ini, fim, cobrarFaltas);
        TotalCategoria realizados = financeiroRepository.totalRealizados(psicologaId, ini, fim);
        TotalCategoria futuros = financeiroRepository.totalFuturos(psicologaId, ini, fim);
        TotalCategoria anteriores = financeiroRepository.totalPendentes(psicologaId, Instant.EPOCH, ini, cobrarFaltas);
        return new FinanceiroResumoResponse(
                categoria(pendentes), categoria(realizados), categoria(futuros),
                categoria(anteriores), anosDisponiveis(psicologaId));
    }

    @Transactional(readOnly = true)
    public FinanceiroPendentesPaginadoResponse pendentesAgrupados(
            UUID psicologaId, Instant ini, Instant fim, int limit, int offset) {
        boolean cobrarFaltas = psicologaService.buscarPorId(psicologaId).isCobrarFaltas();
        Pageable page = PageRequest.of(offset / Math.max(limit, 1), limit);
        List<GrupoPendenteProjecao> grupos =
                financeiroRepository.gruposPendentes(psicologaId, ini, fim, cobrarFaltas, page);
        long totalGrupos = financeiroRepository.contarGruposPendentes(psicologaId, ini, fim, cobrarFaltas);
        if (grupos.isEmpty()) {
            return new FinanceiroPendentesPaginadoResponse(List.of(), totalGrupos, false);
        }

        List<UUID> pacienteIds = grupos.stream().map(GrupoPendenteProjecao::pacienteId).toList();
        Map<UUID, List<Consulta>> porPaciente = financeiroRepository
                .pendentesDosPacientes(psicologaId, pacienteIds, ini, fim, cobrarFaltas).stream()
                .collect(Collectors.groupingBy(Consulta::getPacienteId,
                        LinkedHashMap::new, Collectors.toList()));
        Map<UUID, String> nomes = nomesDePacientes(pacienteIds);

        List<FinanceiroPendentesPaginadoResponse.GrupoPendente> itens = new ArrayList<>(grupos.size());
        for (GrupoPendenteProjecao g : grupos) {
            String nome = nomes.getOrDefault(g.pacienteId(), "?");
            List<FinanceiroConsultaResponse> consultas =
                    porPaciente.getOrDefault(g.pacienteId(), List.of()).stream()
                            .map(c -> FinanceiroConsultaResponse.from(c, nome))
                            .toList();
            itens.add(new FinanceiroPendentesPaginadoResponse.GrupoPendente(
                    g.pacienteId(), nome, g.quantidade(), g.total(), consultas));
        }
        boolean temMais = offset + grupos.size() < totalGrupos;
        return new FinanceiroPendentesPaginadoResponse(itens, totalGrupos, temMais);
    }

    @Transactional(readOnly = true)
    public FinanceiroConsultasPaginadoResponse listar(
            UUID psicologaId, Instant ini, Instant fim, Categoria categoria,
            int limit, int offset) {
        Pageable page = PageRequest.of(offset / Math.max(limit, 1), limit);
        List<Consulta> consultas;
        long total;
        if (categoria == Categoria.REALIZADOS) {
            consultas = financeiroRepository.realizados(psicologaId, ini, fim, page);
            total = financeiroRepository.totalRealizados(psicologaId, ini, fim).quantidade();
        } else {
            consultas = financeiroRepository.futuros(psicologaId, ini, fim, page);
            total = financeiroRepository.totalFuturos(psicologaId, ini, fim).quantidade();
        }
        Map<UUID, String> nomes = nomesDePacientes(
                consultas.stream().map(Consulta::getPacienteId).distinct().toList());
        List<FinanceiroConsultaResponse> itens = consultas.stream()
                .map(c -> FinanceiroConsultaResponse.from(
                        c, nomes.getOrDefault(c.getPacienteId(), "?")))
                .toList();
        boolean temMais = offset + consultas.size() < total;
        return new FinanceiroConsultasPaginadoResponse(itens, total, temMais);
    }

    /** Anos com consultas, do mais recente ao mais antigo. Sem consultas → só o ano atual. */
    private List<Integer> anosDisponiveis(UUID psicologaId) {
        int anoAtual = Year.now(Fusos.ZONA_BR).getValue();
        Instant primeira = financeiroRepository.primeiraConsulta(psicologaId);
        int primeiroAno = primeira == null
                ? anoAtual
                : primeira.atZone(Fusos.ZONA_BR).getYear();
        List<Integer> anos = new ArrayList<>();
        for (int ano = anoAtual; ano >= primeiroAno; ano--) {
            anos.add(ano);
        }
        return anos;
    }

    private static FinanceiroResumoResponse.Categoria categoria(TotalCategoria t) {
        return new FinanceiroResumoResponse.Categoria(t.quantidade(), t.total());
    }

    private Map<UUID, String> nomesDePacientes(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return pacienteRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Paciente::getId, Paciente::getNome, (a, b) -> a));
    }
}
