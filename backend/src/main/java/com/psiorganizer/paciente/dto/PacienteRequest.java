package com.psiorganizer.paciente.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import com.psiorganizer.common.validation.Cpf;
import com.psiorganizer.psicologa.dto.EnderecoDto;

public record PacienteRequest(
        @NotBlank String nome,
        @Cpf String cpf,
        @NotNull @PastOrPresent LocalDate dataNascimento,
        @NotBlank String telefone,
        @Email String email,
        @Valid EnderecoDto endereco,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal valorConsulta,
        String observacoes
) {}
