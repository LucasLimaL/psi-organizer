import type { StatusConsultaTokens, SurfaceContainerTokens } from './tokens'

/**
 * Estende a Palette do MUI com tokens semânticos de domínio.
 * Permite `theme.palette.statusConsulta.agendada.bg` e
 * `theme.palette.surfaceContainer.high` com type-safety.
 */
declare module '@mui/material/styles' {
  interface Palette {
    statusConsulta: StatusConsultaTokens
    surfaceContainer: SurfaceContainerTokens
  }
  interface PaletteOptions {
    statusConsulta?: StatusConsultaTokens
    surfaceContainer?: SurfaceContainerTokens
  }
}
