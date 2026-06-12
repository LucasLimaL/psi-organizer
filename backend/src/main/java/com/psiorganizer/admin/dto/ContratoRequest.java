package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record ContratoRequest(
        @NotNull LocalDate dataInicio,
        /** null = prazo indeterminado. */
        LocalDate dataFim,
        @NotNull @DecimalMin(value = "0.00") BigDecimal valorMensal) {}
