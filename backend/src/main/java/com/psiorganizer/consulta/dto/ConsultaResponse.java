package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.consulta.domain.Consulta;
import com.psiorganizer.consulta.domain.StatusConfirmacao;
import com.psiorganizer.consulta.domain.StatusConsulta;
import com.psiorganizer.whatsapp.domain.EtapaLembrete;
import com.psiorganizer.whatsapp.domain.StatusEntrega;

public record ConsultaResponse(
        UUID id,
        UUID pacienteId,
        String pacienteNome,
        Instant inicio,
        int duracaoMinutos,
        BigDecimal valor,
        StatusConsulta status,
        boolean pago,
        String observacoes,
        StatusConfirmacao statusConfirmacao,
        Instant confirmadaPelaPacienteEm,
        EtapaLembrete lembreteEtapa,
        StatusEntrega lembreteStatusEntrega,
        Instant lembreteEnviadoEm) {
    public static ConsultaResponse from(Consulta c, String pacienteNome) {
        return from(c, pacienteNome, null, null, null);
    }

    public static ConsultaResponse from(Consulta c, String pacienteNome,
                                        EtapaLembrete lembreteEtapa,
                                        StatusEntrega lembreteStatusEntrega,
                                        Instant lembreteEnviadoEm) {
        return new ConsultaResponse(c.getId(), c.getPacienteId(), pacienteNome,
                c.getInicio(), c.getDuracaoMinutos(), c.getValor(),
                c.getStatus(), c.isPago(), c.getObservacoes(),
                c.getStatusConfirmacao(), c.getConfirmadaPelaPacienteEm(),
                lembreteEtapa, lembreteStatusEntrega, lembreteEnviadoEm);
    }
}
