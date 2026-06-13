package com.psiorganizer.psicologa.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Campos editáveis do perfil da psicóloga. Email e CPF são imutáveis
 * (representam identidade) — alterar exigiria fluxo separado de
 * verificação. Senha tem endpoint próprio. Preferências de cobrança
 * (cobrarFaltas) ficam em {@code PUT /me/preferencias} (aba Configurações).
 */
public record AtualizarPerfilRequest(
        @NotBlank @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres") String nomeCompleto,
        @NotBlank @Size(max = 50, message = "CRP deve ter no máximo 50 caracteres") String crp,
        /** Limite da coluna `psicologa.telefone` — sem isso, entrada gigante vira 500. */
        @NotBlank @Size(max = 30, message = "Telefone deve ter no máximo 30 caracteres") String telefone,
        @Valid EnderecoDto endereco) {}
