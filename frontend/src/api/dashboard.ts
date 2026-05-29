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
}

export type DiaStats = {
  dia: string // YYYY-MM-DD
  total: number
}

export type PacientesStats = {
  ativos: number
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
  proximos7Dias: DiaStats[]
  pacientes: PacientesStats
  proximasConsultas: ProximaConsulta[]
}

export const dashboardApi = {
  get: () => api<DashboardData>('/dashboard'),
}
