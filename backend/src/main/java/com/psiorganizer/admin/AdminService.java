package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.admin.dto.AdminPsicologaResponse;
import com.psiorganizer.admin.dto.AdminPsicologasPaginadoResponse;
import com.psiorganizer.admin.dto.ContratoResponse;
import com.psiorganizer.admin.dto.FaturaResponse;
import com.psiorganizer.admin.dto.FaturasResponse;
import com.psiorganizer.admin.dto.PreviaFaturaResponse;
import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.psicologa.domain.Psicologa;
import com.psiorganizer.psicologa.repository.PsicologaRepository;

/**
 * Gestão de contas do SaaS — exclusivo de usuários admin. Cruza tenants de
 * propósito (admin enxerga todos os psicólogos), mas APENAS dados cadastrais
 * e contratuais: nada de pacientes/consultas aqui (princípio LGPD).
 *
 * Todo método público começa com {@link #exigirAdmin} — a flag é verificada
 * NO BANCO, não só no claim do token (admin rebaixado perde acesso na hora).
 */
@Service
public class AdminService {

    private final PsicologaRepository psicologaRepository;
    private final ContratoRepository contratoRepository;
    private final FaturaRepository faturaRepository;
    private final FaturaItemRepository faturaItemRepository;
    private final FaturaService faturaService;

    public AdminService(PsicologaRepository psicologaRepository,
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

    private void exigirAdmin(UUID solicitanteId) {
        Psicologa solicitante = psicologaRepository.findById(solicitanteId)
                .orElseThrow(() -> ApiException.naoAutorizado("Conta não encontrada"));
        if (!solicitante.isAdmin()) {
            throw ApiException.proibido("Acesso restrito a administradores");
        }
    }

    private Psicologa cliente(UUID psicologaId) {
        return psicologaRepository.findById(psicologaId)
                .filter(x -> !x.isAdmin())
                .orElseThrow(() -> ApiException.naoEncontrado("Psicólogo não encontrado"));
    }

    @Transactional
    public AdminPsicologasPaginadoResponse listarPsicologas(
            UUID solicitanteId, String busca, int limit, int offset) {
        exigirAdmin(solicitanteId);
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        Pageable page = PageRequest.of(offset / Math.max(limit, 1), limit);
        List<Psicologa> psicologas = psicologaRepository.buscarTodas(busca, page);
        long total = psicologaRepository.contarTodas(busca);

        psicologas.forEach(faturaService::materializar);
        List<UUID> ids = psicologas.stream().map(Psicologa::getId).toList();
        Map<UUID, Contrato> vigentes = ids.isEmpty() ? Map.of()
                : contratoRepository.findByPsicologaIdInOrderByDataInicioAsc(ids).stream()
                        .filter(c -> c.cobre(hoje))
                        .collect(Collectors.toMap(Contrato::getPsicologaId, c -> c, (a, b) -> a));
        Map<UUID, PendenciaProjecao> vencidas = ids.isEmpty() ? Map.of()
                : faturaRepository.vencidasPorPsicologa(ids, hoje).stream()
                        .collect(Collectors.toMap(PendenciaProjecao::psicologaId, x -> x));

        List<AdminPsicologaResponse> itens = psicologas.stream()
                .map(p -> {
                    Contrato c = vigentes.get(p.getId());
                    PendenciaProjecao v = vencidas.get(p.getId());
                    return AdminPsicologaResponse.from(p,
                            c == null ? null : ContratoResponse.from(c),
                            v == null ? 0 : v.quantidade(),
                            v == null ? BigDecimal.ZERO : v.total());
                })
                .toList();
        boolean temMais = offset + psicologas.size() < total;
        return new AdminPsicologasPaginadoResponse(itens, total, temMais);
    }

    /** Detalhe pra página /admin/psicologos/:id. */
    @Transactional
    public AdminPsicologaResponse buscarPsicologa(UUID solicitanteId, UUID psicologaId) {
        exigirAdmin(solicitanteId);
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        Psicologa p = cliente(psicologaId);
        faturaService.materializar(p);
        Contrato vigente = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId()).stream()
                .filter(c -> c.cobre(hoje))
                .findFirst().orElse(null);
        FaturaService.Situacao s = faturaService.situacao(p);
        return AdminPsicologaResponse.from(p,
                vigente == null ? null : ContratoResponse.from(vigente),
                s.faturasVencidas(), s.totalVencido());
    }

