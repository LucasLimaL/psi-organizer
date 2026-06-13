package com.psiorganizer.auth.dto;

import com.psiorganizer.psicologa.dto.PsicologaResponse;

public record LoginResponse(
        String token,
        PsicologaResponse psicologa,
        /** Sessão em modo restrito (inadimplência): frontend só libera /assinatura. */
        boolean restrito
) {}
