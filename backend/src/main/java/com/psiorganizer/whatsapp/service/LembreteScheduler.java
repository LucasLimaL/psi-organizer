package com.psiorganizer.whatsapp.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import org.slf4j.MDC;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.observability.FlowLogger;
import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.consulta.domain.Consulta;
import com.psiorganizer.consulta.repository.ConsultaRepository;
import com.psiorganizer.whatsapp.domain.ConfiguracaoWhatsapp;
import com.psiorganizer.whatsapp.domain.EtapaLembrete;
import com.psiorganizer.whatsapp.domain.LembreteEnviado;
import com.psiorganizer.whatsapp.domain.WhatsappMetricas;
import com.psiorganizer.whatsapp.repository.ConfiguracaoWhatsappRepository;
import com.psiorganizer.whatsapp.repository.LembreteEnviadoRepository;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;

/**
 * Cron horário (configurável via psi.whatsapp.scheduler-cron) que executa o envio
 * de lembretes:
 *   (a) envio do dia: pra cada psi com horario_envio == hora local atual (SP),
 *       seleciona consultas de amanhã sem lembrete e dispara.
 *   (b) envio late-bound: consultas criadas após o horário escolhido da psi,
 *       com início entre agora+2h e agora+36h.
 *
 * Janela ativa: 07h-20h SP. Fora dela retorna em <10ms. Se o cron iniciou dentro
 * da janela mas demorou pra processar e ultrapassou 20h, NÃO interrompe — não
 * abortar trabalho em andamento por mudança de relógio.
 *
 * Política de log: 1 entrada por tick via {@link FlowLogger} com contadores
 * agregados no MDC. Detalhes em docs/OBSERVABILITY.md.
 */
@Component
public class LembreteScheduler {

    private static final int JANELA_INICIO = 7;   // inclusivo
    private static final int JANELA_FIM = 20;     // inclusivo

    private final ConfiguracaoWhatsappRepository configRepo;
    private final ConsultaRepository consultaRepo;
    private final LembreteEnvioService envioService;
    private final LembreteEnviadoRepository lembreteRepo;
    private final com.psiorganizer.paciente.repository.PacienteRepository pacienteRepo;
    private final WhatsappMetricas metricas;

    public LembreteScheduler(ConfiguracaoWhatsappRepository configRepo,
                             ConsultaRepository consultaRepo,
                             LembreteEnvioService envioService,
                             LembreteEnviadoRepository lembreteRepo,
                             com.psiorganizer.paciente.repository.PacienteRepository pacienteRepo,
                             WhatsappMetricas metricas) {
        this.configRepo = configRepo;
        this.consultaRepo = consultaRepo;
        this.envioService = envioService;
        this.lembreteRepo = lembreteRepo;
        this.pacienteRepo = pacienteRepo;
        this.metricas = metricas;
    }

    @Scheduled(cron = "${psi.whatsapp.scheduler-cron}", zone = "UTC")
    @SchedulerLock(name = "whatsappLembreteCron", lockAtMostFor = "PT55M", lockAtLeastFor = "PT30S")
    public void executar() {
        FlowLogger.executar("scheduler-cron", this::rodar);
    }

    private void rodar() {
        ZonedDateTime agoraSp = ZonedDateTime.now(Fusos.ZONA_BR);
        int horaLocal = agoraSp.getHour();
        if (horaLocal < JANELA_INICIO || horaLocal > JANELA_FIM) {
            return;
        }

        List<ConfiguracaoWhatsapp> ativas = configRepo.findByAtivoTrue();
        if (ativas.isEmpty()) {
            return;
        }

        Instant agora = agoraSp.toInstant();
        LocalDate hoje = agoraSp.toLocalDate();
        LocalDate amanha = hoje.plusDays(1);
        Instant amanhaInicio = amanha.atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant amanhaFim = amanha.plusDays(1).atStartOfDay(Fusos.ZONA_BR).toInstant();

        int totalDia = 0;
        int totalLate = 0;
        for (ConfiguracaoWhatsapp cfg : ativas) {
            totalDia += processarEnvioDoDia(cfg, horaLocal, amanhaInicio, amanhaFim);
            totalLate += processarEnvioLateBound(cfg, agoraSp, agora);
        }
        int[] retry = processarRetryConfirmacaoDupla(agora);

        MDC.put(LogFields.CRON_ENVIADOS_DIA, String.valueOf(totalDia));
        MDC.put(LogFields.CRON_ENVIADOS_LATE, String.valueOf(totalLate));
        MDC.put(LogFields.CRON_MSG2_RETRY, String.valueOf(retry[0]));
        MDC.put(LogFields.CRON_EXPIRADOS, String.valueOf(retry[1]));
    }

