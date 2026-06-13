package com.psiorganizer.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.psiorganizer.admin.service.FaturaService;
import com.psiorganizer.admin.service.FaturaService.Situacao;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.repository.PsicologaRepository;

/**
 * Trava os ramos de autorização de {@code avaliarEEmitir} (via autenticar e
 * renovarSessao): inadimplência loga em modo restrito, bloqueio ADMIN recusa com
 * 401, admin nunca é restrito, e a checagem ADMIN vem ANTES de avaliar cobrança.
 * Ver docs/BUSINESS_RULES.md §11.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private PsicologaRepository psicologaRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private FaturaService faturaService;

    private AuthService authService;

    private final UUID id = UUID.fromString("5f9d8d19-6bd7-4896-9701-7e45b800470c");
    private static final Situacao REGULAR = new Situacao(true, 0, BigDecimal.ZERO);
    private static final Situacao IRREGULAR = new Situacao(false, 0, BigDecimal.ZERO);

    @BeforeEach
    void setUp() {
        authService = new AuthService(psicologaRepository, passwordEncoder, jwtService, faturaService);
    }

    /** id/email são lidos só na emissão do token (caminhos felizes) — lenient evita strict-stub. */
    private Psicologa conta() {
        Psicologa p = mock(Psicologa.class);
        lenient().when(p.getId()).thenReturn(id);
        lenient().when(p.getEmail()).thenReturn("ana@psi.com");
        return p;
    }

    @Test
    void loginInadimplente_logaEmModoRestrito() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(false);
        when(p.getSenhaHash()).thenReturn("hash");
        when(p.isEmailValidado()).thenReturn(true);
        when(p.isBloqueada()).thenReturn(false);
        when(psicologaRepository.findByEmail("ana@psi.com")).thenReturn(Optional.of(p));
        when(passwordEncoder.matches("senha123", "hash")).thenReturn(true);
        when(faturaService.bloquearSeIrregular(p)).thenReturn(IRREGULAR);
        when(jwtService.gerar(id, "ana@psi.com", false, true)).thenReturn("tok-restrito");

        AuthService.Resultado r = authService.autenticar("ana@psi.com", "senha123");

        assertThat(r.restrito()).isTrue();
        assertThat(r.token()).isEqualTo("tok-restrito");
        verify(jwtService).gerar(id, "ana@psi.com", false, true);
    }

    @Test
    void loginRegular_naoRestrito() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(false);
        when(p.getSenhaHash()).thenReturn("hash");
        when(p.isEmailValidado()).thenReturn(true);
        when(p.isBloqueada()).thenReturn(false);
        when(psicologaRepository.findByEmail("ana@psi.com")).thenReturn(Optional.of(p));
        when(passwordEncoder.matches("senha123", "hash")).thenReturn(true);
        when(faturaService.bloquearSeIrregular(p)).thenReturn(REGULAR);
        when(jwtService.gerar(id, "ana@psi.com", false, false)).thenReturn("tok");

        AuthService.Resultado r = authService.autenticar("ana@psi.com", "senha123");

        assertThat(r.restrito()).isFalse();
        assertThat(r.token()).isEqualTo("tok");
    }

    @Test
    void loginBloqueioAdmin_recusaAntesDeAvaliarCobranca() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(false);
        when(p.getSenhaHash()).thenReturn("hash");
        when(p.isEmailValidado()).thenReturn(true);
        when(p.isBloqueada()).thenReturn(true);
        when(p.getBloqueadaMotivo()).thenReturn("ADMIN");
        when(psicologaRepository.findByEmail("ana@psi.com")).thenReturn(Optional.of(p));
        when(passwordEncoder.matches("senha123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.autenticar("ana@psi.com", "senha123"))
                .isInstanceOfSatisfying(ApiException.class, ex ->
                        assertThat(((Map<?, ?>) ex.getDetalhes()).get("motivo")).isEqualTo("BLOQUEADO_ADMIN"));

        // ADMIN é avaliado ANTES de materializar/bloquear — não toca cobrança nem emite token.
        verify(faturaService, never()).materializar(any());
        verify(faturaService, never()).bloquearSeIrregular(any());
        verify(jwtService, never()).gerar(any(), any(), anyBoolean(), anyBoolean());
    }

    @Test
    void loginAdmin_nuncaRestrito_eIgnoraCobranca() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(true);
        when(p.getSenhaHash()).thenReturn("hash");
        when(p.isEmailValidado()).thenReturn(true);
        when(psicologaRepository.findByEmail("admin@psi.com")).thenReturn(Optional.of(p));
        when(passwordEncoder.matches("x", "hash")).thenReturn(true);
        when(jwtService.gerar(id, "ana@psi.com", true, false)).thenReturn("tok-admin");

        AuthService.Resultado r = authService.autenticar("admin@psi.com", "x");

        assertThat(r.restrito()).isFalse();
        verify(faturaService, never()).bloquearSeIrregular(any());
    }

    @Test
    void renovarSessao_quandoBloqueioAdmin_recusa() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(false);
        when(p.isBloqueada()).thenReturn(true);
        when(p.getBloqueadaMotivo()).thenReturn("ADMIN");
        when(psicologaRepository.findById(id)).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> authService.renovarSessao(id))
                .isInstanceOfSatisfying(ApiException.class, ex ->
                        assertThat(((Map<?, ?>) ex.getDetalhes()).get("motivo")).isEqualTo("BLOQUEADO_ADMIN"));
    }

    @Test
    void renovarSessao_quandoRegularizou_emiteTokenNaoRestrito() {
        Psicologa p = conta();
        when(p.isAdmin()).thenReturn(false);
        when(p.isBloqueada()).thenReturn(false);
        when(psicologaRepository.findById(id)).thenReturn(Optional.of(p));
        when(faturaService.bloquearSeIrregular(p)).thenReturn(REGULAR);
        when(jwtService.gerar(id, "ana@psi.com", false, false)).thenReturn("tok-novo");

        AuthService.Resultado r = authService.renovarSessao(id);

        assertThat(r.restrito()).isFalse();
        assertThat(r.token()).isEqualTo("tok-novo");
    }

    @Test
    void login_emailNaoValidado_recusa() {
        Psicologa p = mock(Psicologa.class);
        when(p.getSenhaHash()).thenReturn("hash");
        when(p.isEmailValidado()).thenReturn(false);
        when(psicologaRepository.findByEmail("nova@psi.com")).thenReturn(Optional.of(p));
        when(passwordEncoder.matches("senha", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.autenticar("nova@psi.com", "senha"))
                .isInstanceOfSatisfying(ApiException.class, ex ->
                        assertThat(((Map<?, ?>) ex.getDetalhes()).get("motivo")).isEqualTo("EMAIL_NAO_VALIDADO"));
        verify(jwtService, never()).gerar(any(), any(), anyBoolean(), anyBoolean());
    }
}
