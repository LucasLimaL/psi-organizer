package com.psiorganizer.notificacao.dto;

import java.util.List;

public record NotificacoesEnvelope(List<NotificacaoResponse> notificacoes, long naoLidas) {}
