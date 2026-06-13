package com.psiorganizer.psicologa.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Preferências de uso da psicóloga, editadas na aba Configurações — separadas do
 * perfil (dados cadastrais): se consultas com falta entram na cobrança e a duração
 * padrão (minutos) que pré-preenche o formulário de nova consulta.
 */
public record AtualizarPreferenciasRequest(
        @NotNull Boolean cobrarFaltas,
        @NotNull @Min(5) @Max(600) Integer duracaoPadraoMinutos) {}
