package com.psiorganizer.whatsapp.client;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração da integração com Meta WhatsApp Cloud API.
 * Lida via env vars ou application.yml sob o prefixo psi.whatsapp.
 *
 * Quando mock=true (default), nenhum dos demais campos é exigido.
 * Quando mock=false, accessToken e phoneNumberId precisam estar preenchidos.
 */
@ConfigurationProperties(prefix = "psi.whatsapp")
public record WhatsappProperties(
        boolean mock,
        String graphApiVersion,
        String phoneNumberId,
        String accessToken) {

    public String baseUrl() {
        return "https://graph.facebook.com/" + graphApiVersion;
    }

    public String mensagensEndpoint() {
        return baseUrl() + "/" + phoneNumberId + "/messages";
    }
}
