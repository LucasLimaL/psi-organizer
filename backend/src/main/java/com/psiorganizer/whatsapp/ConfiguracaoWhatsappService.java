package com.psiorganizer.whatsapp;

import java.time.LocalTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.exception.ApiException;

@Service
public class ConfiguracaoWhatsappService {

    static final int HORA_MINIMA = 7;
    static final int HORA_MAXIMA = 20;

    private final ConfiguracaoWhatsappRepository repository;

    public ConfiguracaoWhatsappService(ConfiguracaoWhatsappRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ConfiguracaoWhatsapp obterOuCriar(UUID psicologaId) {
        return repository.findByPsicologaId(psicologaId).orElseGet(
                () -> repository.save(new ConfiguracaoWhatsapp(UUID.randomUUID(), psicologaId)));
    }

    @Transactional
    public ConfiguracaoWhatsapp atualizar(UUID psicologaId, boolean ativo, String templateMensagem,
                                          LocalTime horarioEnvioLembrete) {
        validarHorario(horarioEnvioLembrete);
        ConfiguracaoWhatsapp c = obterOuCriar(psicologaId);
        c.atualizar(ativo, templateMensagem, horarioEnvioLembrete);
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
}
