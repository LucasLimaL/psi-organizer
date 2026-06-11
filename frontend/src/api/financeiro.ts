import { api } from './client'
import type { StatusConsulta } from './consultas'

/**
 * Período aceito pelo backend: 'YYYY-MM' (mês) ou 'YYYY' (ano inteiro).
 * Regime de competência — recorte sempre pelo mês/ano da consulta.
 */
export type PeriodoFinanceiro = string

export type CategoriaFinanceiro = 'realizados' | 'futuros'

export type FinanceiroCategoriaResumo = {
  quantidade: number
  total: number
}

export type FinanceiroResumo = {
  pendentes: FinanceiroCategoriaResumo
  realizados: FinanceiroCategoriaResumo
  futuros: FinanceiroCategoriaResumo
  /** Acumulado cobrável e não pago ANTERIOR ao início do período (banner). */
  pendentesAnteriores: FinanceiroCategoriaResumo
  /** Anos com consultas, do mais recente ao mais antigo. */
  anosDisponiveis: number[]
}

export type FinanceiroConsulta = {
  id: string
  pacienteId: string
  pacienteNome: string
  inicio: string
  valor: number
  status: StatusConsulta
  pago: boolean
  pagoEm: string | null
}

export type GrupoPendente = {
  pacienteId: string
  pacienteNome: string
  quantidade: number
  total: number
  consultas: FinanceiroConsulta[]
}

export type FinanceiroPendentesPaginado = {
  grupos: GrupoPendente[]
  totalGrupos: number
  temMais: boolean
}

export type FinanceiroConsultasPaginado = {
  consultas: FinanceiroConsulta[]
  total: number
  temMais: boolean
}

export const financeiroApi = {
  resumo: (periodo: PeriodoFinanceiro) =>
    api<FinanceiroResumo>(`/financeiro/resumo?periodo=${periodo}`),
  /** Pendências agrupadas por paciente. `anteriores=true` lista o acumulado pré-período. */
  pendentes: (periodo: PeriodoFinanceiro, anteriores = false, limit = 10, offset = 0) =>
    api<FinanceiroPendentesPaginado>(
      `/financeiro/pendentes?periodo=${periodo}&anteriores=${anteriores}&limit=${limit}&offset=${offset}`),
  consultas: (periodo: PeriodoFinanceiro, categoria: CategoriaFinanceiro, limit = 20, offset = 0) =>
    api<FinanceiroConsultasPaginado>(
      `/financeiro/consultas?periodo=${periodo}&categoria=${categoria}&limit=${limit}&offset=${offset}`),
}
