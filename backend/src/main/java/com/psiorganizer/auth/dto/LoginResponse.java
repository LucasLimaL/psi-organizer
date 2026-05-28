package com.psiorganizer.auth.dto;

import com.psiorganizer.psicologa.dto.PsicologaResponse;

public record LoginResponse(
        String token,
        PsicologaResponse psicologa
) {}
