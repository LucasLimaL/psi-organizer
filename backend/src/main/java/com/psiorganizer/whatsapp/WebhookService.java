package com.psiorganizer.whatsapp;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

/**
 * Parse + dispatch do payload Meta. Spec §5.
 *
 * Estrutura do payload:
 *   entry[].changes[].value.messages[]  -> respostas da paciente (botões / texto)
 *   entry[].changes[].value.statuses[]  -> ciclo de vida (sent/delivered/read/failed)
 *
 * O parse é tolerante a campos faltando (Meta evolui o schema com frequência).
 */
@Service
public class WebhookService {

    private final LembreteEnviadoRepository lembreteRepo;
    private final MaquinaEstadosService maquina;
    private final WhatsappMetricas metricas;

    public WebhookService(LembreteEnviadoRepository lembreteRepo,
                          MaquinaEstadosService maquina,
                          WhatsappMetricas metricas) {
        this.lembreteRepo = lembreteRepo;
        this.maquina = maquina;
        this.metricas = metricas;
    }

    /**
     * Entry point chamado pelo WebhookController após validar HMAC. Trata exceções
     * internas — sempre devolve 200 pra Meta (a duplicidade via retry da Meta é
     * absorvida pelas guardas idempotentes da máquina de estados).
     */
    public void processar(Map<String, Object> payload) {
        // Sem try/catch — o WebhookController engole + loga. Não duplicar.
        for (Map<String, Object> entry : asList(payload.get("entry"))) {
            for (Map<String, Object> change : asList(entry.get("changes"))) {
                Map<String, Object> value = asMap(change.get("value"));
                if (value == null) continue;
                for (Map<String, Object> msg : asList(value.get("messages"))) {
                    processarMensagem(msg);
                }
                for (Map<String, Object> status : asList(value.get("statuses"))) {
                    processarStatus(status);
                }
            }
        }
    }

    private void processarMensagem(Map<String, Object> msg) {
        String from = (String) msg.get("from");
        String contextId = Optional.ofNullable(asMap(msg.get("context")))
                .map(c -> (String) c.get("id"))
                .orElse(null);

        Optional<LembreteEnviado> le = resolverLembrete(contextId, from);
        if (le.isEmpty()) {
            // Resposta sem lembrete correspondente — métrica detecta, log agregado
            // do request mostra a contagem via X-Request-Id se for hot path.
            metricas.eventoOrfao();
            return;
        }

        String botaoId = extrairBotaoId(msg);
        String textoLivre = extrairTexto(msg);
        maquina.processarResposta(le.get().getId(), botaoId, textoLivre);
    }

    private void processarStatus(Map<String, Object> status) {
        String externalId = (String) status.get("id");
        String estado = (String) status.get("status");
        if (externalId == null || estado == null) return;

        Optional<LembreteEnviado> le = lembreteRepo.findByMensagemExterna(externalId);
        if (le.isEmpty()) return;

        StatusEntrega novo = mapearStatus(estado);
        if (novo == null) return;

        String erroCodigo = null;
        String erroDescricao = null;
        if (novo == StatusEntrega.FALHOU) {
            List<Map<String, Object>> errors = asList(status.get("errors"));
            if (!errors.isEmpty()) {
                Map<String, Object> err = errors.get(0);
                Object codigo = err.get("code");
                erroCodigo = codigo == null ? null : String.valueOf(codigo);
                erroDescricao = (String) err.get("title");
            }
        }
        maquina.atualizarStatusEntrega(le.get().getId(), novo, erroCodigo, erroDescricao);
    }

    private Optional<LembreteEnviado> resolverLembrete(String contextId, String from) {
        // Camada 1: lookup por context.id
        if (contextId != null) {
            Optional<LembreteEnviado> le = lembreteRepo.findByMensagemExterna(contextId);
            if (le.isPresent()) return le;
        }
        // Camada 2: fallback por telefone + janela 48h
        if (from != null) {
            String digitos = from.replaceAll("\\D", "");
            Optional<LembreteEnviado> le = lembreteRepo.findByTelefoneRecente(digitos);
            if (le.isPresent()) return le;
        }
        return Optional.empty();
    }

    private String extrairBotaoId(Map<String, Object> msg) {
        Map<String, Object> interactive = asMap(msg.get("interactive"));
        if (interactive == null) return null;
        Map<String, Object> buttonReply = asMap(interactive.get("button_reply"));
        if (buttonReply == null) return null;
        return (String) buttonReply.get("id");
    }

    private String extrairTexto(Map<String, Object> msg) {
        Map<String, Object> text = asMap(msg.get("text"));
        if (text == null) return null;
        return (String) text.get("body");
    }

    private StatusEntrega mapearStatus(String metaStatus) {
        return switch (metaStatus) {
            case "sent" -> StatusEntrega.ENVIADO;
            case "delivered" -> StatusEntrega.ENTREGUE;
            case "read" -> StatusEntrega.LIDO;
            case "failed" -> StatusEntrega.FALHOU;
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object o) {
        return o instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        return o instanceof Map<?, ?> m ? (Map<String, Object>) m : null;
    }
}
