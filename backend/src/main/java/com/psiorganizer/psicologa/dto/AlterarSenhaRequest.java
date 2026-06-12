package com.psiorganizer.psicologa.dto;

import jakarta.validation.constraints.NotBlank;

import com.psiorganizer.common.validation.SenhaValida;

public record AlterarSenhaRequest(
        @NotBlank String senhaAtual,
        @NotBlank @SenhaValida String novaSenha) {}
