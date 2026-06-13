package com.psiorganizer.auth.service;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.psiorganizer.admin.service.FaturaService;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.repository.PsicologaRepository;

@Service
public class AuthService {

    public record Resultado(String token, Psicologa psicologa, boolean restrito) {}

    private final PsicologaRepository psicologaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final FaturaService faturaService;

    public AuthService(PsicologaRepository psicologaRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       FaturaService faturaService) {
        this.psicologaRepository = psicologaRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.faturaService = faturaService;
    }

    /**
     * Autentica e avalia a situação contratual no momento do login. Inadimplência
     * (sem contrato vigente OU fatura vencida) NÃO barra o login: a sessão sobe em
     * modo restrito (token com claim {@code restrito=true}), e o JwtAuthFilter só
     * libera a tela de Assinatura — onde o psicólogo regulariza. Bloqueio manual
     * (motivo ADMIN) continua sendo recusa dura (401). Ver docs/BUSINESS_RULES.md §11.
     */
    public Resultado autenticar(String email, String senha) {
        Psicologa p = psicologaRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.naoAutorizado("Credenciais inválidas"));
        if (!passwordEncoder.matches(senha, p.getSenhaHash())) {
            throw ApiException.naoAutorizado("Credenciais inválidas");
        }
        // Checado APÓS a senha — não revela existência/estado de conta a terceiros.
        if (!p.isEmailValidado()) {
            throw ApiException.naoAutorizado(
                    "E-mail ainda não validado. Confira sua caixa de entrada ou peça um novo link.",
                    Map.of("motivo", "EMAIL_NAO_VALIDADO"));
        }
        return avaliarEEmitir(p);
    }

    /**
     * Re-emite o token recalculando a situação — usado pelo botão "já paguei /
     * renovar sessão" da tela de Assinatura: assim que a inadimplência é
     * regularizada (baixa do admin hoje; callback do PIX no futuro), o psicólogo
     * recupera o acesso sem esperar o token de 24h expirar. Bloqueio ADMIN surgido
     * no meio → 401, derrubando a sessão.
     */
    public Resultado renovarSessao(UUID psicologaId) {
        Psicologa p = psicologaRepository.findById(psicologaId)
                .orElseThrow(() -> ApiException.naoAutorizado("Sessão inválida"));
        return avaliarEEmitir(p);
    }

    /**
     * Avalia a situação contratual e emite o token. SEM @Transactional de
     * propósito: cada passo do FaturaService commita na própria transação — o
     * bloqueio não pode depender da transação que emite o token.
     */
    private Resultado avaliarEEmitir(Psicologa p) {
        boolean restrito = false;
        if (!p.isAdmin()) {
            if (p.isBloqueada() && FaturaService.MOTIVO_ADMIN.equals(p.getBloqueadaMotivo())) {
                throw ApiException.naoAutorizado(
                        "Acesso bloqueado. Entre em contato com o administrador do sistema.",
                        Map.of("motivo", "BLOQUEADO_ADMIN"));
            }
            faturaService.materializar(p);
            faturaService.regularizarSePossivel(p);
            restrito = faturaService.bloquearSeIrregular(p).irregular();
        }
        String token = jwtService.gerar(p.getId(), p.getEmail(), p.isAdmin(), restrito);
        return new Resultado(token, p, restrito);
    }
}
