package com.psiorganizer.whatsapp.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.whatsapp.domain.LembreteEnviado;
import com.psiorganizer.whatsapp.domain.StatusEntrega;
import com.psiorganizer.whatsapp.domain.WhatsappMetricas;
import com.psiorganizer.whatsapp.repository.LembreteEnviadoRepository;

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
        // Payload pode trazer N eventos — a última chave fica no completion log da
        // request (RequestLoggingFilter limpa o MDC no fim). Suficiente: N>1 é raro.
        String wamid = (String) msg.get("id");
        if (wamid != null) {
            MDC.put(LogFields.WAMID, wamid);
        }
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
        MDC.put(LogFields.WAMID, externalId);

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
        // Camada 1: lookup por context.id (wamid é globalmente único — identifica o tenant)
        if (contextId != null) {
            Optional<LembreteEnviado> le = lembreteRepo.findByMensagemExterna(contextId);
            if (le.isPresent()) return le;
        }
        // Camada 2: fallback por telefone + janela 48h, só etapas ativas. O número Meta
        // é único pra todos os tenants, então o telefone não identifica a psicóloga: se
        // os candidatos abrangem 2+ psicólogas (mesma paciente atendida por ambas),
        // descartar é o único seguro — atribuir ao mais recente podia confirmar/cancelar
        // a consulta do tenant errado. Spec §5.3.
        if (from != null) {
            String digitos = from.replaceAll("\\D", "");
            List<LembreteEnviado> candidatos = lembreteRepo.candidatosPorTelefoneRecente(digitos);
            if (candidatos.isEmpty()) {
                return Optional.empty();
            }
            boolean unicoTenant = candidatos.stream()
                    .map(LembreteEnviado::getPsicologaId)
                    .distinct()
                    .count() == 1;
            if (!unicoTenant) {
                metricas.eventoAmbiguo();
                return Optional.empty();
            }
            return Optional.of(candidatos.get(0));
        }
        return Optional.empty();
    }

    private String extrairBotaoId(Map<String, Object> msg) {
        // Msg 2/3 e reenvio são mensagens interactive que NÓS enviamos — o id do
        // botão volta em interactive.button_reply.id (controlamos esse id).
        Map<String, Object> interactive = asMap(msg.get("interactive"));
        if (interactive != null) {
            Map<String, Object> buttonReply = asMap(interactive.get("button_reply"));
            if (buttonReply != null) {
                return (String) buttonReply.get("id");
            }
        }
        // Msg 1 é o template HSM aprovado: clique num botão quick-reply de template
        // chega como type "button" com button.payload/text (o rótulo visível) — NÃO
        // como interactive.button_reply. Mapeamos o rótulo pro id canônico que a
        // máquina de estados compara (BTN_CONFIRMAR/BTN_CANCELAR).
        Map<String, Object> button = asMap(msg.get("button"));
        if (button != null) {
            String rotulo = (String) button.get("payload");
            if (rotulo == null) {
                rotulo = (String) button.get("text");
            }
            return mapearRotuloTemplate(rotulo);
        }
        return null;
    }

    /**
     * Botão quick-reply de template não carrega o id que definimos no código — só o
     * rótulo visível ("Confirmar"/"Cancelar"). Mapeia por prefixo, tolerante a
     * caixa, pros ids conhecidos pela máquina de estados.
     */
    private String mapearRotuloTemplate(String rotulo) {
        if (rotulo == null) return null;
        String n = rotulo.trim().toLowerCase(Locale.ROOT);
        if (n.startsWith("confirm")) return LembreteEnvioService.BTN_CONFIRMAR;
        if (n.startsWith("cancel")) return LembreteEnvioService.BTN_CANCELAR;
        return null;
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
