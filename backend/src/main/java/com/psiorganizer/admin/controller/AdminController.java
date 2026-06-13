package com.psiorganizer.admin.controller;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.psiorganizer.admin.dto.AdminPsicologaResponse;
import com.psiorganizer.admin.dto.AdminPsicologasPaginadoResponse;
import com.psiorganizer.admin.dto.BaixaFaturaRequest;
import com.psiorganizer.admin.dto.BloqueioRequest;
import com.psiorganizer.admin.dto.ContratoRequest;
import com.psiorganizer.admin.dto.ContratoResponse;
import com.psiorganizer.admin.dto.FaturaResponse;
import com.psiorganizer.admin.dto.FaturasResponse;
import com.psiorganizer.admin.service.AdminService;
import com.psiorganizer.common.observability.LogFields;
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

    @GetMapping("/psicologos")
    @Operation(summary = "Lista paginada de psicólogos com contrato ativo e pendências "
            + "(busca por nome ou e-mail)")
    public AdminPsicologasPaginadoResponse psicologos(
            @RequestParam(defaultValue = "") String busca,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarPsicologas(solicitanteId, busca.trim(),
                Math.max(1, Math.min(50, limit)), Math.max(0, offset));
    }

    @GetMapping("/psicologos/{id}")
    @Operation(summary = "Detalhe de um psicólogo: cadastro, contrato ativo e pendências")
    public AdminPsicologaResponse psicologo(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.buscarPsicologa(solicitanteId, id);
    }

    @PutMapping("/psicologos/{id}/bloqueio")
    @Operation(summary = "Bloqueia ou desbloqueia o acesso de um psicólogo "
            + "(vale a partir do próximo login)")
    public ResponseEntity<Void> bloquear(@PathVariable UUID id,
                                         @RequestBody BloqueioRequest req) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        service.bloquear(solicitanteId, id, req.bloqueada());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/psicologos/{id}/contratos")
    @Operation(summary = "Histórico de contratos do psicólogo (mais recentes primeiro)")
    public List<ContratoResponse> contratos(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarContratos(solicitanteId, id);
    }

    @PostMapping("/psicologos/{id}/contratos")
    @Operation(summary = "Cria um contrato (vigência por datas; sobreposição é recusada)")
    public ResponseEntity<ContratoResponse> criarContrato(@PathVariable UUID id,
                                                          @Valid @RequestBody ContratoRequest req) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        ContratoResponse criado = service.criarContrato(
                solicitanteId, id, req.dataInicio(), req.dataFim(), req.valorMensal());
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @PutMapping("/contratos/{id}/encerrar")
    @Operation(summary = "Encerra um contrato — vale até o fechamento do ciclo corrente "
            + "(fatura final cheia); contrato que ainda não começou é removido")
    public ContratoResponse encerrarContrato(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.encerrarContrato(solicitanteId, id);
    }

    @GetMapping("/psicologos/{id}/faturas")
    @Operation(summary = "Faturas fechadas (com rateio por contrato) + prévias do ciclo "
            + "corrente e do próximo. Ciclos fechados são materializados automaticamente.")
    public FaturasResponse faturas(@PathVariable UUID id) {
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.listarFaturas(solicitanteId, id);
    }

    @PutMapping("/faturas/{id}/baixa")
    @Operation(summary = "Dá baixa (ou estorna a baixa) de uma fatura. `dataHoraPagamento` "
            + "opcional (fuso SP, default agora). Baixa que regulariza a situação desfaz "
            + "bloqueio automático por inadimplência.")
    public FaturaResponse darBaixa(@PathVariable UUID id,
                                   @RequestBody BaixaFaturaRequest req) {
        // Auditoria: completion log da request carrega quem (psicologaId/email do
        // admin, já no MDC), qual fatura e o quê (baixa × estorno + data informada)
        MDC.put(LogFields.FATURA_ID, id.toString());
        MDC.put(LogFields.FATURA_PAGA, String.valueOf(req.paga()));
        if (req.dataHoraPagamento() != null) {
            MDC.put(LogFields.DATA_HORA_PAGAMENTO, req.dataHoraPagamento().toString());
        }
        UUID solicitanteId = PsicologaPrincipal.corrente().id();
        return service.darBaixa(solicitanteId, id, req.paga(), req.dataHoraPagamento());
    }
}
