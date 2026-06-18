package com.psiorganizer.common.observability;

import java.util.Iterator;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Política única de redação de body antes de qualquer log. Detalhes em
 * docs/OBSERVABILITY.md §Redação.
 *
 * Estratégia:
 *   - Tenta parsear como JSON. Se não der, devolve string truncada sem mexer no conteúdo
 *     (não-JSON normalmente é form-urlencoded ou texto; ambos os casos podem ser tratados
 *     depois se virar dor — por enquanto fica como está, truncado).
 *   - Em JSON, percorre a árvore. Chaves em {@link #SENSITIVE_KEYS} viram "***".
 *   - Chaves em {@link #PARTIAL_MASK_KEYS} (cpf, telefone) usam mascaramento parcial.
 *   - Truncate em {@link #MAX_BYTES} bytes.
 */
public final class BodyRedactor {

    public static final int MAX_BYTES = 4096;
    public static final String REDACTED = "***";

    /** Chaves cujo valor é totalmente apagado. Comparação case-insensitive. */
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "senha", "password", "oldpassword", "newpassword", "currentpassword",
            "token", "accesstoken", "refreshtoken", "jwt", "authorization",
            "anotacao", "anotacoes", "notas", "observacoes",
            "appsecret", "verifytoken", "hmacsignature",
            "clientsecret", "apikey",
            // PII de paciente (LGPD Art. 6/11). Redigida pra permitir body em todo log
            // — inclusive 2xx — sem expor dado pessoal pra Cloud Logging / New Relic (EUA).
            // cpf/telefone ficam no PARTIAL_MASK (preservam últimos 2). cidade/uf seguem
            // visíveis (coarse, baixo risco, útil pra contexto).
            "nome", "email", "datanascimento",
            "logradouro", "numero", "complemento", "bairro", "cep");

    /** Chaves com mascaramento parcial — preserva últimos 2 dígitos pra reconhecimento. */
    private static final Set<String> PARTIAL_MASK_KEYS = Set.of(
            "cpf", "telefone", "telefonee164", "phone");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private BodyRedactor() {}

    /**
     * Redação + truncate. Devolve a string a colocar no MDC (já segura pra log).
     * Se truncado, retorna a representação truncada — o caller deve setar
     * {@code bodyTruncated=true} no MDC separadamente.
     */
    public static String redactAndTruncate(byte[] raw, String contentType) {
        if (raw == null || raw.length == 0) return null;
        if (isBinary(contentType)) return null;

        String redacted;
        try {
            JsonNode tree = MAPPER.readTree(raw);
            redactInPlace(tree);
            redacted = MAPPER.writeValueAsString(tree);
        } catch (Exception e) {
            // Não-JSON — devolve a string crua. Form-urlencoded raramente carrega senha
            // (login usa JSON), e texto-plano não tem chave/valor pra redactar.
            redacted = new String(raw);
        }

        if (redacted.length() <= MAX_BYTES) return redacted;
        return redacted.substring(0, MAX_BYTES);
    }

    public static boolean isTruncated(byte[] raw) {
        return raw != null && raw.length > MAX_BYTES;
    }

    public static boolean isBinary(String contentType) {
        if (contentType == null) return false;
        String ct = contentType.toLowerCase();
        return ct.startsWith("application/octet-stream")
                || ct.startsWith("multipart/")
                || ct.startsWith("image/")
                || ct.startsWith("application/pdf")
                || ct.startsWith("audio/")
                || ct.startsWith("video/");
    }

    private static void redactInPlace(JsonNode node) {
        if (node == null) return;
        if (node.isObject()) {
            ObjectNode obj = (ObjectNode) node;
            Iterator<String> names = obj.fieldNames();
            while (names.hasNext()) {
                String name = names.next();
                String lower = name.toLowerCase();
                if (SENSITIVE_KEYS.contains(lower)) {
                    obj.put(name, REDACTED);
                } else if (PARTIAL_MASK_KEYS.contains(lower) && obj.get(name).isTextual()) {
                    obj.put(name, maskPartial(obj.get(name).asText()));
                } else {
                    redactInPlace(obj.get(name));
                }
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                redactInPlace(child);
            }
        }
    }

    /**
     * Substitui todos os dígitos exceto os 2 últimos. "123.456.789-12" → "***.***.***-12".
     * Para telefone "+5531992414404" → "+** ***** ***04".
     */
    static String maskPartial(String value) {
        if (value == null || value.isBlank()) return value;
        int totalDigits = 0;
        for (int i = 0; i < value.length(); i++) {
            if (Character.isDigit(value.charAt(i))) totalDigits++;
        }
        if (totalDigits <= 2) return value;
        int keepFrom = totalDigits - 2;
        StringBuilder out = new StringBuilder(value.length());
        int seenDigits = 0;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isDigit(c)) {
                if (seenDigits < keepFrom) {
                    out.append('*');
                } else {
                    out.append(c);
                }
                seenDigits++;
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    /**
     * Extrai campos-chave de um body JSON pra logar em 2xx em vez do body completo.
     * Retorna mapa com pacienteId/consultaId/lembreteId/id/wamid se presentes.
     */
    public static Map<String, String> extractKeyFields(byte[] raw) {
        if (raw == null || raw.length == 0) return Map.of();
        try {
            JsonNode tree = MAPPER.readTree(raw);
            if (!tree.isObject()) return Map.of();
            Map<String, String> out = new java.util.LinkedHashMap<>();
            String[] keys = {"id", "pacienteId", "consultaId", "lembreteId",
                    "mensagemIdExterna", "wamid", "templateName"};
            for (String k : keys) {
                JsonNode v = tree.get(k);
                if (v != null && v.isTextual()) {
                    out.put(k, v.asText());
                }
            }
            return out;
        } catch (Exception e) {
            return Map.of();
        }
    }
}
