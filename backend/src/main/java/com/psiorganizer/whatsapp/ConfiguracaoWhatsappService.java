package com.psiorganizer.whatsapp;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.whatsapp.client.EnvioResultado;
import com.psiorganizer.whatsapp.client.WhatsappClient;
import com.psiorganizer.whatsapp.client.WhatsappException;

@Service
public class ConfiguracaoWhatsappService {

    static final int HORA_MINIMA = 7;
    static final int HORA_MAXIMA = 20;

    /** Template HSM padrão da Meta, aprovado em todas as contas. Usado no botão "Enviar teste". */
    private static final String TEMPLATE_HELLO_WORLD = "hello_world";
    private static final String LANG_EN_US = "en_US";

    private final ConfiguracaoWhatsappRepository repository;
    private final WhatsappClient whatsappClient;

    public ConfiguracaoWhatsappService(
            ConfiguracaoWhatsappRepository repository, WhatsappClient whatsappClient) {
        this.repository = repository;
        this.whatsappClient = whatsappClient;
    }

    @Transactional
    public ConfiguracaoWhatsapp obterOuCriar(UUID psicologaId) {
        return repository.findByPsicologaId(psicologaId).orElseGet(
                () -> repository.save(new ConfiguracaoWhatsapp(UUID.randomUUID(), psicologaId)));
    }

    @Transactional
    public ConfiguracaoWhatsapp atualizar(UUID psicologaId, boolean ativo,
                                          LocalTime horarioEnvioLembrete) {
        validarHorario(horarioEnvioLembrete);
        ConfiguracaoWhatsapp c = obterOuCriar(psicologaId);
        c.atualizar(ativo, horarioEnvioLembrete);
        return repository.save(c);
    }

    private void validarHorario(LocalTime horario) {
        if (horario.getMinute() != 0
                || horario.getHour() < HORA_MINIMA
                || horario.getHour() > HORA_MAXIMA) {
            throw ApiException.requisicaoInvalida(
                    "Horário de envio deve ser uma hora cheia entre 07:00 e 20:00");
        }
    }

    /**
     * Smoke test do canal. Dispara o template hello_world (HSM padrão Meta) pro número
     * informado. Não persiste lembrete_enviado — é só pra a psi confirmar que o
     * canal funciona antes de ativar lembretes pra paciente real.
     */
    public String enviarTeste(UUID psicologaId, String telefoneE164) {
        try {
            EnvioResultado r = whatsappClient.enviarTemplate(
                    telefoneE164, TEMPLATE_HELLO_WORLD, LANG_EN_US, List.of());
            return r.mensagemIdExterna();
        } catch (WhatsappException e) {
            // WhatsappException carrega body Meta — convertemos em ApiException
            // pro GlobalExceptionHandler logar (WARN) com o contexto preservado.
            throw ApiException.requisicaoInvalida(
                    "Falha ao enviar pelo WhatsApp (" + e.getCodigo() + "): " + e.getMessage());
        }
    }
}
