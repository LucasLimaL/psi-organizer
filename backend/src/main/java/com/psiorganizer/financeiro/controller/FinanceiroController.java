package com.psiorganizer.financeiro.controller;

import java.time.Instant;
import java.time.Year;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.psiorganizer.common.Fusos;
import com.psiorganizer.common.exception.ApiException;
import com.psiorganizer.common.security.PsicologaPrincipal;
import com.psiorganizer.financeiro.dto.FinanceiroConsultasPaginadoResponse;
import com.psiorganizer.financeiro.dto.FinanceiroPendentesPaginadoResponse;
import com.psiorganizer.financeiro.dto.FinanceiroResumoResponse;
import com.psiorganizer.financeiro.service.FinanceiroService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/financeiro")
@Tag(name = "Financeiro", description = "Visão financeira das consultas por período (competência)")
public class FinanceiroController {

    private final FinanceiroService service;

    public FinanceiroController(FinanceiroService service) {
        this.service = service;
    }

    /** Intervalo [ini, fim) de um período "YYYY-MM" (mês) ou "YYYY" (ano), fuso SP. */
    private record Intervalo(Instant ini, Instant fim) {}

    private static Intervalo intervaloDoPeriodo(String periodo) {
        try {
            if (periodo.matches("\\d{4}")) {
                Year ano = Year.parse(periodo);
                return new Intervalo(
                        ano.atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant(),
                        ano.plusYears(1).atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant());
            }
            if (periodo.matches("\\d{4}-\\d{2}")) {
                YearMonth mes = YearMonth.parse(periodo);
                return new Intervalo(
                        mes.atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant(),
                        mes.plusMonths(1).atDay(1).atStartOfDay(Fusos.ZONA_BR).toInstant());
            }
        } catch (DateTimeParseException ignorada) {
            // cai no throw abaixo
        }
        throw ApiException.requisicaoInvalida("Período inválido — use YYYY-MM (mês) ou YYYY (ano)");
    }

    @GetMapping("/resumo")
    @Operation(summary = "Resumo financeiro do período: totais de pendentes, realizados, "
            + "futuros, pendências anteriores ao período e anos disponíveis")
    public FinanceiroResumoResponse resumo(@RequestParam String periodo) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Intervalo i = intervaloDoPeriodo(periodo);
        return service.resumo(psicologaId, i.ini(), i.fim());
    }

    @GetMapping("/pendentes")
    @Operation(summary = "Pagamentos pendentes agrupados por paciente (paginado por paciente). "
            + "Com anteriores=true, lista o acumulado ANTERIOR ao início do período")
    public FinanceiroPendentesPaginadoResponse pendentes(
            @RequestParam String periodo,
            @RequestParam(defaultValue = "false") boolean anteriores,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Intervalo i = intervaloDoPeriodo(periodo);
        Instant ini = anteriores ? Instant.EPOCH : i.ini();
        Instant fim = anteriores ? i.ini() : i.fim();
        return service.pendentesAgrupados(psicologaId, ini, fim,
                Math.max(1, Math.min(50, limit)), Math.max(0, offset));
    }

    @GetMapping("/consultas")
    @Operation(summary = "Lista cronológica paginada do período por categoria: "
            + "realizados (pagos, mais recentes primeiro) ou futuros (agendadas/confirmadas)")
    public FinanceiroConsultasPaginadoResponse consultas(
            @RequestParam String periodo,
            @RequestParam String categoria,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID psicologaId = PsicologaPrincipal.corrente().id();
        Intervalo i = intervaloDoPeriodo(periodo);
        FinanceiroService.Categoria cat;
        try {
            cat = FinanceiroService.Categoria.valueOf(categoria.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.requisicaoInvalida("Categoria inválida — use realizados ou futuros");
        }
        return service.listar(psicologaId, i.ini(), i.fim(), cat,
                Math.max(1, Math.min(50, limit)), Math.max(0, offset));
    }
}