    /**
     * Passo (c) do spec §4.3. Pra cada lembrete em AGUARDANDO_CONFIRMACAO_DUPLA com
     * última Msg 2 > 1h atrás:
     *   - tentativas < 3 → reenvia Msg 2 (texto livre + botões na service window)
     *   - tentativas == 3 → marca EXPIRADO (paciente desistiu)
     */
    private int[] processarRetryConfirmacaoDupla(Instant agora) {
        Instant limite = agora.minusSeconds(3600);
        java.util.List<LembreteEnviado> pendentes = lembreteRepo.findPendentesConfirmacaoDupla(limite);
        int reenviados = 0;
        int expirados = 0;
        for (LembreteEnviado le : pendentes) {
            if (le.getConfirmacaoDuplaTentativas() >= 3) {
                le.setEtapa(EtapaLembrete.EXPIRADO);
                le.setFinalizadoEm(agora);
                lembreteRepo.save(le);
                expirados++;
                metricas.expirado();
                continue;
            }
            Consulta consulta = consultaRepo.findById(le.getConsultaId()).orElse(null);
            if (consulta == null) {
                metricas.estadoOrfao();
                continue;
            }
            if (le.getEscolhaInicial() == null) continue;
            com.psiorganizer.paciente.domain.Paciente paciente = pacienteRepo
                    .findById(consulta.getPacienteId()).orElse(null);
            if (paciente == null) {
                metricas.estadoOrfao();
                continue;
            }
            try {
                com.psiorganizer.whatsapp.client.EnvioResultado r = envioService.enviarMsg2(
                        le, le.getEscolhaInicial(), paciente, consulta);
                le.setMensagemConfirmacaoDuplaId(r.mensagemIdExterna());
                le.setConfirmacaoDuplaEnviadaEm(agora);
                le.setConfirmacaoDuplaTentativas(le.getConfirmacaoDuplaTentativas() + 1);
                lembreteRepo.save(le);
                reenviados++;
                metricas.confirmacaoDuplaReenviada();
            } catch (com.psiorganizer.whatsapp.client.WhatsappException e) {
                // Falha por lembrete não interrompe — segue. Erro registrado no domain
                // (erroCodigo) e capturado em métrica; o agregado vai no completion log.
                le.setErroCodigo(e.getCodigo());
                lembreteRepo.save(le);
            }
        }
        return new int[] { reenviados, expirados };
    }

    /**
     * Passo (a): só dispara pra psis cujo horário escolhido bate com a hora local atual.
     */
    private int processarEnvioDoDia(ConfiguracaoWhatsapp cfg, int horaLocal,
                                    Instant amanhaInicio, Instant amanhaFim) {
        if (cfg.getHorarioEnvioLembrete().getHour() != horaLocal) return 0;
        List<Consulta> pendentes = consultaRepo.findPendentesEnvioDoDia(
                cfg.getPsicologaId(), amanhaInicio, amanhaFim);
        int enviados = 0;
        for (Consulta c : pendentes) {
            if (envioService.enviar(c).isPresent()) enviados++;
        }
        return enviados;
    }

    /**
     * Passo (b): consultas criadas depois do horário escolhido da psi de hoje. Cobre
     * marcações de última hora.
     */
    private int processarEnvioLateBound(ConfiguracaoWhatsapp cfg, ZonedDateTime agoraSp,
                                        Instant agora) {
        Instant horarioEscolhidoHojeSp = agoraSp.toLocalDate()
                .atTime(cfg.getHorarioEnvioLembrete())
                .atZone(Fusos.ZONA_BR)
                .toInstant();

        Instant inicioMin = agora.plusSeconds(2 * 3600);
        Instant inicioMax = agora.plusSeconds(36 * 3600);

        List<Consulta> pendentes = consultaRepo.findPendentesEnvioLateBound(
                cfg.getPsicologaId(), inicioMin, inicioMax, horarioEscolhidoHojeSp);
        int enviados = 0;
        for (Consulta c : pendentes) {
            if (envioService.enviar(c).isPresent()) enviados++;
        }
        return enviados;
    }
}
