package com.psiorganizer.admin.dto;

import java.util.List;

/** Envelope de paginação da lista de psicólogos do painel admin. */
public record AdminPsicologasPaginadoResponse(
        List<AdminPsicologaResponse> psicologos,
        long total,
        boolean temMais) {}
