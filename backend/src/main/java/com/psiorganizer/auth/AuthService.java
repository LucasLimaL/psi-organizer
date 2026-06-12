package com.psiorganizer.auth;

import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.psiorganizer.admin.FaturaService;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

@Service
public class AuthService {

    public record Resultado(String token, Psicologa psicologa) {}

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
     * Autentica e avalia a situação contratual no momento do login:
     * sem contrato vigente OU fatura vencida → bloqueio automático
     * (INADIMPLENCIA) e 401 com motivo estruturado pra tela de situação
     * irregular. Baixa/contrato novo regularizam e desfazem o bloqueio.
     *
     * SEM @Transactional de propósito: cada passo do FaturaService commita na
     * própria transação — o 401 lançado no fim não pode reverter o bloqueio.
     */
    public Resultado autenticar(String email, String senha) {
        Psicologa p = psicologaRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.naoAutorizado("Credenciais inválidas"));
        if (!passwordEncoder.matches(senha, p.getSenhaHash())) {
            throw ApiException.naoAutorizado("Credenciais inválidas");
        }
        if (!p.isAdmin()) {
            if (p.isBloqueada() && FaturaService.MOTIVO_ADMIN.equals(p.getBloqueadaMotivo())) {
                throw ApiException.naoAutorizado(
                        "Acesso bloqueado. Entre em contato com o administrador do sistema.",
                        Map.of("motivo", "BLOQUEADO_ADMIN"));
            }
            faturaService.materializar(p);
            faturaService.regularizarSePossivel(p);
            FaturaService.Situacao s = faturaService.bloquearSeIrregular(p);
            if (s.irregular()) {
                throw ApiException.naoAutorizado(
                        "Conta em situação irregular",
                        Map.of("motivo", "SITUACAO_IRREGULAR",
                                "temContratoVigente", s.temContratoVigente(),
                                "faturasVencidas", s.faturasVencidas(),
                                "totalVencido", s.totalVencido()));
            }
        }
        String token = jwtService.gerar(p.getId(), p.getEmail(), p.isAdmin());
        return new Resultado(token, p);
    }
}
