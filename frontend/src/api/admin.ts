import { api } from './client'

/**
 * Painel de gestão do SaaS — exclusivo de contas admin (backend valida a
 * flag no banco em toda chamada). Dados cadastrais e contratuais apenas;
 * dados clínicos dos psicólogos nunca passam por aqui.
 */

export type Contrato = {
  id: string
  dataInicio: string
  /** null = prazo indeterminado. */
  dataFim: string | null
  valorMensal: number
}

export type ContratoInput = {
  dataInicio: string
  dataFim?: string | null
  valorMensal: number
}

export type FaturaItem = {
  contratoId: string
  periodoInicio: string
  periodoFim: string
  dias: number
  valor: number
}

export type StatusFatura = 'PAGA' | 'VENCIDA' | 'A_VENCER'

export type Fatura = {
  id: string
  periodoInicio: string
  periodoFim: string
  vencimento: string
  valor: number
  paga: boolean
  pagaEm: string | null
  status: StatusFatura
  itens: FaturaItem[]
}

/** Ciclo ainda não fechado (corrente/próximo) — projeção, não existe no banco. */
export type PreviaFatura = {
  periodoInicio: string
  periodoFim: string
  vencimento: string
  valor: number
  itens: FaturaItem[]
}

export type FaturasResposta = {
  faturas: Fatura[]
  previas: PreviaFatura[]
}

export type AdminPsicologo = {
  id: string
  nomeCompleto: string
  email: string
  telefone: string
  crp: string
  criadoEm: string
  admin: boolean
  bloqueada: boolean
  bloqueadaEm: string | null
  bloqueadaMotivo: 'ADMIN' | 'INADIMPLENCIA' | null
  diaFechamento: number
  contratoVigente: Contrato | null
  faturasVencidas: number
  totalVencido: number
}

export type AdminPsicologosPaginado = {
  psicologos: AdminPsicologo[]
  total: number
  temMais: boolean
}

export const adminApi = {
  psicologos: (busca = '', limit = 20, offset = 0) =>
    api<AdminPsicologosPaginado>(
      `/admin/psicologos?busca=${encodeURIComponent(busca)}&limit=${limit}&offset=${offset}`),
  psicologo: (id: string) =>
    api<AdminPsicologo>(`/admin/psicologos/${id}`),
  bloquear: (psicologoId: string, bloqueada: boolean) =>
    api<void>(`/admin/psicologos/${psicologoId}/bloqueio`, {
      method: 'PUT', body: JSON.stringify({ bloqueada }),
    }),
  contratos: (psicologoId: string) =>
    api<Contrato[]>(`/admin/psicologos/${psicologoId}/contratos`),
  criarContrato: (psicologoId: string, c: ContratoInput) =>
    api<Contrato>(`/admin/psicologos/${psicologoId}/contratos`, {
      method: 'POST', body: JSON.stringify(c),
    }),
  encerrarContrato: (contratoId: string) =>
    api<Contrato>(`/admin/contratos/${contratoId}/encerrar`, { method: 'PUT' }),
  faturas: (psicologoId: string) =>
    api<FaturasResposta>(`/admin/psicologos/${psicologoId}/faturas`),
  /** `dataPagamento` (YYYY-MM-DD) opcional — ausente = hoje; ignorada no estorno. */
  darBaixa: (faturaId: string, paga: boolean, dataPagamento?: string) =>
    api<Fatura>(`/admin/faturas/${faturaId}/baixa`, {
      method: 'PUT', body: JSON.stringify({ paga, dataPagamento: dataPagamento ?? null }),
    }),
}
