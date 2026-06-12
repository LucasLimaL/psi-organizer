package com.psiorganizer.auth;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.auth.dto.LoginRequest;
import com.psiorganizer.auth.dto.LoginResponse;
import com.psiorganizer.auth.dto.SignupRequest;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaService;
import com.psiorganizer.psicologa.dto.PsicologaResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "Cadastro e login de psicólogos")
public class AuthController {

    private final PsicologaService psicologaService;
    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(PsicologaService psicologaService,
                          AuthService authService,
                          JwtService jwtService) {
        this.psicologaService = psicologaService;
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/signup")
    @Operation(summary = "Cria uma conta de psicólogo")
    public ResponseEntity<LoginResponse> signup(@Valid @RequestBody SignupRequest req) {
        Psicologa p = psicologaService.criar(
                req.nomeCompleto(),
                req.email(),
                req.senha(),
                req.cpf(),
                req.crp(),
                req.telefone(),
                req.endereco().toDomain());
        String token = jwtService.gerar(p.getId(), p.getEmail(), false);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new LoginResponse(token, PsicologaResponse.fromDomain(p)));
    }

    @PostMapping("/login")
    @Operation(summary = "Autentica psicólogo e retorna JWT")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        var r = authService.autenticar(req.email(), req.senha());
        return new LoginResponse(r.token(), PsicologaResponse.fromDomain(r.psicologa()));
    }
}
