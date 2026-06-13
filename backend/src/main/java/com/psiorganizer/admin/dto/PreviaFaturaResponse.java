package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.psiorganizer.admin.service.FaturaService;

/** Ciclo ainda não fechado (corrente/próximo) — projeção calculada, não persiste. */
public record PreviaFaturaResponse(
        LocalDate periodoInicio,
        LocalDate periodoFim,
        LocalDate vencimento,
        BigDecimal valor,
        List<ItemPrevia> itens) {

    public record ItemPrevia(
            UUID contratoId,
            LocalDate periodoInicio,
            LocalDate periodoFim,
            int dias,
            BigDecimal valor) {}

    public static PreviaFaturaResponse from(FaturaService.Previa p) {
        return new PreviaFaturaResponse(p.periodoInicio(), p.periodoFim(), p.vencimento(),
                p.valor(),
                p.itens().stream()
                        .map(i -> new ItemPrevia(i.contratoId(), i.inicio(), i.fim(),
                                i.dias(), i.valor()))
                        .toList());
    }
}
