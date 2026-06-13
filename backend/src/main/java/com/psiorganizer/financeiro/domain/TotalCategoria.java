package com.psiorganizer.financeiro.domain;

import java.math.BigDecimal;

/** Projeção agregada de uma categoria financeira (soma de valores + contagem). */
public record TotalCategoria(BigDecimal total, long quantidade) {

    public TotalCategoria {
        if (total == null) total = BigDecimal.ZERO;
    }
}
