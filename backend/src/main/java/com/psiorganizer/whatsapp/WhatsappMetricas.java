package com.psiorganizer.whatsapp;

import java.time.Duration;

import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

/**
 * Facade pra todas as métricas Micrometer do canal WhatsApp.
 * Centralizar aqui evita string-magic espalhada e facilita renomeação de métricas.
 *
 * Convenção: snake_case com pontos como separador hierárquico. Tags em snake_case.
 */
@Component
public class WhatsappMetricas {

    private final MeterRegistry registry;

    public WhatsappMetricas(MeterRegistry registry) {
        this.registry = registry;
    }

    // --- Envios -----------------------------------------------------------

    public void enviadoMsg1() {
        Counter.builder("whatsapp.enviados.total").tag("tipo", "msg1").register(registry).increment();
    }

    public void enviadoMsg2() {
        Counter.builder("whatsapp.enviados.total").tag("tipo", "msg2").register(registry).increment();
    }

    public void enviadoMsg3() {
        Counter.builder("whatsapp.enviados.total").tag("tipo", "msg3").register(registry).increment();
    }

    public void confirmacaoDuplaReenviada() {
        Counter.builder("whatsapp.confirmacao_dupla.reenviados.total").register(registry).increment();
    }

    public void expirado() {
        Counter.builder("whatsapp.expirados.total").register(registry).increment();
    }

    public void congeladoPorLoop() {
        Counter.builder("whatsapp.congelados_loop.total").register(registry).increment();
    }

    public void falha(String codigo) {
        Counter.builder("whatsapp.falhas.total")
                .tag("codigo", codigo == null ? "desconhecido" : codigo)
                .register(registry)
                .increment();
    }

    public void pulado(String motivo) {
        Counter.builder("whatsapp.pulados.total")
                .tag("motivo", motivo)
                .register(registry)
                .increment();
    }

    // --- Webhook ----------------------------------------------------------

    public void resposta(EtapaLembrete etapa, String escolha) {
        Counter.builder("whatsapp.respostas.total")
                .tag("etapa", etapa == null ? "desconhecida" : etapa.name())
                .tag("escolha", escolha == null ? "nenhuma" : escolha)
                .register(registry)
                .increment();
    }

    public void eventoOrfao() {
        Counter.builder("whatsapp.eventos.orfaos.total").register(registry).increment();
    }

    public void eventoAmbiguo() {
        Counter.builder("whatsapp.eventos.ambiguos.total").register(registry).increment();
    }

    public void webhookLatencia(Duration d) {
        Timer.builder("whatsapp.webhook.latencia").register(registry).record(d);
    }
}
