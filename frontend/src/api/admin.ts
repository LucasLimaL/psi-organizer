import { api } from './client'

/**
 * Painel de gestão do SaaS — exclusivo de contas admin (backend valida a
 * flag no banco em toda chamada). Dados cadastrais e contratuais apenas;
 * dados clínicos das psicólogas nunca passam por aqui.
 */

export type Contrato = {
  id: string
  dataInicio: string
  dataFim: string | null
  valorMensal: number
  ativo: boolean
}

export type ContratoInput = {
  dataInicio: string
  dataFim?: string | null
  valorMensal: number
}

export type Mensalidade = {
  id: string
  contratoId: string
  competencia: string
  valor: number
  paga: boolean
  pagaEm: string | null
}

export type AdminPsicologa = {
  id: string
  nomeCompleto: string
  email: string
  telefone: string
  crp: string
  criadoEm: string
  admin: boolean
  bloqueada: boolean
  bloqueadaEm: string | null
  contratoAtivo: Contrato | null
  mensalidadesPendentes: number
  totalPendente: number
}

export type AdminPsicologasPaginado = {
  psicologas: AdminPsicologa[]
  total: number
  temMais: boolean
}

export const adminApi = {
  psicologas: (busca = '', limit = 20, offset = 0) =>
    api<AdminPsicologasPaginado>(
      `/admin/psicologas?busca=${encodeURIComponent(busca)}&limit=${limit}&offset=${offset}`),
  bloquear: (psicologaId: string, bloqueada: boolean) =>
    api<void>(`/admin/psicologas/${psicologaId}/bloqueio`, {
      method: 'PUT', body: JSON.stringify({ bloqueada }),
    }),
  contratos: (psicologaId: string) =>
    api<Contrato[]>(`/admin/psicologas/${psicologaId}/contratos`),
  criarContrato: (psicologaId: string, c: ContratoInput) =>
    api<Contrato>(`/admin/psicologas/${psicologaId}/contratos`, {
      method: 'POST', body: JSON.stringify(c),
    }),
  encerrarContrato: (contratoId: string) =>
    api<Contrato>(`/admin/contratos/${contratoId}/encerrar`, { method: 'PUT' }),
  mensalidades: (psicologaId: string) =>
    api<Mensalidade[]>(`/admin/psicologas/${psicologaId}/mensalidades`),
  darBaixa: (mensalidadeId: string, paga: boolean) =>
    api<Mensalidade>(`/admin/mensalidades/${mensalidadeId}/baixa`, {
      method: 'PUT', body: JSON.stringify({ paga }),
    }),
}
