package com.psiorganizer.whatsapp;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.ConsultaRepository;
import com.psiorganizer.paciente.Paciente;
import com.psiorganizer.paciente.PacienteRepository;
import com.psiorganizer.whatsapp.dto.LembreteResponse;
import com.psiorganizer.whatsapp.dto.LembretesEnvelope;

/**
 * Consultas paginadas de lembretes pra auditoria. Spec §3.2 /me/whatsapp/lembretes.
 */
@Service
public class HistoricoLembretesService {

    private final LembreteEnviadoRepository lembreteRepo;
    private final ConsultaRepository consultaRepo;
    private final PacienteRepository pacienteRepo;

    public HistoricoLembretesService(LembreteEnviadoRepository lembreteRepo,
                                     ConsultaRepository consultaRepo,
                                     PacienteRepository pacienteRepo) {
        this.lembreteRepo = lembreteRepo;
        this.consultaRepo = consultaRepo;
        this.pacienteRepo = pacienteRepo;
    }

    @Transactional(readOnly = true)
    public LembretesEnvelope listar(UUID psicologaId,
                                    UUID consultaId,
                                    EtapaLembrete etapa,
                                    StatusEntrega statusEntrega,
                                    Instant enviadoApos,
                                    Instant enviadoAntes,
                                    int limit,
                                    int offset) {
        int limitSeguro = Math.max(1, Math.min(200, limit));
        int offsetSeguro = Math.max(0, offset);

        List<LembreteEnviado> page = lembreteRepo.historicoPaginado(
                psicologaId, consultaId, etapa, statusEntrega,
                enviadoApos, enviadoAntes,
                PageRequest.of(offsetSeguro / limitSeguro, limitSeguro));
        long total = lembreteRepo.historicoCount(
                psicologaId, consultaId, etapa, statusEntrega,
                enviadoApos, enviadoAntes);

        // Bulk-fetch consultas e pacientes pra evitar N+1 ao montar a resposta
        List<UUID> consultaIds = page.stream().map(LembreteEnviado::getConsultaId).distinct().toList();
        Map<UUID, Consulta> consultas = consultaRepo.findAllById(consultaIds).stream()
                .collect(Collectors.toMap(Consulta::getId, c -> c));
        List<UUID> pacienteIds = consultas.values().stream()
                .map(Consulta::getPacienteId).distinct().toList();
        Map<UUID, String> nomes = new HashMap<>();
        for (Paciente p : pacienteRepo.findAllById(pacienteIds)) {
            nomes.put(p.getId(), p.getNome());
        }

        List<LembreteResponse> dtos = page.stream().map(le -> {
            Consulta c = consultas.get(le.getConsultaId());
            String nome = c == null ? "?" : nomes.getOrDefault(c.getPacienteId(), "?");
            Instant inicio = c == null ? null : c.getInicio();
            return LembreteResponse.from(le, nome, inicio);
        }).toList();

        boolean temMais = offsetSeguro + dtos.size() < total;
        return new LembretesEnvelope(dtos, total, temMais);
    }
}
