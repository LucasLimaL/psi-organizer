package com.psiorganizer.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.psiorganizer.psicologa.domain.Psicologa;

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
        String bloqueadaMotivo,
        int diaFechamento,
        ContratoResponse contratoVigente,
        long faturasVencidas,
        BigDecimal totalVencido) {

    public static AdminPsicologaResponse from(Psicologa p, ContratoResponse contratoVigente,
                                              long faturasVencidas, BigDecimal totalVencido) {
        return new AdminPsicologaResponse(p.getId(), p.getNomeCompleto(), p.getEmail(),
                p.getTelefone(), p.getCrp(), p.getCriadoEm(), p.isAdmin(),
                p.isBloqueada(), p.getBloqueadaEm(), p.getBloqueadaMotivo(),
                p.getDiaFechamento(), contratoVigente, faturasVencidas, totalVencido);
    }
}
