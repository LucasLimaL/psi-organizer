/**
 * Design tokens — única fonte de verdade de cores, tipografia, espaçamento.
 * Cores são parametrizáveis (por paleta / por cliente).
 * Tipografia, raios, spacing são globais.
 */

export type PaletteMode = 'light' | 'dark'

/** Token de cor para um status de domínio (ex: status de consulta). */
export type StatusToken = {
  /** Cor de fundo do badge/bloco. */
  bg: string
  /** Cor do texto/ícone sobre `bg`. Contraste >= 4.5:1. */
  fg: string
  /** Cor da borda (útil em variantes tonais). */
  border: string
}

/** Conjunto de tokens para status de consulta. */
export type StatusConsultaTokens = {
  agendada: StatusToken
  confirmada: StatusToken
  realizada: StatusToken
  falta: StatusToken
}

/**
 * Tokens de cor inspirados em Material Design 3 roles.
 * Cada paleta deve fornecer todos os campos abaixo, para garantir contraste e consistência.
 */
export type PaletteTokens = {
  /** Identificador único da paleta. */
  id: string
  /** Nome legível pra UI. */
  nome: string
  /** Modo predominante (afeta cálculo de contraste padrão do MUI). */
  modo: PaletteMode

  /** Cor de marca principal (botões primários, links, destaques). */
  primary: string
  /** Texto/ícones sobre `primary`. Deve ter contraste >= 4.5:1. */
  primaryContrast: string
  /** Variante mais clara da primária, usada em hovers/superfícies tonais. */
  primarySoft: string

  /** Cor de marca secundária (acentos, switches, badges). */
  secondary: string
  secondaryContrast: string

  /** Fundo da aplicação (atrás de tudo). */
  background: string
  /** Superfícies elevadas (cards, papers, drawers). */
  surface: string
  /** Variante alternativa de superfície (sidebars, headers de tabela). */
  surfaceVariant: string

  /** Texto principal sobre `surface`/`background`. */
  textPrimary: string
  /** Texto secundário, hints, legendas. */
  textSecondary: string
  /** Texto desabilitado. */
  textDisabled: string

  /** Linhas, separadores, bordas sutis. */
  divider: string

  /** Feedback semântico. */
  success: string
  warning: string
  error: string
  info: string

  /**
   * Status de consulta. Opcional — se omitido, a fábrica deriva
   * automaticamente a partir das demais cores via `derivarStatusConsulta()`.
   * Paletas podem sobrescrever pra customização fina.
   */
  status?: StatusConsultaTokens
}

/** Tokens globais — não variam por cliente. */
export const globalTokens = {
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    weightRegular: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
  },
  /** Spacing base — usado para `theme.spacing(n)` no MUI (4px = 0.25rem). */
  spacingUnit: 4,
  /** Raios de borda — escala consistente. */
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
  /** Sombras suaves — preferindo elevação por opacidade em vez de blur pesado. */
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
    md: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.06)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
  },
  /** Breakpoint para passar drawer permanente → temporário (mobile). */
  layout: {
    drawerWidth: 256,
    drawerWidthCollapsed: 72,
    appBarHeight: 64,
    contentMaxWidth: 1280,
  },
  /**
   * Tokens de movimento. Durations em ms.
   * Respeitados em `createAppTheme`: se o usuário preferir `prefers-reduced-motion`,
   * todas as durations vão para 0.
   */
  motion: {
    duration: {
      instant: 0,
      fast: 120,    // micro: toggle, ripple
      short: 200,   // hover, focus, snackbar
      medium: 280,  // drawer slide, dialog
      long: 400,    // page transition
    },
    easing: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
      decelerate: 'cubic-bezier(0, 0, 0, 1)',
      accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    },
  },
} as const
