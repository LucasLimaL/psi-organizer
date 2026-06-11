package com.psiorganizer.whatsapp;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Gatilho HTTP do scheduler de lembretes — pra Cloud Run, onde a instância pode
 * estar dormindo (scale-to-zero) na hora do cron interno. O Cloud Scheduler chama
 * este endpoint de hora em hora; em prod o @Scheduled interno é desligado com
 * WHATSAPP_SCHEDULER_CRON="-".
 *
 * Proteção: token compartilhado em X-Tick-Token (comparação constant-time).
 * Token não configurado = endpoint desabilitado (fail closed, 401 sempre).
 * O ShedLock continua valendo na chamada — gatilho duplicado não duplica envio.
 */
@RestController
@RequestMapping("/internal/whatsapp")
@Hidden
public class SchedulerTickController {

    private final LembreteScheduler scheduler;
    private final String tickToken;

    public SchedulerTickController(LembreteScheduler scheduler,
                                   @Value("${psi.scheduler.tick-token:}") String tickToken) {
        this.scheduler = scheduler;
        this.tickToken = tickToken;
    }

    @PostMapping("/tick")
    public ResponseEntity<Void> tick(
            @RequestHeader(name = "X-Tick-Token", required = false) String token) {
        if (!autorizado(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        scheduler.executar();
        return ResponseEntity.noContent().build();
    }

    private boolean autorizado(String recebido) {
        if (tickToken == null || tickToken.isBlank() || recebido == null) {
            return false;
        }
        return MessageDigest.isEqual(
                tickToken.getBytes(StandardCharsets.UTF_8),
                recebido.getBytes(StandardCharsets.UTF_8));
    }
}
