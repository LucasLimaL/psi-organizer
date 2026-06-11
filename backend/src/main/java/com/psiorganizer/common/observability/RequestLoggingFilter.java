package com.psiorganizer.common.observability;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Único log por HTTP request. Roda antes de tudo (ordem alta) pra capturar
 * duração total. Política completa em docs/OBSERVABILITY.md.
 *
 * Fluxo:
 *   1. Set MDC universal (requestId, method, path, clientIp, userAgent)
 *   2. Envolve request/response em ContentCaching wrappers
 *   3. chain.doFilter()
 *   4. Set status + durationMs
 *   5. Decide o que vai pro body baseado no status e no path
 *   6. Emite 1 log INFO/WARN/ERROR
 *   7. Limpa MDC
 *
 * Paths skipados: /actuator/**, /swagger-ui/**, /v3/api-docs/**.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("com.psiorganizer.observability.RequestLog");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    // Sentinelas pra garantir psicologaId sempre presente. Política: nenhum log
    // de request sai sem identificação semântica de quem (ou o que) fez a chamada.
    private static final String SENTINEL_PREFLIGHT = "cors-preflight";
    private static final String SENTINEL_WEBHOOK_META = "meta-webhook";
    private static final String SENTINEL_PRE_AUTH = "pre-auth";
    private static final String SENTINEL_UNAUTH = "unauthenticated";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.equals("/favicon.ico");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long startNanos = System.nanoTime();
        String requestId = resolverRequestId(request);
        MDC.put(LogFields.REQUEST_ID, requestId);
        MDC.put(LogFields.METHOD, request.getMethod());
        MDC.put(LogFields.PATH, request.getRequestURI());
        MDC.put(LogFields.CLIENT_IP, resolverIp(request));

        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null) {
            MDC.put(LogFields.USER_AGENT, truncar(userAgent, 200));
        }

        // Echo do request-id pra cliente correlacionar (debugging frontend ↔ backend)
        response.setHeader("X-Request-Id", requestId);

        ContentCachingRequestWrapper reqWrap = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper respWrap = new ContentCachingResponseWrapper(response);

        Throwable falha = null;
        try {
            chain.doFilter(reqWrap, respWrap);
        } catch (Throwable t) {
            falha = t;
            throw t;
        } finally {
            int status = falha == null ? respWrap.getStatus() : 500;
            long durationMs = (System.nanoTime() - startNanos) / 1_000_000L;
            MDC.put(LogFields.STATUS, String.valueOf(status));
            MDC.put(LogFields.DURATION_MS, String.valueOf(durationMs));

            preencherBodyNoMdc(reqWrap, respWrap, status);

            // Identidade: tentamos sempre extrair email do requestBody de /auth/**
            // (cobre login que falha — email tá lá mesmo se senha errada). Se for
            // login OK, o response tem psicologaId+email mais autorizado e sobrescreve.
            String path = request.getRequestURI();
            if (path.startsWith("/auth/")) {
                extrairEmailDoRequest(reqWrap.getContentAsByteArray());
            }
            if (status == 200 && path.equals("/auth/login")) {
                extrairIdentidadeDoLogin(respWrap.getContentAsByteArray());
            }
            garantirIdentidade(request, status);

            try {
                respWrap.copyBodyToResponse();
            } catch (IOException ignored) {
                // Resposta pode já ter sido commitada; ok ignorar aqui
            }

            Throwable paraLogar = falha;
            if (paraLogar == null) {
                Object attr = request.getAttribute(LogFields.UNHANDLED_EXCEPTION_ATTR);
                if (attr instanceof Throwable t) paraLogar = t;
            }
            emitir(reqWrap, status, paraLogar);
            MDC.clear();
        }
    }

    /**
     * Smart body por nível:
     *   - INFO 2xx → só responseFields extraídos do response
     *   - WARN 4xx → requestBody redacted + responseFields
     *   - ERROR 5xx → requestBody + responseBody, ambos redacted
     */
    private void preencherBodyNoMdc(ContentCachingRequestWrapper req,
                                    ContentCachingResponseWrapper resp,
                                    int status) {
        boolean isAuth = req.getRequestURI().startsWith("/auth/");

        if (isAuth) {
            // Caso especial: nunca loga body de login/signup, nem redacted.
            // Loga só o outcome.
            MDC.put(LogFields.LOGIN_OUTCOME, status >= 200 && status < 300 ? "success" : "failure");
            return;
        }

        byte[] reqBytes = req.getContentAsByteArray();
        byte[] respBytes = resp.getContentAsByteArray();

        if (status >= 500) {
            putRedactedBody(LogFields.REQUEST_BODY, reqBytes, req.getContentType());
            putRedactedBody(LogFields.RESPONSE_BODY, respBytes, resp.getContentType());
        } else if (status >= 400) {
            putRedactedBody(LogFields.REQUEST_BODY, reqBytes, req.getContentType());
            putFields(LogFields.RESPONSE_FIELDS, respBytes);
        } else {
            putFields(LogFields.RESPONSE_FIELDS, respBytes);
        }
    }

    private void putRedactedBody(String mdcKey, byte[] body, String contentType) {
        if (body == null || body.length == 0) return;
        if (BodyRedactor.isBinary(contentType)) {
            MDC.put(LogFields.BODY_OMITTED, "binary");
            return;
        }
        String redacted = BodyRedactor.redactAndTruncate(body, contentType);
        if (redacted == null) return;
        MDC.put(mdcKey, redacted);
        if (BodyRedactor.isTruncated(body)) {
            MDC.put(LogFields.BODY_TRUNCATED, "true");
        }
    }

    private void putFields(String mdcKey, byte[] body) {
        if (body == null || body.length == 0) return;
        Map<String, String> fields = BodyRedactor.extractKeyFields(body);
        if (fields.isEmpty()) return;
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : fields.entrySet()) {
            if (!first) sb.append(',');
            sb.append('"').append(e.getKey()).append("\":\"").append(e.getValue()).append('"');
            first = false;
        }
        sb.append('}');
        MDC.put(mdcKey, sb.toString());

        // Promove IDs conhecidos pra MDC top-level (filtros/dashboards usam direto)
        if (fields.containsKey("pacienteId")) MDC.put(LogFields.PACIENTE_ID, fields.get("pacienteId"));
        if (fields.containsKey("consultaId")) MDC.put(LogFields.CONSULTA_ID, fields.get("consultaId"));
        if (fields.containsKey("lembreteId")) MDC.put(LogFields.LEMBRETE_ID, fields.get("lembreteId"));
        if (fields.containsKey("wamid")) MDC.put(LogFields.WAMID, fields.get("wamid"));
        if (fields.containsKey("mensagemIdExterna")) MDC.put(LogFields.WAMID, fields.get("mensagemIdExterna"));
    }

    /**
     * Política: todo log de request precisa ter psicologaId. Quando não é uma psi
     * autenticada (preflight, webhook Meta, pré-login, JWT inválido), preenchemos
     * com um sentinela semântico — nunca fica vazio.
     */
    private void garantirIdentidade(HttpServletRequest request, int status) {
        if (MDC.get(LogFields.PSICOLOGA_ID) != null) return;

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equals(method)) {
            MDC.put(LogFields.PSICOLOGA_ID, SENTINEL_PREFLIGHT);
        } else if (path.startsWith("/webhooks/")) {
            MDC.put(LogFields.PSICOLOGA_ID, SENTINEL_WEBHOOK_META);
        } else if (path.startsWith("/auth/")) {
            MDC.put(LogFields.PSICOLOGA_ID, SENTINEL_PRE_AUTH);
        } else {
            // Endpoint que exigia auth mas chegou sem JWT válido (401)
            MDC.put(LogFields.PSICOLOGA_ID, SENTINEL_UNAUTH);
        }
    }

    /**
     * Extrai email do request body de /auth/login ou /auth/signup. Funciona mesmo
     * pra request que vai falhar (senha errada) — o email no body é a identidade
     * de quem tentou.
     */
    private void extrairEmailDoRequest(byte[] body) {
        if (body == null || body.length == 0) return;
        try {
            JsonNode tree = MAPPER.readTree(body);
            JsonNode email = tree.get("email");
            if (email != null && email.isTextual()) {
                MDC.put(LogFields.EMAIL, email.asText());
            }
        } catch (Exception ignored) {
            // Body inválido — sem email pra extrair, sentinela cobre depois
        }
    }

    /**
     * Login response shape: {"token":"...", "psicologa":{"id":"...","email":"..."}}.
     * Extrai o id e email pro MDC pra completar o log do POST /auth/login com a
     * identidade autenticada.
     */
    private void extrairIdentidadeDoLogin(byte[] body) {
        if (body == null || body.length == 0) return;
        try {
            JsonNode tree = MAPPER.readTree(body);
            JsonNode psi = tree.get("psicologa");
            if (psi == null) return;
            JsonNode id = psi.get("id");
            if (id != null && id.isTextual()) {
                MDC.put(LogFields.PSICOLOGA_ID, id.asText());
            }
            JsonNode email = psi.get("email");
            if (email != null && email.isTextual()) {
                MDC.put(LogFields.EMAIL, email.asText());
            }
        } catch (Exception ignored) {
            // Body não-JSON / parse error — login sem identidade extraível, sentinela
            // garantirIdentidade() cobre depois.
        }
    }

    private void emitir(ContentCachingRequestWrapper req, int status, Throwable falha) {
        String mensagem = "request " + req.getMethod() + " " + req.getRequestURI() + " " + status;
        if (falha != null || status >= 500) {
            log.error(mensagem, falha);
        } else if (status >= 400) {
            log.warn(mensagem);
        } else {
            log.info(mensagem);
        }
    }

    private String resolverRequestId(HttpServletRequest request) {
        String inbound = request.getHeader("X-Request-Id");
        if (inbound != null && !inbound.isBlank() && inbound.length() <= 64) {
            return inbound;
        }
        return "r-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String resolverIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return comma < 0 ? xff.trim() : xff.substring(0, comma).trim();
        }
        return request.getRemoteAddr();
    }

    private static String truncar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
