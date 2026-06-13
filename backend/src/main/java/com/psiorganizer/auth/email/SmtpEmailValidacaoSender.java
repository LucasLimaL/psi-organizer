package com.psiorganizer.auth.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Envio real via SMTP (Gmail em prod — ver docs/runbooks/EMAIL.md).
 * Falha de envio propaga: o GlobalExceptionHandler loga o erro único e o
 * usuário pode pedir reenvio em /auth/reenviar-validacao.
 */
@Component
@ConditionalOnProperty(name = "psi.email.modo", havingValue = "smtp")
public class SmtpEmailValidacaoSender implements EmailValidacaoSender {

    private final JavaMailSender mailSender;
    private final String remetente;

    public SmtpEmailValidacaoSender(JavaMailSender mailSender,
                                    @Value("${psi.email.remetente}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    @Override
    public void enviar(String para, String nomeCompleto, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(remetente);
        msg.setTo(para);
        msg.setSubject("psi-organizer — confirme seu e-mail");
        msg.setText("""
                Olá, %s!

                Falta só um passo pra ativar sua conta no psi-organizer: \
                confirme seu e-mail clicando no link abaixo (válido por 24 horas).

                %s

                Se você não criou esta conta, ignore este e-mail.

                — psi-organizer
                """.formatted(nomeCompleto, link));
        mailSender.send(msg);
    }
}
