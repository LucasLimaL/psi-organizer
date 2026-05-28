package com.psiorganizer.psicologa;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.psicologa.dto.PsicologaResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me")
@Tag(name = "Perfil", description = "Dados da psicóloga autenticada")
public class PerfilController {

    private final PsicologaService psicologaService;

    public PerfilController(PsicologaService psicologaService) {
        this.psicologaService = psicologaService;
    }

    @GetMapping
    @Operation(summary = "Retorna dados da psicóloga autenticada")
    public PsicologaResponse me() {
        var principal = PsicologaPrincipal.corrente();
        return PsicologaResponse.fromDomain(psicologaService.buscarPorId(principal.id()));
    }
}
