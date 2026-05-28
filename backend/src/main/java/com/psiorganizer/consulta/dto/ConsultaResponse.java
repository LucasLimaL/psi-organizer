package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.StatusConsulta;

public record ConsultaResponse(
        UUID id,
        UUID pacienteId,
        String pacienteNome,
        Instant inicio,
        int duracaoMinutos,
        BigDecimal valor,
        StatusConsulta status,
        boolean pago,
        String observacoes
) {
    public static ConsultaResponse from(Consulta c, String pacienteNome) {
        return new ConsultaResponse(c.getId(), c.getPacienteId(), pacienteNome,
                c.getInicio(), c.getDuracaoMinutos(), c.getValor(),
                c.getStatus(), c.isPago(), c.getObservacoes());
    }
}
