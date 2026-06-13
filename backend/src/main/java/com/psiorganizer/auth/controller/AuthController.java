package com.psiorganizer.auth.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.auth.dto.LoginRequest;
import com.psiorganizer.auth.dto.LoginResponse;
import com.psiorganizer.auth.dto.ReenviarValidacaoRequest;
import com.psiorganizer.auth.dto.SignupRequest;
import com.psiorganizer.auth.dto.SignupResponse;
import com.psiorganizer.auth.dto.ValidarEmailRequest;
import com.psiorganizer.auth.service.AuthService;
import com.psiorganizer.auth.service.JwtService;
import com.psiorganizer.auth.service.ValidacaoEmailService;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.dto.PsicologaResponse;
import com.psiorganizer.psicologa.service.PsicologaService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "Cadastro e login de psicólogos")
public class AuthController {

    private final PsicologaService psicologaService;
    private final AuthService authService;
    private final JwtService jwtService;
    private final ValidacaoEmailService validacaoEmailService;

    public AuthController(PsicologaService psicologaService,
                          AuthService authService,
                          JwtService jwtService,
                          ValidacaoEmailService validacaoEmailService) {
        this.psicologaService = psicologaService;
        this.authService = authService;
        this.jwtService = jwtService;
        this.validacaoEmailService = validacaoEmailService;
    }

    @PostMapping("/signup")
    @Operation(summary = "Cria uma conta de psicólogo. A conta nasce não validada e recebe "
            + "um link de ativação por e-mail (24h) — sem validar, não loga. Nesse caso o "
            + "token vem nulo e emailValidacaoPendente=true.")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest req) {
        boolean preValidado = validacaoEmailService.preValidado(req.email());
        Psicologa p = psicologaService.criar(
                req.nomeCompleto(),
                req.email(),
                req.senha(),
                req.cpf(),
                req.crp(),
                req.telefone(),
                req.diaFechamento(),
                req.endereco().toDomain(),
                preValidado);
        if (preValidado) {
            String token = jwtService.gerar(p.getId(), p.getEmail(), false);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new SignupResponse(false, token, PsicologaResponse.fromDomain(p)));
        }
        validacaoEmailService.gerarEEnviar(p);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new SignupResponse(true, null, PsicologaResponse.fromDomain(p)));
    }

    @PostMapping("/validar-email")
    @Operation(summary = "Valida o e-mail da conta a partir do token recebido no link. "
            + "Token inválido, já usado ou expirado → 400.")
    public ResponseEntity<Void> validarEmail(@Valid @RequestBody ValidarEmailRequest req) {
        validacaoEmailService.validar(req.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reenviar-validacao")
    @Operation(summary = "Reenvia o link de validação pra conta ainda não validada. "
            + "Sempre 202 — não revela se o e-mail existe.")
    public ResponseEntity<Void> reenviarValidacao(@Valid @RequestBody ReenviarValidacaoRequest req) {
        validacaoEmailService.reenviar(req.email());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica psicólogo e retorna JWT")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        var r = authService.autenticar(req.email(), req.senha());
        return new LoginResponse(r.token(), PsicologaResponse.fromDomain(r.psicologa()));
    }
}
