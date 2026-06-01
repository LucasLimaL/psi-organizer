package com.psiorganizer.whatsapp;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.psiorganizer.common.util.HmacValidator;
import com.psiorganizer.whatsapp.client.WhatsappProperties;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Endpoint público que recebe eventos do WhatsApp Cloud API.
 * Spec §5.1.
 *
 * GET — handshake de verificação (Meta envia hub.challenge, devolvemos o valor literal).
 * POST — eventos (messages + statuses). Autenticidade verificada por HMAC-SHA256 do
 * body bruto contra WHATSAPP_APP_SECRET.
 */
@RestController
@RequestMapping("/webhooks/whatsapp")
@Tag(name = "WhatsApp webhook", description = "Endpoint público chamado pela Meta Cloud API")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final WhatsappProperties props;
    private final WebhookService webhookService;
    private final ObjectMapper mapper = new ObjectMapper();

    public WebhookController(WhatsappProperties props, WebhookService webhookService) {
        this.props = props;
        this.webhookService = webhookService;
    }

    @GetMapping
    @Operation(summary = "Handshake de verificação do webhook Meta")
    public ResponseEntity<String> verificar(
            @RequestParam(name = "hub.mode", required = false) String modo,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {
        if ("subscribe".equals(modo)
                && props.verifyToken() != null
                && props.verifyToken().equals(token)) {
            log.info("[webhook] handshake ok");
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(challenge);
        }
        log.warn("[webhook] handshake rejeitado modo={} token_match={}",
                modo, props.verifyToken() != null && props.verifyToken().equals(token));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PostMapping
    @Operation(summary = "Recebe eventos da Meta — HMAC-SHA256 do body validado")
    public ResponseEntity<Void> receber(
            @RequestHeader(name = "X-Hub-Signature-256", required = false) String assinatura,
            @RequestBody byte[] body) {
        if (!HmacValidator.validar(body, assinatura, props.appSecret())) {
            log.warn("[webhook] hmac_invalido assinatura={}", assinatura);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = mapper.readValue(body, Map.class);
            webhookService.processar(payload);
        } catch (Exception e) {
            log.error("[webhook] falha ao parsear payload", e);
        }
        return ResponseEntity.ok().build();
    }
}
