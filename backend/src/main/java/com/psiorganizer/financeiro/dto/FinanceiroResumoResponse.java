package com.psiorganizer.financeiro.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resumo financeiro de um período (mês ou ano, regime de competência).
 * `pendentesAnteriores` acumula tudo que é cobrável e não pago ANTES do
 * início do período — alimenta o banner fixo de inadimplência da tela.
 * `anosDisponiveis` lista os anos com consultas (desc), pro filtro anual.
 */
public record FinanceiroResumoResponse(
        Categoria pendentes,
        Categoria realizados,
        Categoria futuros,
        Categoria pendentesAnteriores,
        List<Integer> anosDisponiveis) {

    public record Categoria(long quantidade, BigDecimal total) {}
}
