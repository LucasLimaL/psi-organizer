package com.psiorganizer.whatsapp.dto;

import jakarta.validation.constraints.NotBlank;

import com.psiorganizer.common.validation.TelefoneE164;

public record EnviarTesteRequest(
        @NotBlank @TelefoneE164 String telefoneE164) {}
