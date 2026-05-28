package com.psiorganizer.paciente;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.paciente.dto.PacienteRequest;
import com.psiorganizer.paciente.dto.PacienteResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/pacientes")
@Tag(name = "Pacientes", description = "CRUD de pacientes")
public class PacienteController {

    private final PacienteService service;

    public PacienteController(PacienteService service) {
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
                req.valorConsulta(), req.observacoes());
        return ResponseEntity.status(HttpStatus.CREATED).body(PacienteResponse.fromDomain(p));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza um paciente")
    public PacienteResponse atualizar(@PathVariable UUID id, @Valid @RequestBody PacienteRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Paciente p = service.atualizar(psicologaId, id, req.nome(), req.cpf(), req.dataNascimento(),
                req.telefone(), req.email(), req.endereco().toDomain(),
                req.valorConsulta(), req.observacoes());
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
}
