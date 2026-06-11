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

import com.psiorganizer.auth.JwtService;
import com.psiorganizer.common.observability.LogFields;
import com.psiorganizer.common.security.PsicologaPrincipal;

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
            } catch (Exception ignored) {
                // token inválido — segue sem autenticação; SecurityConfig devolve 401
            }
        }
        chain.doFilter(request, response);
    }
}
