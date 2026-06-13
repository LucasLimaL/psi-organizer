package com.psiorganizer.financeiro.domain;

import java.math.BigDecimal;
import java.util.UUID;

/** Projeção agregada de pendências por paciente (uma linha por paciente). */
public record GrupoPendenteProjecao(UUID pacienteId, long quantidade, BigDecimal total) {}
