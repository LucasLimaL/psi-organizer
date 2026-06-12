package com.psiorganizer.notificacao;

import java.util.List;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.notificacao.dto.NotificacaoResponse;
import com.psiorganizer.notificacao.dto.NotificacoesEnvelope;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/notificacoes")
@Tag(name = "Notificações", description = "Notificações in-app do psicólogo (sino na AppBar)")
public class NotificacaoController {

    private final NotificacaoService service;

    public NotificacaoController(NotificacaoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista notificações não-lidas + contador. Polling do frontend.")
    public NotificacoesEnvelope listarNaoLidas(
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        List<NotificacaoResponse> lista = service.listarNaoLidas(psicologaId, limit).stream()
                .map(NotificacaoResponse::fromDomain)
                .toList();
        long total = service.contarNaoLidas(psicologaId);
        return new NotificacoesEnvelope(lista, total);
    }

    @PostMapping("/{id}/lida")
    @Operation(summary = "Marca uma notificação como lida")
    public ResponseEntity<Void> marcarLida(@PathVariable UUID id) {
        MDC.put(LogFields.NOTIFICACAO_ID, id.toString());
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        service.marcarLida(psicologaId, id);
        return ResponseEntity.noContent().build();
    }
}
