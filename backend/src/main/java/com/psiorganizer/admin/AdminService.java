package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.admin.dto.AdminPsicologaResponse;
import com.psiorganizer.admin.dto.AdminPsicologasPaginadoResponse;
import com.psiorganizer.admin.dto.ContratoResponse;
import com.psiorganizer.admin.dto.MensalidadeResponse;
import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

/**
 * Gestão de contas do SaaS — exclusivo de usuários admin. Cruza tenants de
 * propósito (admin enxerga todas as psicólogas), mas APENAS dados cadastrais
 * e contratuais: nada de pacientes/consultas aqui (princípio LGPD).
 *
 * Todo método público começa com {@link #exigirAdmin} — a flag é verificada
 * NO BANCO, não só no claim do token (admin rebaixado perde acesso na hora).
 */
@Service
public class AdminService {

    private final PsicologaRepository psicologaRepository;
    private final ContratoRepository contratoRepository;
    private final MensalidadeRepository mensalidadeRepository;

    public AdminService(PsicologaRepository psicologaRepository,
                        ContratoRepository contratoRepository,
                        MensalidadeRepository mensalidadeRepository) {
        this.psicologaRepository = psicologaRepository;
        this.contratoRepository = contratoRepository;
        this.mensalidadeRepository = mensalidadeRepository;
    }

    private void exigirAdmin(UUID solicitanteId) {
        Psicologa solicitante = psicologaRepository.findById(solicitanteId)
                .orElseThrow(() -> ApiException.naoAutorizado("Conta não encontrada"));
        if (!solicitante.isAdmin()) {
            throw ApiException.proibido("Acesso restrito a administradores");
        }
    }

    @Transactional
    public AdminPsicologasPaginadoResponse listarPsicologas(
            UUID solicitanteId, String busca, int limit, int offset) {
        exigirAdmin(solicitanteId);
        Pageable page = PageRequest.of(offset / Math.max(limit, 1), limit);
        List<Psicologa> psicologas = psicologaRepository.buscarTodas(busca, page);
        long total = psicologaRepository.contarTodas(busca);

        List<UUID> ids = psicologas.stream().map(Psicologa::getId).toList();
        List<Contrato> ativos = ids.isEmpty()
                ? List.of()
                : contratoRepository.findByPsicologaIdInAndAtivoTrue(ids);
        // Materializa competências vencidas antes de contar pendências
        ativos.forEach(this::materializarMensalidades);
        Map<UUID, Contrato> contratoPorPsicologa = ativos.stream()
                .collect(Collectors.toMap(Contrato::getPsicologaId, c -> c, (a, b) -> a));
        Map<UUID, PendenciaProjecao> pendencias = ids.isEmpty()
                ? Map.of()
                : mensalidadeRepository.pendenciasPorPsicologa(ids).stream()
                        .collect(Collectors.toMap(PendenciaProjecao::psicologaId, p -> p));

        List<AdminPsicologaResponse> itens = psicologas.stream()
                .map(p -> {
                    Contrato c = contratoPorPsicologa.get(p.getId());
                    PendenciaProjecao pend = pendencias.get(p.getId());
                    return AdminPsicologaResponse.from(p,
                            c == null ? null : ContratoResponse.from(c),
                            pend == null ? 0 : pend.quantidade(),
                            pend == null ? BigDecimal.ZERO : pend.total());
                })
                .toList();
        boolean temMais = offset + psicologas.size() < total;
        return new AdminPsicologasPaginadoResponse(itens, total, temMais);
    }

