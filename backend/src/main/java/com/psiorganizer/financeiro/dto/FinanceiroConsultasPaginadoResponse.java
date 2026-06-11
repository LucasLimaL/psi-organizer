package com.psiorganizer.financeiro.dto;

import java.util.List;

/** Envelope de paginação das listas cronológicas (realizados / futuros). */
public record FinanceiroConsultasPaginadoResponse(
        List<FinanceiroConsultaResponse> consultas,
        long total,
        boolean temMais) {}
