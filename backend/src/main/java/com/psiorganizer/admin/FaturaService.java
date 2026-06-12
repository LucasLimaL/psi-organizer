package com.psiorganizer.admin;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.psicologa.Psicologa;
import com.psiorganizer.psicologa.PsicologaRepository;

/**
 * Motor de faturamento por ciclo de fechamento.
 *
 * Regras fechadas com o dono do sistema:
 * - Fatura materializada apenas quando o ciclo FECHA (periodoFim < hoje);
 *   ciclo corrente e próximo são prévias calculadas, nunca persistidas.
 * - Pro-rata = dias cobertos / dias do ciclo (ciclo inteiro = valor cheio).
 * - Rateio por contrato vira fatura_item (troca/fim de contrato no meio do ciclo).
 * - Vencimento = fechamento + 7 dias corridos; vencida = não paga após isso.
 * - Fatura de valor 0 nasce paga (cortesia).
 * - Situação irregular = sem contrato vigente OU fatura vencida → bloqueio
 *   automático (motivo INADIMPLENCIA); regularizou → desbloqueio automático.
 *   Bloqueio manual (motivo ADMIN) só sai pela mão do admin.
 */
@Service
public class FaturaService {

    public static final String MOTIVO_ADMIN = "ADMIN";
    public static final String MOTIVO_INADIMPLENCIA = "INADIMPLENCIA";
    public static final int DIAS_ATE_VENCIMENTO = 7;

    private final FaturaRepository faturaRepository;
    private final FaturaItemRepository faturaItemRepository;
    private final ContratoRepository contratoRepository;
    private final PsicologaRepository psicologaRepository;

    public FaturaService(FaturaRepository faturaRepository,
                         FaturaItemRepository faturaItemRepository,
                         ContratoRepository contratoRepository,
                         PsicologaRepository psicologaRepository) {
        this.faturaRepository = faturaRepository;
        this.faturaItemRepository = faturaItemRepository;
        this.contratoRepository = contratoRepository;
        this.psicologaRepository = psicologaRepository;
    }

    /** Item calculado de um ciclo (persistido se o ciclo fechou; prévia se não). */
    public record ItemCalculado(UUID contratoId, BigDecimal valorMensal,
                                LocalDate inicio, LocalDate fim, int dias, BigDecimal valor) {}

    /** Prévia de ciclo ainda não fechado (corrente ou próximo). */
    public record Previa(LocalDate periodoInicio, LocalDate periodoFim,
                         LocalDate vencimento, BigDecimal valor, List<ItemCalculado> itens) {}

    public record Situacao(boolean temContratoVigente, long faturasVencidas,
                           BigDecimal totalVencido) {
        public boolean irregular() {
            return !temContratoVigente || faturasVencidas > 0;
        }
    }

