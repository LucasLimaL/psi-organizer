import { api } from './client'

export type Notificacao = {
  id: string
  tipo: string
  /** JSON serializado — formato depende do tipo. */
  payloadJson: string
  criadaEm: string
  lidaEm?: string | null
}

export type NotificacoesEnvelope = {
  notificacoes: Notificacao[]
  naoLidas: number
}

export const notificacoesApi = {
  listarNaoLidas: (limit = 50) =>
    api<NotificacoesEnvelope>(`/me/notificacoes?limit=${limit}`),
  marcarLida: (id: string) =>
    api<void>(`/me/notificacoes/${id}/lida`, { method: 'POST' }),
}

/** Payload do tipo CANCELAMENTO_PELA_PACIENTE. */
export type PayloadCancelamento = {
  consultaId: string
  pacienteId: string
  pacienteNome: string
  inicio: string
}

export function parseCancelamento(n: Notificacao): PayloadCancelamento | null {
  if (n.tipo !== 'CANCELAMENTO_PELA_PACIENTE') return null
  try {
    return JSON.parse(n.payloadJson) as PayloadCancelamento
  } catch {
    return null
  }
}
