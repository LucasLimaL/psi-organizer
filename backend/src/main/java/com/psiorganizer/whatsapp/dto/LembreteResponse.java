package com.psiorganizer.whatsapp.dto;

import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.whatsapp.domain.EscolhaLembrete;
import com.psiorganizer.whatsapp.domain.EtapaLembrete;
import com.psiorganizer.whatsapp.domain.LembreteEnviado;
import com.psiorganizer.whatsapp.domain.StatusEntrega;

public record LembreteResponse(
        UUID id,
        UUID consultaId,
        String pacienteNome,
        Instant consultaInicio,
        Instant enviadoEm,
        StatusEntrega statusEntrega,
        EtapaLembrete etapa,
        EscolhaLembrete escolhaInicial,
        EscolhaLembrete escolhaFinal,
        int ciclosVoltar,
        int confirmacaoDuplaTentativas,
        String erroCodigo,
        String erroDescricao) {

    public static LembreteResponse from(LembreteEnviado le, String pacienteNome,
                                        Instant consultaInicio) {
        return new LembreteResponse(
                le.getId(),
                le.getConsultaId(),
                pacienteNome,
                consultaInicio,
                le.getEnviadoEm(),
                le.getStatusEntrega(),
                le.getEtapa(),
                le.getEscolhaInicial(),
                le.getEscolhaFinal(),
                le.getCiclosVoltar(),
                le.getConfirmacaoDuplaTentativas(),
                le.getErroCodigo(),
                le.getErroDescricao());
    }
}
