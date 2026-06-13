package com.psiorganizer.psicologa.controller;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.auth.dto.LoginResponse;
import com.psiorganizer.auth.service.AuthService;
import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.psicologa.dto.AlterarSenhaRequest;
import com.psiorganizer.psicologa.dto.AtualizarPerfilRequest;
import com.psiorganizer.psicologa.dto.AtualizarPreferenciasRequest;
import com.psiorganizer.psicologa.dto.PsicologaResponse;
import com.psiorganizer.psicologa.service.PsicologaService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/me")
@Tag(name = "Perfil", description = "Dados do psicólogo autenticado")
public class PerfilController {

    private final PsicologaService psicologaService;
    private final AuthService authService;

    public PerfilController(PsicologaService psicologaService, AuthService authService) {
        this.psicologaService = psicologaService;
        this.authService = authService;
    }

    @GetMapping
    @Operation(summary = "Retorna dados do psicólogo autenticado")
    public PsicologaResponse me() {
        var principal = PsicologaPrincipal.corrente();
        return PsicologaResponse.fromDomain(psicologaService.buscarPorId(principal.id()));
    }

    @PutMapping
    @Operation(summary = "Atualiza dados do perfil (nome, CRP, telefone, endereço). E-mail e CPF "
            + "não são editáveis por aqui; preferências de cobrança ficam em PUT /me/preferencias.")
    public PsicologaResponse atualizar(@Valid @RequestBody AtualizarPerfilRequest req) {
        var principal = PsicologaPrincipal.corrente();
        var atualizada = psicologaService.atualizarPerfil(
                principal.id(),
                req.nomeCompleto(),
                req.crp(),
                req.telefone(),
                req.endereco().toDomain());
        return PsicologaResponse.fromDomain(atualizada);
    }

    @PutMapping("/preferencias")
    @Operation(summary = "Atualiza as preferências do psicólogo autenticado "
            + "(cobrarFaltas e duracaoPadraoMinutos) — usado pela aba Configurações.")
    public PsicologaResponse atualizarPreferencias(@Valid @RequestBody AtualizarPreferenciasRequest req) {
        var principal = PsicologaPrincipal.corrente();
        var atualizada = psicologaService.atualizarPreferencias(
                principal.id(), req.cobrarFaltas(), req.duracaoPadraoMinutos());
        return PsicologaResponse.fromDomain(atualizada);
    }

    @PutMapping("/senha")
    @Operation(summary = "Altera a senha do psicólogo autenticado (exige a senha atual)")
    public ResponseEntity<Void> alterarSenha(@Valid @RequestBody AlterarSenhaRequest req) {
        var principal = PsicologaPrincipal.corrente();
        psicologaService.alterarSenha(principal.id(), req.senhaAtual(), req.novaSenha());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/renovar-sessao")
    @Operation(summary = "Re-emite o token recalculando a situação de cobrança. Usado pelo "
            + "botão 'já paguei' da Assinatura: regularizou a inadimplência → recupera o "
            + "acesso na hora, sem esperar o token expirar. Liberado mesmo em sessão restrita.")
    public LoginResponse renovarSessao() {
        var principal = PsicologaPrincipal.corrente();
        var r = authService.renovarSessao(principal.id());
        return new LoginResponse(r.token(), PsicologaResponse.fromDomain(r.psicologa()), r.restrito());
    }
}