    @Transactional
    public void bloquear(UUID solicitanteId, UUID psicologaId, boolean bloqueada) {
        exigirAdmin(solicitanteId);
        if (solicitanteId.equals(psicologaId)) {
            throw ApiException.requisicaoInvalida("Você não pode bloquear a própria conta");
        }
        Psicologa p = psicologaRepository.findById(psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Psicóloga não encontrada"));
        if (p.isAdmin()) {
            throw ApiException.requisicaoInvalida("Contas de administrador não podem ser bloqueadas");
        }
        p.setBloqueada(bloqueada);
        p.setBloqueadaEm(bloqueada ? Instant.now() : null);
        psicologaRepository.save(p);
    }

    @Transactional
    public List<ContratoResponse> listarContratos(UUID solicitanteId, UUID psicologaId) {
        exigirAdmin(solicitanteId);
        return contratoRepository.findByPsicologaIdOrderByCriadoEmDesc(psicologaId).stream()
                .map(ContratoResponse::from)
                .toList();
    }

    /** Cria um contrato novo; o ativo anterior (se houver) é desativado. */
    @Transactional
    public ContratoResponse criarContrato(UUID solicitanteId, UUID psicologaId,
                                          java.time.LocalDate dataInicio,
                                          java.time.LocalDate dataFim,
                                          BigDecimal valorMensal) {
        exigirAdmin(solicitanteId);
        if (dataFim != null && dataFim.isBefore(dataInicio)) {
            throw ApiException.requisicaoInvalida("dataFim precisa ser >= dataInicio");
        }
        Psicologa p = psicologaRepository.findById(psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Psicóloga não encontrada"));
        contratoRepository.findFirstByPsicologaIdAndAtivoTrueOrderByCriadoEmDesc(p.getId())
                .ifPresent(anterior -> {
                    anterior.setAtivo(false);
                    contratoRepository.save(anterior);
                });
        Contrato novo = new Contrato(UUID.randomUUID(), p.getId(), dataInicio, dataFim, valorMensal);
        return ContratoResponse.from(contratoRepository.save(novo));
    }

    /** Encerra (desativa) um contrato — para de gerar novas mensalidades. */
    @Transactional
    public ContratoResponse encerrarContrato(UUID solicitanteId, UUID contratoId) {
        exigirAdmin(solicitanteId);
        Contrato c = contratoRepository.findById(contratoId)
                .orElseThrow(() -> ApiException.naoEncontrado("Contrato não encontrado"));
        c.setAtivo(false);
        if (c.getDataFim() == null) {
            c.setDataFim(java.time.LocalDate.now(Fusos.ZONA_BR));
        }
        return ContratoResponse.from(contratoRepository.save(c));
    }

    @Transactional
    public List<MensalidadeResponse> listarMensalidades(UUID solicitanteId, UUID psicologaId) {
        exigirAdmin(solicitanteId);
        contratoRepository.findFirstByPsicologaIdAndAtivoTrueOrderByCriadoEmDesc(psicologaId)
                .ifPresent(this::materializarMensalidades);
        return mensalidadeRepository.findByPsicologaIdOrderByCompetenciaDesc(psicologaId).stream()
                .map(MensalidadeResponse::from)
                .toList();
    }

    @Transactional
    public MensalidadeResponse darBaixa(UUID solicitanteId, UUID mensalidadeId, boolean paga) {
        exigirAdmin(solicitanteId);
        Mensalidade m = mensalidadeRepository.findById(mensalidadeId)
                .orElseThrow(() -> ApiException.naoEncontrado("Mensalidade não encontrada"));
        m.setPaga(paga);
        m.setPagaEm(paga ? Instant.now() : null);
        return MensalidadeResponse.from(mensalidadeRepository.save(m));
    }

    /**
     * Materializa as competências vencidas do contrato: do mês de dataInicio
     * até o mês atual (ou dataFim, se anterior). Idempotente — competência já
     * lançada não é recriada (e baixa dada não é perdida). Contrato desativado
     * para de gerar novas; as já lançadas permanecem cobráveis.
     */
    private void materializarMensalidades(Contrato c) {
        if (!c.isAtivo()) return;
        YearMonth cursor = YearMonth.from(c.getDataInicio());
        YearMonth atual = YearMonth.now(Fusos.ZONA_BR);
        YearMonth fim = c.getDataFim() != null && YearMonth.from(c.getDataFim()).isBefore(atual)
                ? YearMonth.from(c.getDataFim())
                : atual;
        Set<String> existentes = mensalidadeRepository.findByContratoId(c.getId()).stream()
                .map(Mensalidade::getCompetencia)
                .collect(Collectors.toCollection(HashSet::new));
        List<Mensalidade> novas = new ArrayList<>();
        while (!cursor.isAfter(fim)) {
            String competencia = cursor.toString();
            if (!existentes.contains(competencia)) {
                novas.add(new Mensalidade(UUID.randomUUID(), c.getId(), c.getPsicologaId(),
                        competencia, c.getValorMensal()));
            }
            cursor = cursor.plusMonths(1);
        }
        if (!novas.isEmpty()) {
            mensalidadeRepository.saveAll(novas);
        }
    }
}
