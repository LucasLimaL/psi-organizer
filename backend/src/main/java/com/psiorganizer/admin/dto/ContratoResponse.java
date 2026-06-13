package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.psiorganizer.admin.domain.Contrato;

/** Sem flag de estado — vigência derivada das datas (null = indeterminado). */
public record ContratoResponse(
        UUID id,
        LocalDate dataInicio,
        LocalDate dataFim,
        BigDecimal valorMensal) {

    public static ContratoResponse from(Contrato c) {
        return new ContratoResponse(c.getId(), c.getDataInicio(), c.getDataFim(),
                c.getValorMensal());
    }
}
