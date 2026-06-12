package com.psiorganizer.admin.dto;

import java.time.LocalDate;

/** `dataPagamento` opcional — ausente = hoje. Ignorada no estorno (paga=false). */
public record BaixaFaturaRequest(boolean paga, LocalDate dataPagamento) {}
