package com.psiorganizer.whatsapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.psiorganizer.common.validation.TemplateValido;

public record AtualizarConfiguracaoWhatsappRequest(
        @NotNull Boolean ativo,
        @NotBlank @Size(max = 1024) @TemplateValido String templateMensagem,
        @NotBlank @Pattern(regexp = "^([01]\\d|2[0-3]):00$",
                           message = "Horário precisa ser uma hora cheia no formato HH:00")
        String horarioEnvioLembrete
) {}
