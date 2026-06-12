package com.psiorganizer.admin;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.admin.dto.AssinaturaResponse;
import com.psiorganizer.admin.dto.ContratoResponse;
import com.psiorganizer.admin.dto.FaturaResponse;
import com.psiorganizer.admin.dto.PreviaFaturaResponse;
import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

/**
 * Assinatura self-service: o psicólogo autenticado consulta os PRÓPRIOS
 * contratos e faturas — o escopo é sempre o id do token (multi-tenant
 * preservado por construção; não recebe id de fora).
 */
@Service
public class AssinaturaService {

    private final PsicologaRepository psicologaRepository;
    private final ContratoRepository contratoRepository;
    private final FaturaRepository faturaRepository;
    private final FaturaItemRepository faturaItemRepository;
    private final FaturaService faturaService;

    public AssinaturaService(PsicologaRepository psicologaRepository,
                             ContratoRepository contratoRepository,
                             FaturaRepository faturaRepository,
                             FaturaItemRepository faturaItemRepository,
                             FaturaService faturaService) {
        this.psicologaRepository = psicologaRepository;
        this.contratoRepository = contratoRepository;
        this.faturaRepository = faturaRepository;
        this.faturaItemRepository = faturaItemRepository;
        this.faturaService = faturaService;
    }

    @Transactional
    public AssinaturaResponse minhaAssinatura(UUID psicologaId) {
        Psicologa p = psicologaRepository.findById(psicologaId)
                .orElseThrow(() -> ApiException.naoAutorizado("Conta não encontrada"));
        faturaService.materializar(p);
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);

        List<ContratoResponse> contratos = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId())
                .reversed().stream()
                .map(ContratoResponse::from)
                .toList();

        List<Fatura> faturas = faturaRepository.findByPsicologaIdOrderByPeriodoFimDesc(p.getId());
        List<UUID> ids = faturas.stream().map(Fatura::getId).toList();
        Map<UUID, List<FaturaItem>> itens = ids.isEmpty() ? Map.of()
                : faturaItemRepository.findByFaturaIdInOrderByPeriodoInicioAsc(ids).stream()
                        .collect(Collectors.groupingBy(FaturaItem::getFaturaId));

        return new AssinaturaResponse(
                p.getDiaFechamento(),
                contratos,
                faturas.stream()
                        .map(f -> FaturaResponse.from(f, itens.getOrDefault(f.getId(), List.of()), hoje))
                        .toList(),
                faturaService.previas(p).stream().map(PreviaFaturaResponse::from).toList());
    }
}
