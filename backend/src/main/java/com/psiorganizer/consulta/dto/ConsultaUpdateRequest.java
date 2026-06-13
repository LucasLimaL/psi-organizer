package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.*;

import com.psiorganizer.consulta.domain.StatusConsulta;

public record ConsultaUpdateRequest(
        @NotNull Instant inicio,
        @Min(1) @Max(600) int duracaoMinutos,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal valor,
        @NotNull StatusConsulta status,
        boolean pago,
        /** Instante do pagamento. Opcional — ausente na transição → usa agora (UTC). */
        Instant pagoEm,
        String observacoes
) {}
