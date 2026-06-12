package com.psiorganizer.admin.dto;

import java.util.List;

/** Faturas fechadas (persistidas) + prévias do ciclo corrente e do próximo. */
public record FaturasResponse(
        List<FaturaResponse> faturas,
        List<PreviaFaturaResponse> previas) {}
