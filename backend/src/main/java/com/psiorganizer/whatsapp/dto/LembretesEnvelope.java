package com.psiorganizer.whatsapp.dto;

import java.util.List;

public record LembretesEnvelope(
        List<LembreteResponse> lembretes,
        long total,
        boolean temMais) {}
