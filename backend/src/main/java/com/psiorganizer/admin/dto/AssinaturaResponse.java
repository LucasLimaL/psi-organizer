package com.psiorganizer.admin.dto;

import java.util.List;

/**
 * Visão self-service da assinatura do psicólogo autenticado — mesmos dados
 * que o admin enxerga no detalhe, escopados ao próprio tenant e sem ações.
 */
public record AssinaturaResponse(
        int diaFechamento,
        List<ContratoResponse> contratos,
        List<FaturaResponse> faturas,
        List<PreviaFaturaResponse> previas) {}
