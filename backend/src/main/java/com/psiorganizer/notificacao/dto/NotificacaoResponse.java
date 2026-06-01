package com.psiorganizer.notificacao.dto;

import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.notificacao.Notificacao;

public record NotificacaoResponse(
        UUID id,
        String tipo,
        String payloadJson,
        Instant criadaEm,
        Instant lidaEm) {

    public static NotificacaoResponse fromDomain(Notificacao n) {
        return new NotificacaoResponse(
                n.getId(), n.getTipo(), n.getPayloadJson(), n.getCriadaEm(), n.getLidaEm());
    }
}
