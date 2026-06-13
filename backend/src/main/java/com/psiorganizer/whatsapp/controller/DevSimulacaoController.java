package com.psiorganizer.whatsapp.controller;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.whatsapp.service.MaquinaEstadosService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Endpoint só pra dev (psi.whatsapp.dev-tools=true). Permite simular a resposta da
 * paciente direto na máquina de estados, sem precisar Meta real. Útil pra testar
 * todo o fluxo de confirmação dupla offline.
 *
 * Em prod, basta NÃO sobrescrever psi.whatsapp.dev-tools — o bean não sobe e o
 * endpoint não fica registrado.
 */
@RestController
@RequestMapping("/dev/whatsapp")
@Tag(name = "Dev — simulação WhatsApp",
        description = "Injeta resposta da paciente direto na máquina de estados. Profile dev.")
@ConditionalOnProperty(name = "psi.whatsapp.dev-tools", havingValue = "true")
public class DevSimulacaoController {

    private final MaquinaEstadosService maquina;

    public DevSimulacaoController(MaquinaEstadosService maquina) {
        this.maquina = maquina;
    }

    @PostMapping("/simular-resposta")
    @Operation(summary = "Simula clique de botão da paciente na máquina de estados")
    public ResponseEntity<Void> simular(@Valid @RequestBody SimulacaoRequest req) {
        maquina.processarResposta(req.lembreteId(), req.botaoId(), req.textoLivre());
        return ResponseEntity.noContent().build();
    }

    public record SimulacaoRequest(
            @NotNull UUID lembreteId,
            String botaoId,
            String textoLivre) {}
}
