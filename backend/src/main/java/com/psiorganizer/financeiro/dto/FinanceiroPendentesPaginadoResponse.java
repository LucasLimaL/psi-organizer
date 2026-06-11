package com.psiorganizer.financeiro.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Pendências agrupadas por paciente (quem deve, quanto, quais consultas),
 * ordenadas por total devido desc. Paginação por GRUPO (paciente), não por
 * consulta — `temMais` indica mais pacientes além da página atual.
 */
public record FinanceiroPendentesPaginadoResponse(
        List<GrupoPendente> grupos,
        long totalGrupos,
        boolean temMais) {

    public record GrupoPendente(
            UUID pacienteId,
            String pacienteNome,
            long quantidade,
            BigDecimal total,
            List<FinanceiroConsultaResponse> consultas) {}
}
