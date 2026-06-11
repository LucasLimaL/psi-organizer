package com.psiorganizer.common.observability;

/**
 * Constantes das chaves MDC. Toda chave nova passa por aqui — facilita auditar
 * o vocabulário do log e bate com a lista em docs/OBSERVABILITY.md.
 *
 * Não adicione chave sensível (senha, accessToken) aqui — esses jamais devem
 * existir como MDC entry, nem mascarados.
 */
public final class LogFields {

    private LogFields() {}

    // Universais (RequestLoggingFilter)
    public static final String REQUEST_ID = "requestId";
    public static final String METHOD = "method";
    public static final String PATH = "path";
    public static final String STATUS = "status";
    public static final String DURATION_MS = "durationMs";
    public static final String CLIENT_IP = "clientIp";
    public static final String USER_AGENT = "userAgent";

    // Multi-tenant (JwtAuthFilter)
    public static final String PSICOLOGA_ID = "psicologaId";
    public static final String EMAIL = "email";

    // Domínio (services / controllers via Mdc.with)
    public static final String PACIENTE_ID = "pacienteId";
    public static final String CONSULTA_ID = "consultaId";
    public static final String LEMBRETE_ID = "lembreteId";
    public static final String WAMID = "wamid";
    public static final String TEMPLATE_NAME = "templateName";
    public static final String ETAPA_LEMBRETE = "etapaLembrete";

    // Flows assíncronos (wrappers Mdc.flow)
    public static final String FLOW = "flow";
    public static final String CRON_RUN_ID = "cronRunId";
    public static final String CRON_ENVIADOS_DIA = "cronEnviadosDia";
    public static final String CRON_ENVIADOS_LATE = "cronEnviadosLate";
    public static final String CRON_MSG2_RETRY = "cronMsg2Retry";
    public static final String CRON_EXPIRADOS = "cronExpirados";

    // Body (RequestLoggingFilter)
    public static final String REQUEST_BODY = "requestBody";
    public static final String RESPONSE_BODY = "responseBody";
    public static final String RESPONSE_FIELDS = "responseFields";
    public static final String BODY_TRUNCATED = "bodyTruncated";
    public static final String BODY_OMITTED = "bodyOmitted";

    // Caso especial /auth/login
    public static final String LOGIN_OUTCOME = "loginOutcome";

    // Erro (preenchido pelo GlobalExceptionHandler, emitido pelo RequestLog)
    public static final String ERROR_CLASS = "errorClass";
    public static final String ERROR_MESSAGE = "errorMessage";
    public static final String VALIDATION_FIELDS = "validacaoCampos";
    /** Chave do request attribute onde o GlobalExceptionHandler guarda a exception
     * pro RequestLoggingFilter incluir o stack trace no log de 500. */
    public static final String UNHANDLED_EXCEPTION_ATTR = "psi.unhandledException";
}
