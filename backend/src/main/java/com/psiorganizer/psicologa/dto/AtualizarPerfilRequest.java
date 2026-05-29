package com.psiorganizer.psicologa.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

/**
 * Campos editáveis do perfil da psicóloga. Email e CPF são imutáveis
 * (representam identidade) — alterar exigiria fluxo separado de
 * verificação. Senha tem endpoint próprio (não implementado no MVP).
 */
public record AtualizarPerfilRequest(
        @NotBlank String nomeCompleto,
        @NotBlank String crp,
        @NotBlank String telefone,
        @Valid EnderecoDto endereco) {}
