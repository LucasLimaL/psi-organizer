package com.psiorganizer.whatsapp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.whatsapp.dto.AtualizarConfiguracaoWhatsappRequest;
import com.psiorganizer.whatsapp.dto.ConfiguracaoWhatsappResponse;
import com.psiorganizer.whatsapp.dto.EnviarTesteRequest;
import com.psiorganizer.whatsapp.dto.EnviarTesteResponse;
import com.psiorganizer.whatsapp.dto.LembreteResponse;
import com.psiorganizer.whatsapp.dto.LembretesEnvelope;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me/whatsapp")
@Tag(name = "WhatsApp", description = "Configuração de lembretes automáticos via WhatsApp")
public class ConfiguracaoWhatsappController {

    private final ConfiguracaoWhatsappService service;
    private final HistoricoLembretesService historicoService;

    public ConfiguracaoWhatsappController(ConfiguracaoWhatsappService service,
                                          HistoricoLembretesService historicoService) {
        this.service = service;
        this.historicoService = historicoService;
    }

    @GetMapping
    @Operation(summary = "Retorna a configuração de WhatsApp do psicólogo autenticado")
    public ConfiguracaoWhatsappResponse obter() {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        return ConfiguracaoWhatsappResponse.fromDomain(service.obterOuCriar(psicologaId));
    }

    @PutMapping
    @Operation(summary = "Atualiza ativo e horário de envio dos lembretes",
            description = "O template da mensagem não é editável — é registrado e aprovado "
                    + "na plataforma da Meta; o GET expõe a prévia em templateMensagem.")
    public ConfiguracaoWhatsappResponse atualizar(
            @Valid @RequestBody AtualizarConfiguracaoWhatsappRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        ConfiguracaoWhatsapp c = service.atualizar(
                psicologaId,
                req.ativo(),
                ConfiguracaoWhatsappResponse.parseHorario(req.horarioEnvioLembrete()));
        return ConfiguracaoWhatsappResponse.fromDomain(c);
    }

    @PostMapping("/teste")
    @Operation(
            summary = "Envia mensagem de teste pelo WhatsApp",
            description = "Dispara o template hello_world (HSM padrão Meta) pro telefone "
                    + "informado. Útil pra a psi confirmar que o canal funciona antes de "
                    + "ativar lembretes pra paciente real.")
    public ResponseEntity<EnviarTesteResponse> enviarTeste(
            @Valid @RequestBody EnviarTesteRequest req) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        String mensagemId = service.enviarTeste(psicologaId, req.telefoneE164());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new EnviarTesteResponse(mensagemId));
    }

    @GetMapping("/lembretes")
    @Operation(summary = "Histórico paginado de lembretes pra auditoria")
    public LembretesEnvelope listarHistorico(
            @RequestParam(required = false) UUID consultaId,
            @RequestParam(required = false) EtapaLembrete etapa,
            @RequestParam(required = false) StatusEntrega statusEntrega,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicioEm,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fimEm,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Instant enviadoApos = inicioEm == null ? null
                : inicioEm.atStartOfDay(Fusos.ZONA_BR).toInstant();
        Instant enviadoAntes = fimEm == null ? null
                : fimEm.plusDays(1).atStartOfDay(Fusos.ZONA_BR).toInstant();
        HistoricoLembretesService.HistoricoLembretes historico = historicoService.listar(
                psicologaId, consultaId, etapa, statusEntrega,
                enviadoApos, enviadoAntes, limit, offset);
        return new LembretesEnvelope(
                historico.itens().stream()
                        .map(i -> LembreteResponse.from(
                                i.lembrete(), i.pacienteNome(), i.consultaInicio()))
                        .toList(),
                historico.total(),
                historico.temMais());
    }
}
