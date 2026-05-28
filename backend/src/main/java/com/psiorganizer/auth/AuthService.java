package com.psiorganizer.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

@Service
public class AuthService {

    public record Resultado(String token, Psicologa psicologa) {}

    private final PsicologaRepository psicologaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(PsicologaRepository psicologaRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.psicologaRepository = psicologaRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public Resultado autenticar(String email, String senha) {
        Psicologa p = psicologaRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.naoAutorizado("Credenciais inválidas"));
        if (!passwordEncoder.matches(senha, p.getSenhaHash())) {
            throw ApiException.naoAutorizado("Credenciais inválidas");
        }
        String token = jwtService.gerar(p.getId(), p.getEmail());
        return new Resultado(token, p);
    }
}
