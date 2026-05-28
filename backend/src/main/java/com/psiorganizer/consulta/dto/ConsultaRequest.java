package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.*;

public record ConsultaRequest(
        @NotNull UUID pacienteId,
        @NotNull Instant inicio,
        @Min(1) @Max(600) int duracaoMinutos,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal valor,
        String observacoes
) {}
