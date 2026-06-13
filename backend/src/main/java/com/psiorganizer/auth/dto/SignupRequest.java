package com.psiorganizer.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.psiorganizer.common.validation.Cpf;
import com.psiorganizer.common.validation.SenhaValida;
import com.psiorganizer.psicologa.dto.EnderecoDto;

public record SignupRequest(
        @NotBlank @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres") String nomeCompleto,
        @NotBlank @Email String email,
        @SenhaValida String senha,
        @Cpf String cpf,
        @NotBlank @Size(max = 50, message = "CRP deve ter no máximo 50 caracteres") String crp,
        /** Limite da coluna `psicologa.telefone` — sem isso, entrada gigante vira 500. */
        @NotBlank @Size(max = 30, message = "Telefone deve ter no máximo 30 caracteres") String telefone,
        /** Dia de fechamento da fatura (1-31; mês curto fecha no último dia). */
        @Min(1) @Max(31) int diaFechamento,
        @Valid EnderecoDto endereco
) {}
