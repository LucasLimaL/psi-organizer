package com.psiorganizer.whatsapp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.psiorganizer.consulta.Consulta;
import com.psiorganizer.consulta.ConsultaRepository;

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
 * Sem retry de Msg 2 nesta PR (vai na PR C junto com webhook + máquina completa).
 */
@Component
public class LembreteScheduler {

    private static final Logger log = LoggerFactory.getLogger(LembreteScheduler.class);

    private static final ZoneId ZONA_BR = ZoneId.of("America/Sao_Paulo");
    private static final int JANELA_INICIO = 7;   // inclusivo
    private static final int JANELA_FIM = 20;     // inclusivo

    private final ConfiguracaoWhatsappRepository configRepo;
    private final ConsultaRepository consultaRepo;
    private final LembreteEnvioService envioService;

    public LembreteScheduler(ConfiguracaoWhatsappRepository configRepo,
                             ConsultaRepository consultaRepo,
                             LembreteEnvioService envioService) {
        this.configRepo = configRepo;
        this.consultaRepo = consultaRepo;
        this.envioService = envioService;
    }

    @Scheduled(cron = "${psi.whatsapp.scheduler-cron}", zone = "UTC")
    @SchedulerLock(name = "whatsappLembreteCron", lockAtMostFor = "PT55M", lockAtLeastFor = "PT30S")
    public void executar() {
        ZonedDateTime agoraSp = ZonedDateTime.now(ZONA_BR);
        int horaLocal = agoraSp.getHour();
        if (horaLocal < JANELA_INICIO || horaLocal > JANELA_FIM) {
            log.debug("[scheduler] fora da janela ativa hora_sp={}", horaLocal);
            return;
        }

        List<ConfiguracaoWhatsapp> ativas = configRepo.findByAtivoTrue();
        if (ativas.isEmpty()) {
            log.debug("[scheduler] nenhuma psi com lembretes ativos");
            return;
        }

        log.info(
                "[scheduler] iniciando hora_sp={} psis_ativas={}",
                horaLocal, ativas.size());

        Instant agora = agoraSp.toInstant();
        LocalDate hoje = agoraSp.toLocalDate();
        LocalDate amanha = hoje.plusDays(1);
        Instant amanhaInicio = amanha.atStartOfDay(ZONA_BR).toInstant();
        Instant amanhaFim = amanha.plusDays(1).atStartOfDay(ZONA_BR).toInstant();

        int totalDia = 0;
        int totalLate = 0;
        for (ConfiguracaoWhatsapp cfg : ativas) {
            totalDia += processarEnvioDoDia(cfg, horaLocal, amanhaInicio, amanhaFim);
            totalLate += processarEnvioLateBound(cfg, agoraSp, agora);
        }

        log.info(
                "[scheduler] concluído enviados_dia={} enviados_late={}",
                totalDia, totalLate);
    }

    /**
     * Passo (a): só dispara pra psis cujo horário escolhido bate com a hora local atual.
     * Cobre o caso happy-path — psi escolheu 18h, é 18h em SP → manda os lembretes
     * de amanhã todos de uma vez.
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
        if (!pendentes.isEmpty()) {
            log.info(
                    "[scheduler-a] psi={} pendentes={} enviados={}",
                    cfg.getPsicologaId(), pendentes.size(), enviados);
        }
        return enviados;
    }

    /**
     * Passo (b): consultas criadas depois do horário escolhido da psi de hoje. Cobre
     * marcações de última hora. Sem condição da hora local — qualquer cron dentro da
     * janela pode disparar essas, porque a janela já foi validada na entrada.
     */
    private int processarEnvioLateBound(ConfiguracaoWhatsapp cfg, ZonedDateTime agoraSp,
                                        Instant agora) {
        // criado_em > início do dia em SP + horário escolhido da psi
        Instant horarioEscolhidoHojeSp = agoraSp.toLocalDate()
                .atTime(cfg.getHorarioEnvioLembrete())
                .atZone(ZONA_BR)
                .toInstant();

        Instant inicioMin = agora.plusSeconds(2 * 3600);   // > agora + 2h
        Instant inicioMax = agora.plusSeconds(36 * 3600);  // <= agora + 36h

        List<Consulta> pendentes = consultaRepo.findPendentesEnvioLateBound(
                cfg.getPsicologaId(), inicioMin, inicioMax, horarioEscolhidoHojeSp);
        int enviados = 0;
        for (Consulta c : pendentes) {
            if (envioService.enviar(c).isPresent()) enviados++;
        }
        if (!pendentes.isEmpty()) {
            log.info(
                    "[scheduler-b] psi={} pendentes={} enviados={}",
                    cfg.getPsicologaId(), pendentes.size(), enviados);
        }
        return enviados;
    }
}
