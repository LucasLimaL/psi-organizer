package com.psiorganizer.consulta;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;

import org.slf4j.MDC;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.consulta.dto.ConsultaRecorrenteRequest;
import com.psiorganizer.consulta.dto.ConsultaRequest;
import com.psiorganizer.consulta.dto.ConsultaResponse;
import com.psiorganizer.consulta.dto.ConsultaUpdateRequest;
import com.psiorganizer.whatsapp.LembreteEnviado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/consultas")
@Tag(name = "Consultas", description = "Agenda de consultas")
public class ConsultaController {

    private final ConsultaService service;

    public ConsultaController(ConsultaService service) {
        this.service = service;
    }

    private ConsultaResponse enriquecer(Consulta c, String pacienteNome,
                                        Map<UUID, LembreteEnviado> map) {
        LembreteEnviado le = map.get(c.getId());
        if (le == null) return ConsultaResponse.from(c, pacienteNome);
        return ConsultaResponse.from(
                c, pacienteNome, le.getEtapa(), le.getStatusEntrega(), le.getEnviadoEm());
    }

    @GetMapping
    @Operation(summary = "Lista consultas em um intervalo (datas inclusivas, fuso America/Sao_Paulo)")
    public List<ConsultaResponse> listar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Instant ini = inicio.atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant fimExcl = fim.plusDays(1).atStartOfDay(Fusos.ZONA_BR).toInstant();
        List<Consulta> consultas = service.listar(psicologaId, ini, fimExcl);
        Map<UUID, String> nomes = service.nomesPacientes(
                consultas.stream().map(Consulta::getPacienteId).distinct().toList());
        Map<UUID, LembreteEnviado> lembretes = service.lembretesPorConsulta(consultas);
        return consultas.stream()
                .map(c -> enriquecer(c, nomes.getOrDefault(c.getPacienteId(), "?"), lembretes))
                .toList();
    }

    @GetMapping("/a-revisar")
    @Operation(summary = "Lista paginada de consultas passadas sem desfecho "
            + "(ainda AGENDADA/CONFIRMADA), mais antigas primeiro")
    public com.psiorganizer.consulta.dto.ConsultasPaginadoResponse aRevisar(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return service.listarARevisar(psicologaId,
                Math.max(1, Math.min(50, limit)), Math.max(0, offset));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Busca uma consulta por id")
    public ConsultaResponse buscar(@PathVariable UUID id) {
        MDC.put(LogFields.CONSULTA_ID, id.toString());
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Consulta c = service.buscar(psicologaId, id);
        Map<UUID, String> nomes = service.nomesPacientes(List.of(c.getPacienteId()));
        return enriquecer(c, nomes.getOrDefault(c.getPacienteId(), "?"),
                service.lembretesPorConsulta(List.of(c)));
    }

    @PostMapping
    @Operation(summary = "Cria uma consulta avulsa")
    public ResponseEntity<ConsultaResponse> criar(@Valid @RequestBody ConsultaRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Consulta c = service.criar(psicologaId, req.pacienteId(), req.inicio(),
                req.duracaoMinutos(), req.valor(), req.observacoes());
        Map<UUID, String> nomes = service.nomesPacientes(List.of(c.getPacienteId()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ConsultaResponse.from(c, nomes.getOrDefault(c.getPacienteId(), "?")));
    }

    @PostMapping("/recorrente")
    @Operation(summary = "Cria N consultas semanalmente entre inicioEm e fimEm (transacional)")
    public ResponseEntity<List<ConsultaResponse>> criarRecorrente(
            @Valid @RequestBody ConsultaRecorrenteRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        List<Consulta> criadas = service.criarRecorrente(psicologaId, req.pacienteId(),
                req.diaDaSemana(), req.horario(), req.intervaloSemanas(),
                req.duracaoMinutos(), req.valor(),
                req.inicioEm(), req.fimEm(), req.observacoes());
        Map<UUID, String> nomes = service.nomesPacientes(List.of(req.pacienteId()));
        String nome = nomes.getOrDefault(req.pacienteId(), "?");
        return ResponseEntity.status(HttpStatus.CREATED).body(
                criadas.stream().map(c -> ConsultaResponse.from(c, nome)).toList());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza dados/status/pago de uma consulta")
    public ConsultaResponse atualizar(@PathVariable UUID id,
                                      @Valid @RequestBody ConsultaUpdateRequest req) {
        MDC.put(LogFields.CONSULTA_ID, id.toString());
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Consulta c = service.atualizar(psicologaId, id, req.inicio(), req.duracaoMinutos(),
                req.valor(), req.status(), req.pago(), req.observacoes());
        Map<UUID, String> nomes = service.nomesPacientes(List.of(c.getPacienteId()));
        return ConsultaResponse.from(c, nomes.getOrDefault(c.getPacienteId(), "?"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove uma consulta")
    public ResponseEntity<Void> remover(@PathVariable UUID id) {
        MDC.put(LogFields.CONSULTA_ID, id.toString());
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        service.remover(psicologaId, id);
        return ResponseEntity.noContent().build();
    }
}
