package com.psiorganizer.auth.dto;

import com.psiorganizer.psicologa.dto.PsicologaResponse;

/**
 * Resultado do signup. Conta comum nasce não validada: {@code token} vem nulo
 * e {@code emailValidacaoPendente} true — o frontend mostra "confira seu
 * e-mail" em vez de logar. Contas pré-validadas (psi.auth.emails-pre-validados)
 * recebem o JWT direto, como antes.
 */
public record SignupResponse(
        boolean emailValidacaoPendente,
        String token,
        PsicologaResponse psicologa) {}
