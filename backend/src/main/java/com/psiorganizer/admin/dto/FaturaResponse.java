package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.psiorganizer.admin.Fatura;
import com.psiorganizer.admin.FaturaItem;

/** Status derivado: PAGA · VENCIDA (vencimento passou) · A_VENCER. */
public record FaturaResponse(
        UUID id,
        LocalDate periodoInicio,
        LocalDate periodoFim,
        LocalDate vencimento,
        BigDecimal valor,
        boolean paga,
        Instant pagaEm,
        String status,
        List<FaturaItemResponse> itens) {

    public record FaturaItemResponse(
            UUID contratoId,
            LocalDate periodoInicio,
            LocalDate periodoFim,
            int dias,
            BigDecimal valor) {

        public static FaturaItemResponse from(FaturaItem i) {
            return new FaturaItemResponse(i.getContratoId(), i.getPeriodoInicio(),
                    i.getPeriodoFim(), i.getDias(), i.getValor());
        }
    }

    public static FaturaResponse from(Fatura f, List<FaturaItem> itens, LocalDate hoje) {
        String status = f.isPaga() ? "PAGA" : f.vencida(hoje) ? "VENCIDA" : "A_VENCER";
        return new FaturaResponse(f.getId(), f.getPeriodoInicio(), f.getPeriodoFim(),
                f.getVencimento(), f.getValor(), f.isPaga(), f.getPagaEm(), status,
                itens.stream().map(FaturaItemResponse::from).toList());
    }
}
