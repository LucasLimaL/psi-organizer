package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.psicologa.Psicologa;

/**
 * Visão de gestão de conta no painel admin — dados cadastrais e contratuais,
 * NUNCA dados clínicos (pacientes/consultas ficam fora por princípio LGPD).
 */
public record AdminPsicologaResponse(
        UUID id,
        String nomeCompleto,
        String email,
        String telefone,
        String crp,
        Instant criadoEm,
        boolean admin,
        boolean bloqueada,
        Instant bloqueadaEm,
        ContratoResponse contratoAtivo,
        long mensalidadesPendentes,
        BigDecimal totalPendente) {

    public static AdminPsicologaResponse from(Psicologa p, ContratoResponse contratoAtivo,
                                              long mensalidadesPendentes, BigDecimal totalPendente) {
        return new AdminPsicologaResponse(p.getId(), p.getNomeCompleto(), p.getEmail(),
                p.getTelefone(), p.getCrp(), p.getCriadoEm(), p.isAdmin(),
                p.isBloqueada(), p.getBloqueadaEm(),
                contratoAtivo, mensalidadesPendentes, totalPendente);
    }
}
