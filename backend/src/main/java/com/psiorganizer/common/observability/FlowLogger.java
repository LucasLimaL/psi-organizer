package com.psiorganizer.common.observability;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * Wrapper de "completion log" pra flows assíncronos (scheduler, webhook).
 * Equivalente do {@link RequestLoggingFilter}, mas pra contexto sem HTTP.
 *
 * Uso:
 *   FlowLogger.executar("scheduler-cron", () -> {
 *       // trabalho que enriquece MDC com contadores
 *       MDC.put(LogFields.CRON_ENVIADOS_DIA, "12");
 *   });
 *
 * Emite 1 INFO em sucesso, 1 ERROR com stack em falha. Limpa MDC do flow no fim.
 */
public final class FlowLogger {

    private static final Logger log = LoggerFactory.getLogger("com.psiorganizer.observability.FlowLog");

    private FlowLogger() {}

    public static void executar(String flowName, Runnable acao) {
        executar(flowName, "run-" + UUID.randomUUID().toString().substring(0, 8), acao);
    }

    public static void executar(String flowName, String runId, Runnable acao) {
        long startNanos = System.nanoTime();
        MDC.put(LogFields.FLOW, flowName);
        MDC.put(LogFields.CRON_RUN_ID, runId);
        Throwable falha = null;
        try {
            acao.run();
        } catch (Throwable t) {
            falha = t;
            throw t;
        } finally {
            long durationMs = (System.nanoTime() - startNanos) / 1_000_000L;
            MDC.put(LogFields.DURATION_MS, String.valueOf(durationMs));
            if (falha != null) {
                log.error("flow {} falhou", flowName, falha);
            } else {
                log.info("flow {} concluído", flowName);
            }
            limpar();
        }
    }

    private static void limpar() {
        MDC.remove(LogFields.FLOW);
        MDC.remove(LogFields.CRON_RUN_ID);
        MDC.remove(LogFields.DURATION_MS);
        MDC.remove(LogFields.CRON_ENVIADOS_DIA);
        MDC.remove(LogFields.CRON_ENVIADOS_LATE);
        MDC.remove(LogFields.CRON_MSG2_RETRY);
        MDC.remove(LogFields.CRON_EXPIRADOS);
        MDC.remove(LogFields.LEMBRETE_ID);
        MDC.remove(LogFields.ETAPA_LEMBRETE);
        MDC.remove(LogFields.WAMID);
    }
}
