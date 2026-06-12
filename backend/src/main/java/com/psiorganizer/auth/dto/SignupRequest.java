package com.psiorganizer.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import com.psiorganizer.common.validation.Cpf;
import com.psiorganizer.common.validation.SenhaValida;
import com.psiorganizer.psicologa.dto.EnderecoDto;

public record SignupRequest(
        @NotBlank String nomeCompleto,
        @NotBlank @Email String email,
        @SenhaValida String senha,
        @Cpf String cpf,
        @NotBlank String crp,
        @NotBlank String telefone,
        /** Dia de fechamento da fatura (1-31; mês curto fecha no último dia). */
        @Min(1) @Max(31) int diaFechamento,
        @Valid EnderecoDto endereco
) {}
