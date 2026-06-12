package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.admin.Mensalidade;

public record MensalidadeResponse(
        UUID id,
        UUID contratoId,
        String competencia,
        BigDecimal valor,
        boolean paga,
        Instant pagaEm) {

    public static MensalidadeResponse from(Mensalidade m) {
        return new MensalidadeResponse(m.getId(), m.getContratoId(), m.getCompetencia(),
                m.getValor(), m.isPaga(), m.getPagaEm());
    }
}
