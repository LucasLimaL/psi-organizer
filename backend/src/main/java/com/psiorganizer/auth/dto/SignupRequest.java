package com.psiorganizer.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
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
        @Valid EnderecoDto endereco
) {}
