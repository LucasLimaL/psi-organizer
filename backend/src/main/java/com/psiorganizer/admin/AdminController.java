package com.psiorganizer.admin;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.psiorganizer.admin.dto.AdminPsicologasPaginadoResponse;
import com.psiorganizer.admin.dto.BaixaMensalidadeRequest;
import com.psiorganizer.admin.dto.BloqueioRequest;
import com.psiorganizer.admin.dto.ContratoRequest;
import com.psiorganizer.admin.dto.ContratoResponse;
import com.psiorganizer.admin.dto.MensalidadeResponse;
import com.psiorganizer.common.security.PsicologaPrincipal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/admin")
@Tag(name = "Admin", description = "Gestão de contas do SaaS — exclusivo de administradores. "
        + "Dados cadastrais e contratuais apenas; dados clínicos ficam fora.")
public class AdminController {

    private final AdminService service;

    public AdminController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/psicologas")
    @Operation(summary = "Lista paginada de psicólogas com contrato ativo e pendências "
            + "(busca por nome ou e-mail)")
    public AdminPsicologasPaginadoResponse psicologas(
            @RequestParam(defaultValue = "") String busca,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarPsicologas(solicitanteId, busca.trim(),
                Math.max(1, Math.min(50, limit)), Math.max(0, offset));
    }

    @PutMapping("/psicologas/{id}/bloqueio")
    @Operation(summary = "Bloqueia ou desbloqueia o acesso de uma psicóloga "
            + "(vale a partir do próximo login)")
    public ResponseEntity<Void> bloquear(@PathVariable UUID id,
                                         @RequestBody BloqueioRequest req) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        service.bloquear(solicitanteId, id, req.bloqueada());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/psicologas/{id}/contratos")
    @Operation(summary = "Histórico de contratos da psicóloga (mais recentes primeiro)")
    public List<ContratoResponse> contratos(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarContratos(solicitanteId, id);
    }

    @PostMapping("/psicologas/{id}/contratos")
    @Operation(summary = "Cria um contrato para a psicóloga — o contrato ativo anterior "
            + "(se houver) é desativado")
    public ResponseEntity<ContratoResponse> criarContrato(@PathVariable UUID id,
                                                          @Valid @RequestBody ContratoRequest req) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        ContratoResponse criado = service.criarContrato(
                solicitanteId, id, req.dataInicio(), req.dataFim(), req.valorMensal());
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @PutMapping("/contratos/{id}/encerrar")
    @Operation(summary = "Encerra (desativa) um contrato — para de gerar novas mensalidades")
    public ContratoResponse encerrarContrato(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.encerrarContrato(solicitanteId, id);
    }

    @GetMapping("/psicologas/{id}/mensalidades")
    @Operation(summary = "Histórico de mensalidades da psicóloga (competências vencidas são "
            + "materializadas automaticamente a partir do contrato ativo)")
    public List<MensalidadeResponse> mensalidades(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarMensalidades(solicitanteId, id);
    }

    @PutMapping("/mensalidades/{id}/baixa")
    @Operation(summary = "Dá baixa (ou estorna a baixa) de uma mensalidade")
    public MensalidadeResponse darBaixa(@PathVariable UUID id,
                                        @RequestBody BaixaMensalidadeRequest req) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.darBaixa(solicitanteId, id, req.paga());
    }
}
