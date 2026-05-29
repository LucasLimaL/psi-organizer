package com.psiorganizer.paciente.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import com.psiorganizer.common.validation.Cpf;
import com.psiorganizer.common.validation.TelefoneE164;
import com.psiorganizer.psicologa.dto.EnderecoDto;

public record PacienteRequest(
        @NotBlank String nome,
        @Cpf String cpf,
        @NotNull @PastOrPresent LocalDate dataNascimento,
        @NotBlank @TelefoneE164 String telefone,
        @Email String email,
        @Valid EnderecoDto endereco,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal valorConsulta,
        String observacoes,
        boolean optInWhatsapp
) {}
