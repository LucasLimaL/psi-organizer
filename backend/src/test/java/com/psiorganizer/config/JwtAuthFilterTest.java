package com.psiorganizer.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import com.psiorganizer.auth.service.JwtService;

/**
 * Trava o enforcement do modo restrito no filtro: token restrito só passa no
 * allowlist ({@code /me/assinatura}[/...], {@code /me/renovar-sessao}, {@code /auth/**},
 * preflight); o resto recebe 403 CONTA_BLOQUEADA e NÃO chega à chain. Em especial,
 * /auth/** deve passar (regressão do re-login bloqueado). Ver docs/BUSINESS_RULES.md §11.
 */
class JwtAuthFilterTest {

    private static final String SECRET = "segredo-de-teste-bem-longo-pra-hmac-sha-com-no-minimo-32-bytes-ok";
    private final JwtService jwtService = new JwtService(SECRET, 24);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService);
    private final UUID id = UUID.randomUUID();

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    private String tokenRestrito() {
        return jwtService.gerar(id, "ana@psi.com", false, true);
    }

    private String tokenNormal() {
        return jwtService.gerar(id, "ana@psi.com", false, false);
    }

    private record Run(HttpServletResponse resp, FilterChain chain, StringWriter body) {}

    private Run executar(String token, String method, String uri) throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        HttpServletResponse resp = mock(HttpServletResponse.class);
        FilterChain chain = mock(FilterChain.class);
        StringWriter body = new StringWriter();
        when(req.getHeader("Authorization")).thenReturn(token == null ? null : "Bearer " + token);
        when(req.getMethod()).thenReturn(method);
        when(req.getRequestURI()).thenReturn(uri);
        when(resp.getWriter()).thenReturn(new PrintWriter(body));
        filter.doFilterInternal(req, resp, chain);
        return new Run(resp, chain, body);
    }

    private void assertBloqueado(Run r) throws Exception {
        verify(r.resp()).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(r.chain(), never()).doFilter(any(), any());
        assertThat(r.body().toString()).contains("CONTA_BLOQUEADA");
    }

    private void assertLiberado(Run r) throws Exception {
        verify(r.chain()).doFilter(any(), any());
        verify(r.resp(), never()).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    void restrito_bloqueiaEndpointForaDoAllowlist() throws Exception {
        assertBloqueado(executar(tokenRestrito(), "GET", "/me"));
        assertBloqueado(executar(tokenRestrito(), "GET", "/pacientes"));
        assertBloqueado(executar(tokenRestrito(), "GET", "/financeiro/resumo"));
    }

    @Test
    void restrito_liberaAssinaturaERenovar() throws Exception {
        assertLiberado(executar(tokenRestrito(), "GET", "/me/assinatura"));
        assertLiberado(executar(tokenRestrito(), "POST", "/me/renovar-sessao"));
    }

    @Test
    void restrito_liberaSubpathDeAssinatura() throws Exception {
        // hardening: futuros sub-recursos de /me/assinatura não devem cair em 403
        assertLiberado(executar(tokenRestrito(), "GET", "/me/assinatura/faturas"));
    }

    @Test
    void restrito_liberaReloginEmAuth() throws Exception {
        // regressão: token restrito antigo anexado a /auth/** NÃO pode bloquear o re-login
        assertLiberado(executar(tokenRestrito(), "POST", "/auth/login"));
        assertLiberado(executar(tokenRestrito(), "POST", "/auth/signup"));
    }

    @Test
    void restrito_liberaPreflightOptions() throws Exception {
        assertLiberado(executar(tokenRestrito(), "OPTIONS", "/me"));
    }

    @Test
    void naoRestrito_passaNormalmente() throws Exception {
        assertLiberado(executar(tokenNormal(), "GET", "/me"));
    }

    @Test
    void semToken_naoBloqueia() throws Exception {
        // sem Authorization o filtro não autentica nem bloqueia; SecurityConfig é quem dá 401
        assertLiberado(executar(null, "GET", "/me"));
    }
}
