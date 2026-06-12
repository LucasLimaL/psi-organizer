package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.util.UUID;

/** Projeção de mensalidades em aberto por psicóloga. */
public record PendenciaProjecao(UUID psicologaId, long quantidade, BigDecimal total) {}
