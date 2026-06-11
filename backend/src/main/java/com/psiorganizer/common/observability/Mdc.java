package com.psiorganizer.common.observability;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.MDC;

/**
 * Helpers pra manipular MDC sem deixar entrada vazada no thread quando o escopo
 * termina. Padrão obrigatório descrito em docs/OBSERVABILITY.md.
 *
 * Uso típico:
 *
 *   try (var scope = Mdc.with(LogFields.CONSULTA_ID, id.toString())) {
 *       service.confirmar(id);
 *   }
 *
 * Pra flows assíncronos (scheduler, webhook):
 *
 *   try (var scope = Mdc.flow("scheduler-cron", LogFields.CRON_RUN_ID, "cron-" + sufixo)) {
 *       ...
 *   }
 */
public final class Mdc {

    private Mdc() {}

    /**
     * Coloca um par no MDC; restore ao fechar. Restore põe o valor anterior de volta
     * (ou remove se não havia), pra suportar escopos aninhados sem corromper o pai.
     */
    public static Scope with(String key, String value) {
        return new Scope(Map.of(key, value));
    }

    public static Scope with(String k1, String v1, String k2, String v2) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put(k1, v1);
        m.put(k2, v2);
        return new Scope(m);
    }

    public static Scope with(String k1, String v1, String k2, String v2, String k3, String v3) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put(k1, v1);
        m.put(k2, v2);
        m.put(k3, v3);
        return new Scope(m);
    }

    /**
     * Atalho pra flow async. Sempre seta a chave {@code flow} junto com os extras.
     */
    public static Scope flow(String flowName, String... kv) {
        if ((kv.length & 1) != 0) {
            throw new IllegalArgumentException("kv precisa de pares chave/valor");
        }
        Map<String, String> m = new LinkedHashMap<>();
        m.put(LogFields.FLOW, flowName);
        for (int i = 0; i < kv.length; i += 2) {
            m.put(kv[i], kv[i + 1]);
        }
        return new Scope(m);
    }

    public static final class Scope implements AutoCloseable {

        private final Map<String, String> previous;

        Scope(Map<String, String> entries) {
            this.previous = new LinkedHashMap<>(entries.size());
            for (Map.Entry<String, String> e : entries.entrySet()) {
                this.previous.put(e.getKey(), MDC.get(e.getKey()));
                if (e.getValue() == null) {
                    MDC.remove(e.getKey());
                } else {
                    MDC.put(e.getKey(), e.getValue());
                }
            }
        }

        @Override
        public void close() {
            for (Map.Entry<String, String> e : previous.entrySet()) {
                if (e.getValue() == null) {
                    MDC.remove(e.getKey());
                } else {
                    MDC.put(e.getKey(), e.getValue());
                }
            }
        }
    }
}
