package com.psiorganizer.consulta;

import java.time.DayOfWeek;

public enum DiaSemana {
    SEG(DayOfWeek.MONDAY),
    TER(DayOfWeek.TUESDAY),
    QUA(DayOfWeek.WEDNESDAY),
    QUI(DayOfWeek.THURSDAY),
    SEX(DayOfWeek.FRIDAY),
    SAB(DayOfWeek.SATURDAY),
    DOM(DayOfWeek.SUNDAY);

    private final DayOfWeek dayOfWeek;

    DiaSemana(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public DayOfWeek toDayOfWeek() { return dayOfWeek; }
}
