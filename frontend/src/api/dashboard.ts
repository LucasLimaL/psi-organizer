import { api } from './client'
import type { StatusConsulta } from './consultas'

export type HojeStats = {
  total: number
  agendadas: number
  confirmadas: number
  realizadas: number
  faltas: number
}

export type MesStats = {
  total: number
  agendadas: number
  confirmadas: number
  realizadas: number
  faltas: number
  faturamentoRealizado: number
  faturamentoPago: number
  faturamentoPendente: number
  taxaComparecimento: number | null
}

export type ComparativoStats = {
  consultasMesAnterior: number
  faturamentoMesAnterior: number
}

export type DiaStats = {
  dia: string
  total: number
}

export type PacientesStats = {
  ativos: number
  novosNoMes: number
}

export type ProximaConsulta = {
  id: string
  inicio: string
  duracaoMinutos: number
  pacienteNome: string
  status: StatusConsulta
}

export type DashboardData = {
  hoje: HojeStats
  mes: MesStats
  comparativo: ComparativoStats
  proximos7Dias: DiaStats[]
  pacientes: PacientesStats
  consultasFuturasAgendadas: number
  /** Passadas que seguem AGENDADA/CONFIRMADA — precisam de desfecho. */
  consultasARevisar: number
  proximasConsultas: ProximaConsulta[]
}

export const dashboardApi = {
  get: () => api<DashboardData>('/dashboard'),
}
