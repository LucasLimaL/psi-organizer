package com.psiorganizer.whatsapp.client;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Implementação real do WhatsappClient usando a Meta Cloud API
 * (Graph API v21+ por padrão, configurável via psi.whatsapp.graph-api-version).
 *
 * Ativada quando psi.whatsapp.mock=false. Exige as env vars
 * WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN preenchidas — sem isso
 * o boot falha rápido na primeira chamada com mensagem clara.
 */
@Component
@ConditionalOnProperty(name = "psi.whatsapp.mock", havingValue = "false")
public class MetaWhatsappClient implements WhatsappClient {

    private static final Logger log = LoggerFactory.getLogger(MetaWhatsappClient.class);

    private final WhatsappProperties props;
    private final RestClient client;

    public MetaWhatsappClient(WhatsappProperties props) {
        this.props = props;
        validarConfig();
        this.client = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.accessToken())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private void validarConfig() {
        if (props.phoneNumberId() == null || props.phoneNumberId().isBlank()) {
            throw new IllegalStateException(
                    "WHATSAPP_PHONE_NUMBER_ID não definido — exigido quando psi.whatsapp.mock=false");
        }
        if (props.accessToken() == null || props.accessToken().isBlank()) {
            throw new IllegalStateException(
                    "WHATSAPP_ACCESS_TOKEN não definido — exigido quando psi.whatsapp.mock=false");
        }
    }

    @Override
    public EnvioResultado enviarTemplate(
            String paraE164, String templateName, String languageCode, List<String> parametros) {
        String to = normalizar(paraE164);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", to);
        body.put("type", "template");

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", languageCode));
        if (parametros != null && !parametros.isEmpty()) {
            List<Map<String, Object>> params = new ArrayList<>();
            for (String p : parametros) {
                params.add(Map.of("type", "text", "text", p));
            }
            template.put("components", List.of(
                    Map.of("type", "body", "parameters", params)));
        }
        body.put("template", template);

        return postar(body);
    }

    @Override
    public EnvioResultado enviarTextoLivreComBotoes(String paraE164, String texto, List<Botao> botoes) {
        List<Map<String, Object>> buttons = new ArrayList<>();
        for (Botao b : botoes) {
            buttons.add(Map.of(
                    "type", "reply",
                    "reply", Map.of("id", b.id(), "title", b.titulo())));
        }
        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", normalizar(paraE164),
                "type", "interactive",
                "interactive", Map.of(
                        "type", "button",
                        "body", Map.of("text", texto),
                        "action", Map.of("buttons", buttons)));
        return postar(body);
    }

    @Override
    public EnvioResultado enviarTextoLivre(String paraE164, String texto) {
        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", normalizar(paraE164),
                "type", "text",
                "text", Map.of("body", texto));
        return postar(body);
    }

    /**
     * Meta espera o número sem o '+' (formato `5511987654321`). Aceitamos E.164
     * com '+' no contrato interno e tiramos aqui.
     */
    private String normalizar(String e164) {
        if (e164 == null) return null;
        return e164.startsWith("+") ? e164.substring(1) : e164;
    }

    @SuppressWarnings("unchecked")
    private EnvioResultado postar(Map<String, Object> body) {
        String url = "/" + props.phoneNumberId() + "/messages";
        Map<String, Object> response = client.post()
                .uri(url)
                .body(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    String corpo = new String(res.getBody().readAllBytes());
                    log.warn(
                            "[whatsapp-meta] erro {} body={}",
                            res.getStatusCode().value(), corpo);
                    String codigo = "http_" + res.getStatusCode().value();
                    String descricao = corpo;
                    boolean transitorio = res.getStatusCode().is5xxServerError()
                            || res.getStatusCode().value() == 429;
                    throw new WhatsappException(codigo, descricao, transitorio);
                })
                .body(Map.class);

        if (response == null || !response.containsKey("messages")) {
            throw new WhatsappException("resposta_invalida", "Resposta da Meta sem campo messages", false);
        }
        List<Map<String, Object>> messages = (List<Map<String, Object>>) response.get("messages");
        if (messages.isEmpty()) {
            throw new WhatsappException("resposta_vazia", "Resposta da Meta com lista de messages vazia", false);
        }
        String id = (String) messages.get(0).get("id");
        log.info("[whatsapp-meta] enviado id={}", id);
        return new EnvioResultado(id);
    }
}
