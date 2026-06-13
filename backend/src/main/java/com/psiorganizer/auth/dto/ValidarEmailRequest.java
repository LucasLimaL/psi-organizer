package com.psiorganizer.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ValidarEmailRequest(@NotBlank String token) {}
