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
  | 'aRevisar'

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
  /**
   * Ids que o usuário já viu — permite distinguir "widget novo no catálogo"
   * (entra como default) de "widget desativado de propósito" (fica fora).
   * Ausente em prefs antigas; nesse caso assume ativos ∪ ordem.
   */
  conhecidos?: WidgetId[]
}

export const PREF_STORAGE_KEY = 'psi.dashboard.widgets'
