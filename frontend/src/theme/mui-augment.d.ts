import type { StatusConsultaTokens } from './tokens'

/**
 * Estende a Palette do MUI com tokens semânticos de domínio.
 * Permite `theme.palette.statusConsulta.agendada.bg` com type-safety.
 */
declare module '@mui/material/styles' {
  interface Palette {
    statusConsulta: StatusConsultaTokens
  }
  interface PaletteOptions {
    statusConsulta?: StatusConsultaTokens
  }
}
