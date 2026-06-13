package com.psiorganizer.admin.controller;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.admin.dto.AssinaturaResponse;
import com.psiorganizer.admin.service.AssinaturaService;
import com.psiorganizer.common.security.PsicologaPrincipal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/assinatura")
@Tag(name = "Assinatura", description = "Contratos e faturas do próprio psicólogo autenticado "
        + "(visão somente leitura — baixa e contratos são geridos pelo admin)")
public class AssinaturaController {

    private final AssinaturaService service;

    public AssinaturaController(AssinaturaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Assinatura do psicólogo autenticado: dia de fechamento, contratos, "
            + "faturas (com rateio) e prévias do ciclo corrente e do próximo")
    public AssinaturaResponse minha() {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return service.minhaAssinatura(psicologaId);
    }
}
