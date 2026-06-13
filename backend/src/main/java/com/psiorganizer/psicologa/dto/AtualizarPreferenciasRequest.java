package com.psiorganizer.psicologa.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Preferências de cobrança/uso da psicóloga, editadas na aba Configurações —
 * separadas do perfil (dados cadastrais). Hoje só {@code cobrarFaltas}; o record
 * é o ponto de extensão pra futuras opções de configuração.
 */
public record AtualizarPreferenciasRequest(@NotNull Boolean cobrarFaltas) {}
