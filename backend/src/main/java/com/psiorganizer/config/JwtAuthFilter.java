package com.psiorganizer.config;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.psiorganizer.auth.service.JwtService;
import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.common.security.PsicologaPrincipal;

import io.jsonwebtoken.JwtException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        boolean bloquearRestrito = false;
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                PsicologaPrincipal principal = jwtService.validar(token);
                var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
                // MDC: NÃO restauramos no finally porque o RequestLoggingFilter (que
                // envolve toda a request) limpa o MDC no final. Restaurar aqui faria o
                // psicologaId sumir antes da emissão do completion log.
                MDC.put(LogFields.PSICOLOGA_ID, principal.id().toString());
                if (principal.email() != null) {
                    MDC.put(LogFields.EMAIL, principal.email());
                }
                // Decide aqui (validar pode falhar), mas só EMITE o 403 fora do try —
                // ver abaixo. Sessão restrita (inadimplência): só Assinatura/renovar.
                bloquearRestrito = principal.restrito() && !permitidoEmModoRestrito(request);
            } catch (JwtException | IllegalArgumentException ignored) {
                // token inválido/malformado — segue sem autenticação; SecurityConfig devolve 401
            }
        }
        // Enforcement do modo restrito FORA do try: se a escrita do 403 falhar, a exceção
        // propaga (fail-closed) em vez de deixar a request restrita cair na chain. O resto
        // recebe 403; enforcement pelo claim do token, sem ida ao banco. Ver docs/BUSINESS_RULES.md §11.
        if (bloquearRestrito) {
            responderContaBloqueada(response);
            return;
        }
        chain.doFilter(request, response);
    }

    /**
     * Endpoints liberados pra uma sessão restrita: ver/regularizar a assinatura. {@code /auth/**}
     * tambem entra — re-login/signup sao publicos e nao podem depender da sessao anterior (o
     * frontend anexa o Authorization em toda chamada). O sub-path de /me/assinatura cobre futuros
     * sub-recursos da tela sem reintroduzir bloqueio acidental.
     */
    private static boolean permitidoEmModoRestrito(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true; // preflight CORS
        }
        String uri = request.getRequestURI();
        return uri.startsWith("/auth/")
                || uri.equals("/me/assinatura")
                || uri.startsWith("/me/assinatura/")
                || uri.equals("/me/renovar-sessao");
    }

    private static void responderContaBloqueada(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"erro\":\"Conta com acesso restrito — regularize a assinatura para "
                + "voltar a usar o sistema.\",\"detalhes\":{\"motivo\":\"CONTA_BLOQUEADA\"}}");
    }
}
