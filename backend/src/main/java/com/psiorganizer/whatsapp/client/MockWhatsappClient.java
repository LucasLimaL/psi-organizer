package com.psiorganizer.whatsapp.client;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Mock para todos os profiles diferentes de prod. Loga a chamada e devolve um id
 * sintético "mock-...". O MetaWhatsappClient real entra na PR B sob @Profile("prod").
 */
@Component
@Profile("!prod")
public class MockWhatsappClient implements WhatsappClient {

    private static final Logger log = LoggerFactory.getLogger(MockWhatsappClient.class);

    @Override
    public EnvioResultado enviarTemplate(String paraE164, String templateName, List<String> parametros) {
        String id = "mock-" + UUID.randomUUID();
        log.info("[whatsapp-mock] enviarTemplate para={} template={} params={} id={}",
                paraE164, templateName, parametros, id);
        return new EnvioResultado(id);
    }

    @Override
    public EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes) {
        String id = "mock-" + UUID.randomUUID();
        log.info("[whatsapp-mock] enviarTextoLivreComBotoes para={} texto={} botoes={} id={}",
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
