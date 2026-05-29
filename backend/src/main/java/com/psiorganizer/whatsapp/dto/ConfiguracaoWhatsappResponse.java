package com.psiorganizer.whatsapp.dto;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import com.psiorganizer.whatsapp.ConfiguracaoWhatsapp;

public record ConfiguracaoWhatsappResponse(
        boolean ativo,
        String templateMensagem,
        String horarioEnvioLembrete,
        Instant atualizadoEm
) {
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public static ConfiguracaoWhatsappResponse fromDomain(ConfiguracaoWhatsapp c) {
        return new ConfiguracaoWhatsappResponse(
                c.isAtivo(),
                c.getTemplateMensagem(),
                c.getHorarioEnvioLembrete().format(HORA),
                c.getAtualizadoEm());
    }

    public static LocalTime parseHorario(String hhmm) {
        return LocalTime.parse(hhmm, HORA);
    }
}
