package com.psiorganizer.consulta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.psiorganizer.consulta.DiaSemana;

public record ConsultaRecorrenteRequest(
        @NotNull UUID pacienteId,
        @NotNull DiaSemana diaDaSemana,
        @NotNull @JsonFormat(pattern = "HH:mm") LocalTime horario,
        @Min(1) @Max(52) int intervaloSemanas,
        @Min(1) @Max(600) int duracaoMinutos,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal valor,
        @NotNull LocalDate inicioEm,
        @NotNull LocalDate fimEm,
        String observacoes
) {}
