package com.psiorganizer.dashboard;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.security.PsicologaPrincipal;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/dashboard")
@Tag(name = "Dashboard", description = "Métricas agregadas para a tela inicial")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Retorna métricas de hoje, mês corrente, comparativo, "
            + "próximos 7 dias, contagem de pacientes e próximas consultas")
    public DashboardResponse get() {
        return service.calcular(PsicologaPrincipal.corrente().id());
    }
}
