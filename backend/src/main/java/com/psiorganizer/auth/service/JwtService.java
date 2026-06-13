package com.psiorganizer.auth.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.psiorganizer.common.security.PsicologaPrincipal;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiracaoHoras;

    public JwtService(@Value("${psi.jwt.secret}") String secret,
                      @Value("${psi.jwt.expiracao-horas}") long expiracaoHoras) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracaoHoras = expiracaoHoras;
    }

    public String gerar(UUID psicologaId, String email, boolean admin, boolean restrito) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(psicologaId.toString())
                .claim("email", email)
                .claim("admin", admin)
                // Conta em situação irregular (inadimplência): a sessão sobe, mas o
                // filtro só libera a tela de Assinatura. Ver docs/BUSINESS_RULES.md §11.
                .claim("restrito", restrito)
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(expiracaoHoras, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    public PsicologaPrincipal validar(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        // Tokens antigos não têm os claims — tratados como não-admin e não-restrito
        boolean admin = Boolean.TRUE.equals(claims.get("admin", Boolean.class));
        boolean restrito = Boolean.TRUE.equals(claims.get("restrito", Boolean.class));
        return new PsicologaPrincipal(UUID.fromString(claims.getSubject()),
                claims.get("email", String.class), admin, restrito);
    }
}
