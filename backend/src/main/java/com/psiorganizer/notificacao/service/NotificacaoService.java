package com.psiorganizer.notificacao.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.notificacao.domain.Notificacao;
import com.psiorganizer.notificacao.repository.NotificacaoRepository;

@Service
public class NotificacaoService {

    public static final String TIPO_CANCELAMENTO_PACIENTE = "CANCELAMENTO_PELA_PACIENTE";

    private final NotificacaoRepository repository;

    public NotificacaoService(NotificacaoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Notificacao criar(UUID psicologaId, String tipo, String payloadJson) {
        Notificacao n = new Notificacao(UUID.randomUUID(), psicologaId, tipo, payloadJson);
        return repository.save(n);
    }

    @Transactional(readOnly = true)
    public List<Notificacao> listarNaoLidas(UUID psicologaId, int limit) {
        int seguro = Math.max(1, Math.min(100, limit));
        return repository.naoLidas(psicologaId, PageRequest.of(0, seguro));
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas(UUID psicologaId) {
        return repository.countByPsicologaIdAndLidaEmIsNull(psicologaId);
    }

    @Transactional
    public void marcarLida(UUID psicologaId, UUID id) {
        Notificacao n = repository.findByIdAndPsicologaId(id, psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Notificação não encontrada"));
        n.marcarLida();
        repository.save(n);
    }
}
