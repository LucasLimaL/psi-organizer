package com.psiorganizer.consulta.dto;

import java.util.List;

/**
 * Envelope de paginação para listas de consultas (próximas / histórico
 * de um paciente). Frontend usa `total` pra mostrar contagem na aba e
 * `temMais` pra decidir se exibe o botão "Ver mais".
 */
public record ConsultasPaginadoResponse(
        List<ConsultaResponse> consultas,
        long total,
        boolean temMais) {}
