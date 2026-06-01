package com.psiorganizer.common.util;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Validação HMAC-SHA256 pra webhook Meta. Comparação em constant-time pra
 * evitar timing attack.
 *
 * Meta envia o header `X-Hub-Signature-256` no formato `sha256=<hex>`. Calculamos
 * `HMAC_SHA256(appSecret, rawBody)` em hex lowercase e comparamos.
 */
public final class HmacValidator {

    private HmacValidator() {}

    public static boolean validar(byte[] body, String headerSignature, String segredo) {
        if (body == null || headerSignature == null || segredo == null || segredo.isBlank()) {
            return false;
        }
        String esperadoHex = sha256Hex(body, segredo);
        String recebidoHex = headerSignature.startsWith("sha256=")
                ? headerSignature.substring("sha256=".length())
                : headerSignature;
        byte[] a = esperadoHex.toLowerCase().getBytes(StandardCharsets.US_ASCII);
        byte[] b = recebidoHex.toLowerCase().getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(a, b);
    }

    private static String sha256Hex(byte[] body, String segredo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(body);
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte x : hash) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HmacSHA256 indisponível", e);
        }
    }
}