    /**
     * Materializa todas as faturas de ciclos já fechados desde o primeiro
     * contrato. Idempotente (unique psicologa+periodoFim). Ciclos sem nenhum
     * contrato vigente não geram fatura.
     */
    @Transactional
    public void materializar(Psicologa p) {
        List<Contrato> contratos = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId());
        if (contratos.isEmpty()) return;
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        int dia = p.getDiaFechamento();
        LocalDate fim = Ciclos.fimDoCiclo(contratos.get(0).getDataInicio(), dia);
        while (fim.isBefore(hoje)) {
            if (!faturaRepository.existsByPsicologaIdAndPeriodoFim(p.getId(), fim)) {
                LocalDate inicio = Ciclos.inicioDoCiclo(fim, dia);
                List<ItemCalculado> itens = ratear(contratos, inicio, fim);
                if (!itens.isEmpty()) {
                    persistir(p.getId(), inicio, fim, itens);
                }
            }
            fim = Ciclos.proximoFim(fim, dia);
        }
    }

    /** Prévias do ciclo corrente e do próximo (sem persistir nada). */
    @Transactional(readOnly = true)
    public List<Previa> previas(Psicologa p) {
        List<Contrato> contratos = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId());
        if (contratos.isEmpty()) return List.of();
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        int dia = p.getDiaFechamento();
        List<Previa> previas = new ArrayList<>(2);
        LocalDate fim = Ciclos.fimDoCiclo(hoje, dia);
        for (int i = 0; i < 2; i++) {
            LocalDate inicio = Ciclos.inicioDoCiclo(fim, dia);
            List<ItemCalculado> itens = ratear(contratos, inicio, fim);
            if (!itens.isEmpty()) {
                BigDecimal total = itens.stream().map(ItemCalculado::valor)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                previas.add(new Previa(inicio, fim,
                        fim.plusDays(DIAS_ATE_VENCIMENTO), total, itens));
            }
            fim = Ciclos.proximoFim(fim, dia);
        }
        return previas;
    }

    @Transactional(readOnly = true)
    public Situacao situacao(Psicologa p) {
        LocalDate hoje = LocalDate.now(Fusos.ZONA_BR);
        boolean vigente = contratoRepository
                .findByPsicologaIdOrderByDataInicioAsc(p.getId()).stream()
                .anyMatch(c -> c.cobre(hoje));
        List<Fatura> vencidas = faturaRepository
                .findByPsicologaIdAndPagaFalse(p.getId()).stream()
                .filter(f -> f.vencida(hoje))
                .toList();
        BigDecimal total = vencidas.stream().map(Fatura::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Situacao(vigente, vencidas.size(), total);
    }

    /**
     * Bloqueio automático por inadimplência (não sobrescreve bloqueio manual).
     * Retorna a situação avaliada.
     */
    @Transactional
    public Situacao bloquearSeIrregular(Psicologa p) {
        Situacao s = situacao(p);
        if (s.irregular() && !p.isBloqueada()) {
            p.setBloqueada(true);
            p.setBloqueadaEm(Instant.now());
            p.setBloqueadaMotivo(MOTIVO_INADIMPLENCIA);
            psicologaRepository.save(p);
        }
        return s;
    }

    /** Desbloqueia automaticamente se o bloqueio era por inadimplência e a situação regularizou. */
    @Transactional
    public void regularizarSePossivel(Psicologa p) {
        if (!p.isBloqueada() || !MOTIVO_INADIMPLENCIA.equals(p.getBloqueadaMotivo())) return;
        if (situacao(p).irregular()) return;
        p.setBloqueada(false);
        p.setBloqueadaEm(null);
        p.setBloqueadaMotivo(null);
        psicologaRepository.save(p);
    }

    /** Rateio do ciclo [inicio, fim] entre os contratos que o cobrem. */
    private List<ItemCalculado> ratear(List<Contrato> contratos, LocalDate inicio, LocalDate fim) {
        long diasCiclo = ChronoUnit.DAYS.between(inicio, fim) + 1;
        List<ItemCalculado> itens = new ArrayList<>();
        for (Contrato c : contratos) {
            LocalDate ini = c.getDataInicio().isAfter(inicio) ? c.getDataInicio() : inicio;
            LocalDate fimItem = c.getDataFim() != null && c.getDataFim().isBefore(fim)
                    ? c.getDataFim() : fim;
            if (ini.isAfter(fimItem)) continue;
            int dias = (int) (ChronoUnit.DAYS.between(ini, fimItem) + 1);
            BigDecimal valor = dias == diasCiclo
                    ? c.getValorMensal()
                    : c.getValorMensal()
                            .multiply(BigDecimal.valueOf(dias))
                            .divide(BigDecimal.valueOf(diasCiclo), 2, RoundingMode.HALF_UP);
            itens.add(new ItemCalculado(c.getId(), c.getValorMensal(), ini, fimItem, dias, valor));
        }
        return itens;
    }

    private void persistir(UUID psicologaId, LocalDate inicio, LocalDate fim,
                           List<ItemCalculado> itens) {
        BigDecimal total = itens.stream().map(ItemCalculado::valor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Fatura f = new Fatura(UUID.randomUUID(), psicologaId, inicio, fim,
                fim.plusDays(DIAS_ATE_VENCIMENTO), total);
        faturaRepository.save(f);
        faturaItemRepository.saveAll(itens.stream()
                .map(i -> new FaturaItem(UUID.randomUUID(), f.getId(), i.contratoId(),
                        i.inicio(), i.fim(), i.dias(), i.valor()))
                .toList());
    }
}
