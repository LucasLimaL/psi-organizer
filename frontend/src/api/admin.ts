import { api } from './client'

/**
 * Painel de gestão do SaaS — exclusivo de contas admin (backend valida a
 * flag no banco em toda chamada). Dados cadastrais e contratuais apenas;
 * dados clínicos dos psicólogos nunca passam por aqui.
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
  contratoAtivo: Contrato | null
  mensalidadesPendentes: number
  totalPendente: number
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
  mensalidades: (psicologoId: string) =>
    api<Mensalidade[]>(`/admin/psicologos/${psicologoId}/mensalidades`),
  darBaixa: (mensalidadeId: string, paga: boolean) =>
    api<Mensalidade>(`/admin/mensalidades/${mensalidadeId}/baixa`, {
      method: 'PUT', body: JSON.stringify({ paga }),
    }),
}
