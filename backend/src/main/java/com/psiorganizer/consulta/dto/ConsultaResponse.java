package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.StatusConfirmacao;
import com.psiorganizer.consulta.StatusConsulta;
import com.psiorganizer.whatsapp.EtapaLembrete;
import com.psiorganizer.whatsapp.StatusEntrega;

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
