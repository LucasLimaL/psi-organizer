package com.psiorganizer.financeiro.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.StatusConsulta;

/** Visão enxuta de uma consulta pra tela financeiro — sem campos de agenda/lembrete. */
public record FinanceiroConsultaResponse(
        UUID id,
        UUID pacienteId,
        String pacienteNome,
        Instant inicio,
        BigDecimal valor,
        StatusConsulta status,
        boolean pago,
        Instant pagoEm) {

    public static FinanceiroConsultaResponse from(Consulta c, String pacienteNome) {
        return new FinanceiroConsultaResponse(c.getId(), c.getPacienteId(), pacienteNome,
                c.getInicio(), c.getValor(), c.getStatus(), c.isPago(), c.getPagoEm());
    }
}
