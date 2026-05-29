import type { DashboardData } from '../api/dashboard'

export type WidgetId =
  | 'hoje'
  | 'mes'
  | 'recebido'
  | 'comparativo'
  | 'taxa'
  | 'futuras'
  | 'pacientes'
  | 'novosPacientes'
  | 'proximos7Dias'
  | 'proximasConsultas'

export type WidgetDef = {
  id: WidgetId
  titulo: string
  descricao: string
  Render: React.ComponentType<{ dados: DashboardData }>
  defaultAtivo: boolean
}

export type DashboardPreferencias = {
  ativos: WidgetId[]
  ordem: WidgetId[]
}

export const PREF_STORAGE_KEY = 'psi.dashboard.widgets'
