package com.psiorganizer.auth.email;

/**
 * Envia o e-mail de validação de conta. Implementações: SMTP real
 * ({@link SmtpEmailValidacaoSender}, modo {@code smtp}) e fallback de
 * desenvolvimento que escreve o link no log ({@link LogEmailValidacaoSender},
 * modo {@code log}, default). Seleção via {@code psi.email.modo}.
 */
public interface EmailValidacaoSender {

    void enviar(String para, String nomeCompleto, String link);
}
