package com.psiorganizer.admin.dto;

import java.time.LocalDateTime;

/**
 * `dataHoraPagamento` opcional (fuso SP) — ausente = agora.
 * Ignorada no estorno (paga=false).
 */
public record BaixaFaturaRequest(boolean paga, LocalDateTime dataHoraPagamento) {}
