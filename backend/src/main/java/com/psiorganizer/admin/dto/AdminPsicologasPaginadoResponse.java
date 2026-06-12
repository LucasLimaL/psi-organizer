package com.psiorganizer.admin.dto;

import java.util.List;

/** Envelope de paginação da lista de psicólogas do painel admin. */
public record AdminPsicologasPaginadoResponse(
        List<AdminPsicologaResponse> psicologas,
        long total,
        boolean temMais) {}
