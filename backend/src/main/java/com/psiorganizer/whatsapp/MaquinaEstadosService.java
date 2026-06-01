package com.psiorganizer.whatsapp;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.ConsultaRepository;
import com.psiorganizer.consulta.StatusConfirmacao;
import com.psiorganizer.consulta.StatusConsulta;
import com.psiorganizer.notificacao.NotificacaoService;
import com.psiorganizer.paciente.Paciente;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.whatsapp.client.EnvioResultado;
import com.psiorganizer.whatsapp.client.WhatsappException;

/**
 * State machine de 5 estados que reage a botões clicados pela paciente. Spec §5.4.
 *
 *   AGUARDANDO_ESCOLHA
 *     "Confirmar"/"Cancelar" → grava escolha_inicial, envia Msg 2 → AGUARDANDO_CONFIRMACAO_DUPLA
 *
 *   AGUARDANDO_CONFIRMACAO_DUPLA
 *     "Sim, X" → escolha_final=X, aplica na consulta → FINALIZADO
 *     "Voltar":
 *       ciclos<3 → ciclos++, zera escolha_inicial, reenvia Msg 1 → AGUARDANDO_ESCOLHA
 *       ciclos==3 (4ª vez) → envia Msg 3 despedida → CONGELADO_POR_LOOP
 *
 *   FINALIZADO | EXPIRADO | CONGELADO_POR_LOOP → terminal, ignora qualquer resposta
 */
@Service
public class MaquinaEstadosService {

    private static final Logger log = LoggerFactory.getLogger(MaquinaEstadosService.class);

    private final LembreteEnviadoRepository lembreteRepo;
    private final LembreteEnvioService envioService;
    private final ConsultaRepository consultaRepo;
    private final NotificacaoService notificacaoService;

    public MaquinaEstadosService(LembreteEnviadoRepository lembreteRepo,
                                 LembreteEnvioService envioService,
                                 ConsultaRepository consultaRepo,
                                 NotificacaoService notificacaoService) {
        this.lembreteRepo = lembreteRepo;
        this.envioService = envioService;
        this.consultaRepo = consultaRepo;
        this.notificacaoService = notificacaoService;
    }

    /**
     * Processa um clique de botão (ou texto livre) da paciente. Idempotente em
     * estados terminais. Lê-modifica-grava na mesma transação.
     */
    @Transactional
    public void processarResposta(UUID lembreteId, String botaoId, String textoLivre) {
        LembreteEnviado le = lembreteRepo.findById(lembreteId).orElse(null);
        if (le == null) {
            log.warn("[maquina] lembrete sumiu lembreteId={}", lembreteId);
            return;
        }

        EtapaLembrete etapaAtual = le.getEtapa();
        log.info(
                "[maquina] processando lembrete={} etapa={} botao={} texto={}",
                le.getId(), etapaAtual, botaoId, abreviar(textoLivre));

        switch (etapaAtual) {
            case AGUARDANDO_ESCOLHA -> processarEscolhaInicial(le, botaoId);
            case AGUARDANDO_CONFIRMACAO_DUPLA -> processarConfirmacaoDupla(le, botaoId);
            case FINALIZADO, EXPIRADO, CONGELADO_POR_LOOP -> log.info(
                    "[maquina] resposta_em_estado_terminal lembrete={} etapa={} botao={}",
                    le.getId(), etapaAtual, botaoId);
        }
    }

    private void processarEscolhaInicial(LembreteEnviado le, String botaoId) {
        EscolhaLembrete escolha = switch (String.valueOf(botaoId)) {
            case LembreteEnvioService.BTN_CONFIRMAR -> EscolhaLembrete.CONFIRMAR;
            case LembreteEnvioService.BTN_CANCELAR -> EscolhaLembrete.CANCELAR;
            default -> null;
        };
        if (escolha == null) {
            log.info("[maquina] botao_irrelevante etapa=AGUARDANDO_ESCOLHA botao={}", botaoId);
            return;
        }

        Consulta consulta = consultaRepo.findById(le.getConsultaId()).orElse(null);
        Paciente paciente = envioService.buscarPaciente(consulta == null ? null : consulta.getPacienteId());
        if (consulta == null || paciente == null) {
            log.warn("[maquina] consulta/paciente sumiu lembrete={}", le.getId());
            return;
        }

        le.setEscolhaInicial(escolha);
        try {
            EnvioResultado r = envioService.enviarMsg2(le, escolha, paciente, consulta);
            le.setMensagemConfirmacaoDuplaId(r.mensagemIdExterna());
            le.setConfirmacaoDuplaEnviadaEm(Instant.now());
            le.setConfirmacaoDuplaTentativas(1);
            le.setEtapa(EtapaLembrete.AGUARDANDO_CONFIRMACAO_DUPLA);
            log.info(
                    "[maquina] msg2_enviado lembrete={} escolha={} wamid={}",
                    le.getId(), escolha, r.mensagemIdExterna());
        } catch (WhatsappException e) {
            log.warn(
                    "[maquina] msg2_falhou lembrete={} escolha={} codigo={}",
                    le.getId(), escolha, e.getCodigo());
        }
        lembreteRepo.save(le);
    }

    private void processarConfirmacaoDupla(LembreteEnviado le, String botaoId) {
        EscolhaLembrete escolha = le.getEscolhaInicial();
        boolean simConfirmar = LembreteEnvioService.BTN_SIM_CONFIRMAR.equals(botaoId)
                && escolha == EscolhaLembrete.CONFIRMAR;
        boolean simCancelar = LembreteEnvioService.BTN_SIM_CANCELAR.equals(botaoId)
                && escolha == EscolhaLembrete.CANCELAR;

        if (simConfirmar || simCancelar) {
            finalizar(le, escolha);
            return;
        }
        if (LembreteEnvioService.BTN_VOLTAR.equals(botaoId)) {
            voltar(le);
            return;
        }
        log.info(
                "[maquina] botao_irrelevante etapa=AGUARDANDO_CONFIRMACAO_DUPLA botao={}",
                botaoId);
    }

