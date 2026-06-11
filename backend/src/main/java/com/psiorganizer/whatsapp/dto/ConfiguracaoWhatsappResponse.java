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
    /**
     * Prévia do template do lembrete (Msg 1), exposta read-only. Precisa espelhar o
     * template registrado e APROVADO na plataforma da Meta (nome em
     * psi.whatsapp.template-lembrete-nome) — alterar texto exige nova aprovação lá,
     * não aqui. Parâmetros renderizados por LembreteEnvioService.renderParametros:
     * {{1}}=primeiro nome da paciente, {{2}}=nome da psi, {{3}}=data, {{4}}=hora.
     */
    public static final String TEMPLATE_LEMBRETE_META =
            "Olá, {{1}}!\n\n"
            + "Lembrete da sua consulta com {{2}} no dia {{3}} às {{4}}.\n\n"
            + "Pode confirmar abaixo?";

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    public static ConfiguracaoWhatsappResponse fromDomain(ConfiguracaoWhatsapp c) {
        return new ConfiguracaoWhatsappResponse(
                c.isAtivo(),
                TEMPLATE_LEMBRETE_META,
                c.getHorarioEnvioLembrete().format(HORA),
                c.getAtualizadoEm());
    }

    public static LocalTime parseHorario(String hhmm) {
        return LocalTime.parse(hhmm, HORA);
    }
}
