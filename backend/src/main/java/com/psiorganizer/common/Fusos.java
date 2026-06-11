package com.psiorganizer.common;

import java.time.ZoneId;

/**
 * Fuso único das conversões de borda. Banco e domínio operam em UTC; a borda
 * (controllers, dashboard, scheduler, seed) converte usando ZONA_BR.
 * Política em docs/ARCHITECTURE.md §2.8.
 */
public final class Fusos {

    public static final ZoneId ZONA_BR = ZoneId.of("America/Sao_Paulo");

    private Fusos() {}
}
