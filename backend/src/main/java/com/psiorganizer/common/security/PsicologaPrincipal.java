package com.psiorganizer.common.security;

import java.util.UUID;

public record PsicologaPrincipal(UUID id, String email, boolean admin, boolean restrito) {

    public static PsicologaPrincipal corrente() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof PsicologaPrincipal p)) {
            throw new IllegalStateException("Sem psicóloga autenticada no contexto");
        }
        return p;
    }
}
