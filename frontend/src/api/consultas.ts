import { api } from './client'

export type StatusConsulta = 'AGENDADA' | 'CONFIRMADA' | 'REALIZADA' | 'FALTA' | 'CANCELADA'

export type StatusConfirmacao = 'AGUARDANDO' | 'CONFIRMADA' | 'CANCELADA_PELA_PACIENTE'

export type EtapaLembrete =
  | 'AGUARDANDO_ESCOLHA'
  | 'AGUARDANDO_CONFIRMACAO_DUPLA'
  | 'FINALIZADO'
  | 'EXPIRADO'
  | 'CONGELADO_POR_LOOP'

export type StatusEntregaLembrete = 'PENDENTE' | 'ENVIADO' | 'ENTREGUE' | 'LIDO' | 'FALHOU'

export type Consulta = {
  id: string
  pacienteId: string
  pacienteNome: string
  inicio: string
  duracaoMinutos: number
  valor: number
  status: StatusConsulta
  pago: boolean
  observacoes?: string
  statusConfirmacao: StatusConfirmacao
  confirmadaPelaPacienteEm?: string | null
  lembreteEtapa?: EtapaLembrete | null
  lembreteStatusEntrega?: StatusEntregaLembrete | null
  lembreteEnviadoEm?: string | null
}

export type ConsultaInput = {
  pacienteId: string
  inicio: string
  duracaoMinutos: number
  valor: number
  observacoes?: string
}

export type ConsultaUpdate = {
  inicio: string
  duracaoMinutos: number
  valor: number
  status: StatusConsulta
  pago: boolean
  observacoes?: string
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'

export type ConsultaRecorrenteInput = {
  pacienteId: string
  diaDaSemana: DiaSemana
  horario: string // HH:mm
  intervaloSemanas: number
  duracaoMinutos: number
  valor: number
  inicioEm: string // YYYY-MM-DD
  fimEm: string // YYYY-MM-DD
  observacoes?: string
}

export const consultasApi = {
  listar: (inicio: Date, fim: Date) =>
    api<Consulta[]>(`/consultas?inicio=${isoDate(inicio)}&fim=${isoDate(fim)}`),
  buscar: (id: string) => api<Consulta>(`/consultas/${id}`),
  criar: (c: ConsultaInput) =>
    api<Consulta>('/consultas', { method: 'POST', body: JSON.stringify(c) }),
  atualizar: (id: string, c: ConsultaUpdate) =>
    api<Consulta>(`/consultas/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  remover: (id: string) =>
    api<void>(`/consultas/${id}`, { method: 'DELETE' }),
  criarRecorrente: (r: ConsultaRecorrenteInput) =>
    api<Consulta[]>('/consultas/recorrente', { method: 'POST', body: JSON.stringify(r) }),
}
