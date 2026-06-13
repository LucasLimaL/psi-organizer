package com.psiorganizer.admin.domain;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Aritmética do ciclo de fechamento. O dia de fechamento (1-31) é por
 * psicólogo; mês mais curto fecha no último dia. Um ciclo vai do dia
 * seguinte ao fechamento anterior até o fechamento corrente, inclusive.
 * Ex.: dia 25 → ciclo 26/05 a 25/06 · dia 31 → mês-calendário.
 */
public final class Ciclos {

    private Ciclos() {}

    /** Data de fechamento dentro do mês — clampada no último dia do mês. */
    public static LocalDate fechamentoDoMes(YearMonth mes, int diaFechamento) {
        return mes.atDay(Math.min(diaFechamento, mes.lengthOfMonth()));
    }

    /** Fim (fechamento) do ciclo que contém a data d. */
    public static LocalDate fimDoCiclo(LocalDate d, int diaFechamento) {
        LocalDate fech = fechamentoDoMes(YearMonth.from(d), diaFechamento);
        return d.isAfter(fech)
                ? fechamentoDoMes(YearMonth.from(d).plusMonths(1), diaFechamento)
                : fech;
    }

    /** Início do ciclo cujo fechamento é fimCiclo. */
    public static LocalDate inicioDoCiclo(LocalDate fimCiclo, int diaFechamento) {
        return fechamentoDoMes(YearMonth.from(fimCiclo).minusMonths(1), diaFechamento)
                .plusDays(1);
    }

    /** Fim do ciclo seguinte ao que fecha em fimCiclo. */
    public static LocalDate proximoFim(LocalDate fimCiclo, int diaFechamento) {
        return fimDoCiclo(fimCiclo.plusDays(1), diaFechamento);
    }
}
