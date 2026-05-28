import { alpha } from '@mui/material/styles'
import type { PaletteTokens, StatusConsultaTokens } from './tokens'

/**
 * Deriva tokens de status de consulta a partir das cores semânticas da paleta.
 * Pra customizar uma paleta específica, basta passar `status` no `PaletteTokens`
 * — esta função só é chamada quando `palette.status` é `undefined`.
 *
 * Convenções:
 * - AGENDADA → `info` (espera ação)
 * - CONFIRMADA → `primary` (cor de marca, pronto)
 * - REALIZADA → `success` (concluída)
 * - FALTA → tonal de `error` (não compareceu — não queremos ser alarmistas)
 */
export function derivarStatusConsulta(p: PaletteTokens): StatusConsultaTokens {
  return {
    agendada: {
      bg: p.info,
      fg: '#FFFFFF',
      border: alpha(p.info, 0.3),
    },
    confirmada: {
      bg: p.primary,
      fg: p.primaryContrast,
      border: alpha(p.primary, 0.3),
    },
    realizada: {
      bg: p.success,
      fg: '#FFFFFF',
      border: alpha(p.success, 0.3),
    },
    falta: {
      bg: alpha(p.error, 0.12),
      fg: p.error,
      border: alpha(p.error, 0.4),
    },
  }
}