    @Transactional
    public void bloquear(UUID solicitanteId, UUID psicologaId, boolean bloqueada) {
        exigirAdmin(solicitanteId);
        if (solicitanteId.equals(psicologaId)) {
            throw ApiException.requisicaoInvalida("Você não pode bloquear a própria conta");
        }
        Psicologa p = psicologaRepository.findById(psicologaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Psicólogo não encontrado"));
        if (p.isAdmin()) {
            throw ApiException.requisicaoInvalida("Contas de administrador não podem ser bloqueadas");
        }
        p.setBloqueada(bloqueada);
        p.setBloqueadaEm(bloqueada ? Instant.now() : null);
        p.setBloqueadaMotivo(bloqueada ? FaturaService.MOTIVO_ADMIN : null);
        psicologaRepository.save(p);
    }

    @Transactional
    public List<ContratoResponse> listarContratos(UUID solicitanteId, UUID psicologaId) {
        exigirAdmin(solicitanteId);
        return contratoRepository.findByPsicologaIdOrderByDataInicioAsc(psicologaId)
                .reversed().stream()
                .map(ContratoResponse::from)
                .toList();
    }

    /**
     * Cria contrato com vigência por datas. Sobreposição com contrato existente
     * é proibida — a vigência de cada dia pertence a no máximo um contrato.
     */
    @Transactional
    public ContratoResponse criarContrato(UUID solicitanteId, UUID psicologaId,
                                          LocalDate dataInicio, LocalDate dataFim,
                                          BigDecimal valorMensal) {
        exigirAdmin(solicitanteId);
        if (dataFim != null && dataFim.isBefore(dataInicio)) {
            throw ApiException.requisicaoInvalida("dataFim precisa ser >= dataInicio");
        }
        Psicologa p = cliente(psicologaId);
        boolean sobrepoe = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId()).stream()
                .anyMatch(c -> {
                    LocalDate fimExistente = c.getDataFim();
                    LocalDate fimNovo = dataFim;
                    boolean novoComecaDepoisDoFim = fimExistente != null
                            && dataInicio.isAfter(fimExistente);
                    boolean novoTerminaAntesDoInicio = fimNovo != null
                            && fimNovo.isBefore(c.getDataInicio());
                    return !novoComecaDepoisDoFim && !novoTerminaAntesDoInicio;
                });
        if (sobrepoe) {
            throw ApiException.conflito(
                    "Período sobrepõe um contrato existente — encerre-o primeiro ou ajuste as datas");
        }
        Contrato novo = new Contrato(UUID.randomUUID(), p.getId(),
                dataInicio, dataFim, valorMensal);
        contratoRepository.save(novo);
        // Criou contrato vigente: pode regularizar quem estava bloqueado sem contrato
        faturaService.regularizarSePossivel(p);
        return ContratoResponse.from(novo);
    }

    /**
     * Encerra contrato: vale até o fechamento do ciclo corrente (fatura final
     * cheia). Contrato que ainda nem começou é removido.
     */
    @Transactional
    public ContratoResponse encerrarContrato(UUID solicitanteId, UUID contratoId) {
        exigirAdmin(solicitanteId);
        Contrato c = contratoRepository.findById(contratoId)
                .orElseThrow(() -> ApiException.naoEncontrado("Contrato não encontrado"));
        Psicologa p = cliente(c.getPsicologaId());
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        LocalDate fechamentoCorrente = Ciclos.fimDoCiclo(hoje, p.getDiaFechamento());
        if (c.getDataInicio().isAfter(fechamentoCorrente)) {
            contratoRepository.delete(c);
            return ContratoResponse.from(c);
        }
        c.setDataFim(fechamentoCorrente);
        contratoRepository.save(c);
        return ContratoResponse.from(c);
    }

    /** Faturas persistidas (com itens) + prévias do ciclo corrente e próximo. */
    @Transactional
    public FaturasResponse listarFaturas(UUID solicitanteId, UUID psicologaId) {
        exigirAdmin(solicitanteId);
        Psicologa p = cliente(psicologaId);
        faturaService.materializar(p);
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        List<Fatura> faturas = faturaRepository.findByPsicologaIdOrderByPeriodoFimDesc(p.getId());
        List<UUID> ids = faturas.stream().map(Fatura::getId).toList();
        Map<UUID, List<FaturaItem>> itens = ids.isEmpty() ? Map.of()
                : faturaItemRepository.findByFaturaIdInOrderByPeriodoInicioAsc(ids).stream()
                        .collect(Collectors.groupingBy(FaturaItem::getFaturaId));
        return new FaturasResponse(
                faturas.stream()
                        .map(f -> FaturaResponse.from(f, itens.getOrDefault(f.getId(), List.of()), hoje))
                        .toList(),
                faturaService.previas(p).stream().map(PreviaFaturaResponse::from).toList());
    }

    @Transactional
    public FaturaResponse darBaixa(UUID solicitanteId, UUID faturaId, boolean paga,
                                   java.time.LocalDateTime dataHoraPagamento) {
        exigirAdmin(solicitanteId);
        Fatura f = faturaRepository.findById(faturaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Fatura não encontrada"));
        f.setPaga(paga);
        // Data/hora informada pelo admin (interpretada em SP); default agora
        f.setPagaEm(!paga ? null
                : dataHoraPagamento == null ? Instant.now()
                : dataHoraPagamento.atZone(Fusos.ZONA_BR).toInstant());
        faturaRepository.save(f);
        Psicologa p = cliente(f.getPsicologaId());
        if (paga) {
            // Baixa pode regularizar um bloqueio automático por inadimplência
            faturaService.regularizarSePossivel(p);
        }
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        return FaturaResponse.from(f,
                faturaItemRepository.findByFaturaIdInOrderByPeriodoInicioAsc(List.of(f.getId())),
                hoje);
    }
}