    private void finalizar(LembreteEnviado le, EscolhaLembrete escolhaFinal) {
        le.setEscolhaFinal(escolhaFinal);
        le.setEtapa(EtapaLembrete.FINALIZADO);
        le.setFinalizadoEm(Instant.now());
        aplicarNaConsulta(le, escolhaFinal);
        lembreteRepo.save(le);
        log.info(
                "[maquina] finalizado lembrete={} escolha_final={}",
                le.getId(), escolhaFinal);
    }

    private void aplicarNaConsulta(LembreteEnviado le, EscolhaLembrete escolhaFinal) {
        Consulta c = consultaRepo.findById(le.getConsultaId()).orElse(null);
        if (c == null) return;
        Instant agora = Instant.now();
        if (escolhaFinal == EscolhaLembrete.CONFIRMAR) {
            c.setStatusConfirmacao(StatusConfirmacao.CONFIRMADA);
            c.setConfirmadaPelaPacienteEm(agora);
        } else {
            c.setStatusConfirmacao(StatusConfirmacao.CANCELADA_PELA_PACIENTE);
            c.setStatus(StatusConsulta.CANCELADA);
            criarNotificacaoCancelamento(le, c);
        }
        consultaRepo.save(c);
    }

    private void criarNotificacaoCancelamento(LembreteEnviado le, Consulta c) {
        Paciente paciente = envioService.buscarPaciente(c.getPacienteId());
        String pacienteNome = paciente == null ? "(paciente)" : paciente.getNome();
        String payload = String.format(
                "{\"consultaId\":\"%s\",\"pacienteId\":\"%s\",\"pacienteNome\":\"%s\","
                        + "\"inicio\":\"%s\"}",
                c.getId(), c.getPacienteId(), escaparJson(pacienteNome),
                c.getInicio().toString());
        notificacaoService.criar(
                le.getPsicologaId(),
                NotificacaoService.TIPO_CANCELAMENTO_PACIENTE,
                payload);
    }

    private void voltar(LembreteEnviado le) {
        int ciclos = le.getCiclosVoltar();
        if (ciclos < 3) {
            // ciclos vira 1..3 — re-envia Msg 1 (como texto livre + botões)
            le.setCiclosVoltar(ciclos + 1);
            le.setEscolhaInicial(null);
            le.setConfirmacaoDuplaTentativas(0);
            le.setConfirmacaoDuplaEnviadaEm(null);
            le.setMensagemConfirmacaoDuplaId(null);
            le.setEtapa(EtapaLembrete.AGUARDANDO_ESCOLHA);

            Consulta consulta = consultaRepo.findById(le.getConsultaId()).orElse(null);
            Paciente paciente = envioService.buscarPaciente(
                    consulta == null ? null : consulta.getPacienteId());
            Psicologa psi = envioService.buscarPsicologa(le.getPsicologaId());
            if (consulta != null && paciente != null && psi != null) {
                try {
                    envioService.reenviarMsg1ComoTextoLivre(le, paciente, psi, consulta);
                } catch (WhatsappException e) {
                    log.warn(
                            "[maquina] reenvio_msg1_falhou lembrete={} codigo={}",
                            le.getId(), e.getCodigo());
                }
            }
            lembreteRepo.save(le);
            log.info("[maquina] voltar lembrete={} ciclo={}/3", le.getId(), ciclos + 1);
            return;
        }

        // 4ª vez clicando Voltar → despedida + CONGELADO_POR_LOOP
        Paciente paciente = envioService.buscarPaciente(
                consultaRepo.findById(le.getConsultaId())
                        .map(Consulta::getPacienteId).orElse(null));
        Psicologa psi = envioService.buscarPsicologa(le.getPsicologaId());
        if (paciente != null && psi != null) {
            try {
                envioService.enviarMsg3Despedida(le, paciente, psi);
            } catch (WhatsappException e) {
                log.warn(
                        "[maquina] msg3_despedida_falhou lembrete={} codigo={}",
                        le.getId(), e.getCodigo());
            }
        }
        le.setEtapa(EtapaLembrete.CONGELADO_POR_LOOP);
        le.setFinalizadoEm(Instant.now());
        lembreteRepo.save(le);
        log.info("[maquina] congelado_por_loop lembrete={}", le.getId());
    }

    /**
     * Atualiza apenas status_entrega de uma mensagem em lembrete_enviado. Não mexe
     * em etapa. Chamado pelo WebhookService quando recebe statuses[] da Meta.
     */
    @Transactional
    public void atualizarStatusEntrega(UUID lembreteId, StatusEntrega novoStatus,
                                       String erroCodigo, String erroDescricao) {
        LembreteEnviado le = lembreteRepo.findById(lembreteId).orElse(null);
        if (le == null) return;
        le.setStatusEntrega(novoStatus);
        if (erroCodigo != null) le.setErroCodigo(erroCodigo);
        if (erroDescricao != null) le.setErroDescricao(erroDescricao);
        lembreteRepo.save(le);
        log.debug(
                "[maquina] status_entrega atualizado lembrete={} status={}",
                le.getId(), novoStatus);
    }

    private static String abreviar(String s) {
        if (s == null) return null;
        return s.length() <= 80 ? s : s.substring(0, 80) + "...";
    }

    private static String escaparJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }
}
