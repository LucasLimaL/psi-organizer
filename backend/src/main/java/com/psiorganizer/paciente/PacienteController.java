package com.psiorganizer.paciente;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.consulta.ConsultaService;
import com.psiorganizer.consulta.dto.ConsultasPaginadoResponse;
import com.psiorganizer.paciente.dto.PacienteRequest;
import com.psiorganizer.paciente.dto.PacienteResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/pacientes")
@Tag(name = "Pacientes", description = "CRUD de pacientes")
public class PacienteController {

    private final PacienteService service;
    private final ConsultaService consultaService;

    public PacienteController(PacienteService service, ConsultaService consultaService) {
        this.consultaService = consultaService;
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista pacientes (ativos por padrão)")
    public List<PacienteResponse> listar(
            @RequestParam(name = "incluirInativos", defaultValue = "false") boolean incluirInativos) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return service.listar(psicologaId, incluirInativos).stream()
                .map(PacienteResponse::fromDomain).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Busca um paciente por id")
    public PacienteResponse buscar(@PathVariable UUID id) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return PacienteResponse.fromDomain(service.buscar(psicologaId, id));
    }

    @PostMapping
    @Operation(summary = "Cria um novo paciente")
    public ResponseEntity<PacienteResponse> criar(@Valid @RequestBody PacienteRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Paciente p = service.criar(psicologaId, req.nome(), req.cpf(), req.dataNascimento(),
                req.telefone(), req.email(), req.endereco().toDomain(),
                req.valorConsulta(), req.observacoes(), req.optInWhatsapp());
        return ResponseEntity.status(HttpStatus.CREATED).body(PacienteResponse.fromDomain(p));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza um paciente")
    public PacienteResponse atualizar(@PathVariable UUID id, @Valid @RequestBody PacienteRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Paciente p = service.atualizar(psicologaId, id, req.nome(), req.cpf(), req.dataNascimento(),
                req.telefone(), req.email(), req.endereco().toDomain(),
                req.valorConsulta(), req.observacoes(), req.optInWhatsapp());
        return PacienteResponse.fromDomain(p);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Inativa um paciente (soft delete) e cancela consultas futuras")
    public ResponseEntity<Void> inativar(@PathVariable UUID id) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        service.inativar(psicologaId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reativar")
    @Operation(summary = "Reativa um paciente previamente inativado")
    public PacienteResponse reativar(@PathVariable UUID id) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return PacienteResponse.fromDomain(service.reativar(psicologaId, id));
    }

    @GetMapping("/{id}/consultas")
    @Operation(summary = "Lista paginada de consultas do paciente. "
            + "tipo=proximas (inicio > agora, ordem asc) ou historico (inicio <= agora, ordem desc).")
    public ConsultasPaginadoResponse listarConsultas(
            @PathVariable UUID id,
            @RequestParam(name = "tipo", defaultValue = "historico") String tipoStr,
            @RequestParam(name = "limit", defaultValue = "5") int limit,
            @RequestParam(name = "offset", defaultValue = "0") int offset) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        ConsultaService.TipoListagem tipo = "proximas".equalsIgnoreCase(tipoStr)
                ? ConsultaService.TipoListagem.PROXIMAS
                : ConsultaService.TipoListagem.HISTORICO;
        int limitSeguro = Math.max(1, Math.min(50, limit));
        int offsetSeguro = Math.max(0, offset);
        return consultaService.listarDoPaciente(psicologaId, id, tipo, limitSeguro, offsetSeguro);
    }
}
