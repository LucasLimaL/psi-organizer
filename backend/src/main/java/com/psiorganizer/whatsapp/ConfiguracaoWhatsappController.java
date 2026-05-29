package com.psiorganizer.whatsapp;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.whatsapp.dto.AtualizarConfiguracaoWhatsappRequest;
import com.psiorganizer.whatsapp.dto.ConfiguracaoWhatsappResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/whatsapp")
@Tag(name = "WhatsApp", description = "Configuração de lembretes automáticos via WhatsApp")
public class ConfiguracaoWhatsappController {

    private final ConfiguracaoWhatsappService service;

    public ConfiguracaoWhatsappController(ConfiguracaoWhatsappService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Retorna a configuração de WhatsApp da psicóloga autenticada")
    public ConfiguracaoWhatsappResponse obter() {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return ConfiguracaoWhatsappResponse.fromDomain(service.obterOuCriar(psicologaId));
    }

    @PutMapping
    @Operation(summary = "Atualiza ativo, template e horário de envio dos lembretes")
    public ConfiguracaoWhatsappResponse atualizar(
            @Valid @RequestBody AtualizarConfiguracaoWhatsappRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        ConfiguracaoWhatsapp c = service.atualizar(
                psicologaId,
                req.ativo(),
                req.templateMensagem(),
                ConfiguracaoWhatsappResponse.parseHorario(req.horarioEnvioLembrete()));
        return ConfiguracaoWhatsappResponse.fromDomain(c);
    }
}
