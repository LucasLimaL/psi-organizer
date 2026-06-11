package com.psiorganizer.whatsapp.client;

import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Mock ativo enquanto psi.whatsapp.mock=true (default).
 * Devolve um id sintético "mock-...". Útil pra dev local sem env vars Meta
 * e pra qualquer teste automatizado.
 *
 * Não loga nada — o completion log do caller (RequestLoggingFilter ou wrapper
 * do scheduler/webhook) já registra a ação. Política em docs/OBSERVABILITY.md.
 */
@Component
@ConditionalOnProperty(name = "psi.whatsapp.mock", havingValue = "true", matchIfMissing = true)
public class MockWhatsappClient implements WhatsappClient {

    @Override
    public EnvioResultado enviarTemplate(
            String paraE164, String templateName, String languageCode, List<String> parametros) {
        return new EnvioResultado("mock-" + UUID.randomUUID());
    }

    @Override
    public EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes) {
        return new EnvioResultado("mock-" + UUID.randomUUID());
    }

    @Override
    public EnvioResultado enviarTextoLivre(String paraE164, String texto) {
        return new EnvioResultado("mock-" + UUID.randomUUID());
    }
}
