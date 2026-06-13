package com.psiorganizer.auth.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Fallback de desenvolvimento: em vez de mandar e-mail, escreve o link de
 * validação no log. É o ponto de captura do "envio" (caso de absorção da
 * política de OBSERVABILITY.md — ninguém mais veria esse link), nunca ativo
 * em prod com SMTP configurado.
 */
@Component
@ConditionalOnProperty(name = "psi.email.modo", havingValue = "log", matchIfMissing = true)
public class LogEmailValidacaoSender implements EmailValidacaoSender {

    private static final Logger log = LoggerFactory.getLogger(LogEmailValidacaoSender.class);

    @Override
    public void enviar(String para, String nomeCompleto, String link) {
        log.info("e-mail de validação (modo log, sem envio real) para={} link={}", para, link);
    }
}
