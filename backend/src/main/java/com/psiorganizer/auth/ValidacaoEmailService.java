package com.psiorganizer.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.auth.email.EmailValidacaoSender;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

/**
 * Ciclo de validação de e-mail da conta: gera token (24h), envia o link,
 * valida o clique e permite reenvio. O banco guarda só o SHA-256 do token.
 */
@Service
public class ValidacaoEmailService {

    private static final Duration VALIDADE = Duration.ofHours(24);

    private final PsicologaRepository psicologaRepository;
    private final EmailValidacaoSender emailSender;
    private final List<String> emailsPreValidados;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();

    public ValidacaoEmailService(PsicologaRepository psicologaRepository,
                                 EmailValidacaoSender emailSender,
                                 @Value("${psi.auth.emails-pre-validados}") String emailsPreValidados,
                                 @Value("${psi.frontend.url}") String frontendUrl) {
        this.psicologaRepository = psicologaRepository;
        this.emailSender = emailSender;
        this.emailsPreValidados = List.of(emailsPreValidados.toLowerCase().split(","));
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    /** Contas operacionais (ex: auditoria noturna) que nascem validadas — sem caixa de entrada. */
    public boolean preValidado(String email) {
        return emailsPreValidados.contains(email.toLowerCase().strip());
    }

    /** Gera token novo (invalida o anterior), persiste o hash e envia o link. */
    @Transactional
    public void gerarEEnviar(Psicologa p) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        p.setValidacaoTokenHash(sha256Hex(token));
        p.setValidacaoTokenExpiraEm(Instant.now().plus(VALIDADE));
        psicologaRepository.save(p);
        emailSender.enviar(p.getEmail(), p.getNomeCompleto(),
                frontendUrl + "/validar-email?token=" + token);
    }

    @Transactional
    public void validar(String token) {
        Psicologa p = psicologaRepository.findByValidacaoTokenHash(sha256Hex(token))
                .orElseThrow(() -> ApiException.requisicaoInvalida(
                        "Link de validação inválido ou já utilizado"));
        if (p.getValidacaoTokenExpiraEm() == null
                || Instant.now().isAfter(p.getValidacaoTokenExpiraEm())) {
            throw ApiException.requisicaoInvalida(
                    "Link de validação expirado — peça um novo na tela de login");
        }
        p.setEmailValidado(true);
        p.setValidacaoTokenHash(null);
        p.setValidacaoTokenExpiraEm(null);
        psicologaRepository.save(p);
    }

    /**
     * Reenvia o link pra conta ainda não validada. Silencioso quando o e-mail
     * não existe ou já está validado — não revela quais contas existem.
     */
    @Transactional
    public void reenviar(String email) {
        psicologaRepository.findByEmail(email)
                .filter(p -> !p.isEmailValidado())
                .ifPresent(this::gerarEEnviar);
    }

    private static String sha256Hex(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
