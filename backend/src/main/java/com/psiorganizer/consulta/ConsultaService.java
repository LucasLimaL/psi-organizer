package com.psiorganizer.consulta;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.paciente.Paciente;
import com.psiorganizer.paciente.PacienteRepository;

@Service
public class ConsultaService {

    private static final Duration JANELA_CONFLITO = Duration.ofHours(12);
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final int MAX_OCORRENCIAS = 520; // ~10 anos semanais — guarda contra loop

    private final ConsultaRepository consultaRepository;
    private final PacienteRepository pacienteRepository;

    public ConsultaService(ConsultaRepository consultaRepository,
                           PacienteRepository pacienteRepository) {
        this.consultaRepository = consultaRepository;
        this.pacienteRepository = pacienteRepository;
    }

    @Transactional(readOnly = true)
    public List<Consulta> listar(UUID psicologaId, Instant inicio, Instant fim) {
        return consultaRepository.listarIntervalo(psicologaId, inicio, fim);
    }

    @Transactional(readOnly = true)
    public Consulta buscar(UUID psicologaId, UUID id) {
        return consultaRepository.findByIdAndPsicologaId(id, psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Consulta não encontrada"));
    }

    @Transactional
    public Consulta criar(UUID psicologaId, UUID pacienteId, Instant inicio,
                          int duracaoMinutos, BigDecimal valor, String observacoes) {
        Paciente paciente = validarPaciente(psicologaId, pacienteId);
        validarConflito(psicologaId, inicio, duracaoMinutos, null);
        Consulta c = new Consulta(UUID.randomUUID(), psicologaId, paciente.getId(),
                inicio, duracaoMinutos, valor, observacoes);
        return consultaRepository.save(c);
    }

    @Transactional
    public Consulta atualizar(UUID psicologaId, UUID id, Instant inicio, int duracaoMinutos,
                              BigDecimal valor, StatusConsulta status, boolean pago,
                              String observacoes) {
        Consulta c = buscar(psicologaId, id);
        if (!c.getInicio().equals(inicio) || c.getDuracaoMinutos() != duracaoMinutos) {
            validarConflito(psicologaId, inicio, duracaoMinutos, c.getId());
        }
        c.setInicio(inicio);
        c.setDuracaoMinutos(duracaoMinutos);
        c.setValor(valor);
        c.setStatus(status);
        c.setPago(pago);
        c.setObservacoes(observacoes);
        return consultaRepository.save(c);
    }

    @Transactional
    public List<Consulta> criarRecorrente(UUID psicologaId, UUID pacienteId,
                                          DiaSemana diaDaSemana, LocalTime horario,
                                          int intervaloSemanas, int duracaoMinutos,
                                          BigDecimal valor,
                                          LocalDate inicioEm, LocalDate fimEm,
                                          String observacoes) {
        if (fimEm.isBefore(inicioEm)) {
            throw ApiException.requisicaoInvalida("fimEm precisa ser >= inicioEm");
        }
        if (intervaloSemanas < 1) {
            throw ApiException.requisicaoInvalida("intervaloSemanas precisa ser >= 1");
        }
        Paciente paciente = validarPaciente(psicologaId, pacienteId);

        LocalDate primeira = inicioEm.with(TemporalAdjusters.nextOrSame(diaDaSemana.toDayOfWeek()));
        List<Instant> inicios = new ArrayList<>();
        LocalDate cursor = primeira;
        while (!cursor.isAfter(fimEm)) {
            inicios.add(cursor.atTime(horario).atZone(ZONA).toInstant());
            cursor = cursor.plusWeeks(intervaloSemanas);
            if (inicios.size() > MAX_OCORRENCIAS) {
                throw ApiException.requisicaoInvalida(
                        "Intervalo gera mais de " + MAX_OCORRENCIAS + " consultas");
            }
        }
        if (inicios.isEmpty()) {
            throw ApiException.requisicaoInvalida(
                    "Nenhuma ocorrência no intervalo para o dia da semana informado");
        }

        for (Instant ini : inicios) {
            validarConflito(psicologaId, ini, duracaoMinutos, null);
        }

        List<Consulta> consultas = new ArrayList<>(inicios.size());
        for (Instant ini : inicios) {
            consultas.add(new Consulta(UUID.randomUUID(), psicologaId, paciente.getId(),
                    ini, duracaoMinutos, valor, observacoes));
        }
        return consultaRepository.saveAll(consultas);
    }

    /**
     * Tipo de listagem para o histórico do paciente.
     */
    public enum TipoListagem { PROXIMAS, HISTORICO }

    @Transactional(readOnly = true)
    public com.psiorganizer.consulta.dto.ConsultasPaginadoResponse listarDoPaciente(
            UUID psicologaId, UUID pacienteId, TipoListagem tipo, int limit, int offset) {
        // Garante que o paciente pertence à psicóloga
        Paciente p = pacienteRepository.findByIdAndPsicologaId(pacienteId, psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Paciente não encontrado"));

        Instant agora = Instant.now();
        org.springframework.data.domain.Pageable page =
                org.springframework.data.domain.PageRequest.of(offset / Math.max(limit, 1), limit);

        List<Consulta> consultas;
        long total;
        if (tipo == TipoListagem.PROXIMAS) {
            consultas = consultaRepository.proximasDoPaciente(pacienteId, agora, page);
            total = consultaRepository.contarProximasDoPaciente(pacienteId, agora);
        } else {
            consultas = consultaRepository.historicoDoPaciente(pacienteId, agora, page);
            total = consultaRepository.contarHistoricoDoPaciente(pacienteId, agora);
        }

        boolean temMais = offset + consultas.size() < total;
        List<com.psiorganizer.consulta.dto.ConsultaResponse> itens = consultas.stream()
                .map(c -> com.psiorganizer.consulta.dto.ConsultaResponse.from(c, p.getNome()))
                .toList();
        return new com.psiorganizer.consulta.dto.ConsultasPaginadoResponse(itens, total, temMais);
    }

    @Transactional
    public void remover(UUID psicologaId, UUID id) {
        Consulta c = buscar(psicologaId, id);
        consultaRepository.delete(c);
    }

    public Map<UUID, String> nomesPacientes(List<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return pacienteRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Paciente::getId, Paciente::getNome, (a, b) -> a));
    }

    private Paciente validarPaciente(UUID psicologaId, UUID pacienteId) {
        Paciente paciente = pacienteRepository.findByIdAndPsicologaId(pacienteId, psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Paciente não encontrado"));
        if (!paciente.isAtivo()) {
            throw ApiException.requisicaoInvalida("Paciente inativo não pode receber novas consultas");
        }
        return paciente;
    }

    void validarConflito(UUID psicologaId, Instant inicio, int duracaoMinutos, UUID idIgnorar) {
        Instant fim = inicio.plusSeconds(duracaoMinutos * 60L);
        Instant janelaMin = inicio.minus(JANELA_CONFLITO);
        List<Consulta> candidatos = consultaRepository.candidatosConflito(psicologaId, janelaMin, fim);
        for (Consulta c : candidatos) {
            if (idIgnorar != null && c.getId().equals(idIgnorar)) continue;
            if (c.fim().isAfter(inicio) && c.getInicio().isBefore(fim)) {
                throw ApiException.conflito("Já existe uma consulta neste horário");
            }
        }
    }
}
