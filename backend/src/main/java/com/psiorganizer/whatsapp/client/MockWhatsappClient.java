package com.psiorganizer.whatsapp.client;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Mock ativo enquanto psi.whatsapp.mock=true (default).
 * Loga a chamada e devolve um id sintético "mock-...". Útil pra dev local
 * sem env vars Meta e pra qualquer teste automatizado.
 */
@Component
@ConditionalOnProperty(name = "psi.whatsapp.mock", havingValue = "true", matchIfMissing = true)
public class MockWhatsappClient implements WhatsappClient {

    private static final Logger log = LoggerFactory.getLogger(MockWhatsappClient.class);

    @Override
    public EnvioResultado enviarTemplate(
            String paraE164, String templateName, String languageCode, List<String> parametros) {
        String id = "mock-" + UUID.randomUUID();
        log.info(
                "[whatsapp-mock] enviarTemplate para={} template={} lang={} params={} id={}",
                paraE164, templateName, languageCode, parametros, id);
        return new EnvioResultado(id);
    }

    @Override
    public EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes) {
        String id = "mock-" + UUID.randomUUID();
        log.info(
                "[whatsapp-mock] enviarTextoLivreComBotoes para={} texto={} botoes={} id={}",
                paraE164, texto, botoes, id);
        return new EnvioResultado(id);
    }

    @Override
    public EnvioResultado enviarTextoLivre(String paraE164, String texto) {
        String id = "mock-" + UUID.randomUUID();
        log.info("[whatsapp-mock] enviarTextoLivre para={} texto={} id={}", paraE164, texto, id);
        return new EnvioResultado(id);
    }
}
