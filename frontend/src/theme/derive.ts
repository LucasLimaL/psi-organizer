import { alpha, decomposeColor, recomposeColor } from '@mui/material/styles'
import type { PaletteTokens, StatusConsultaTokens, SurfaceContainerTokens } from './tokens'

/**
 * Mistura duas cores hex em proporção linear no espaço sRGB.
 * `ratio=0` retorna `a`, `ratio=1` retorna `b`.
 */
function mix(a: string, b: string, ratio: number): string {
  const ca = decomposeColor(a).values
  const cb = decomposeColor(b).values
  return recomposeColor({
    type: 'rgb',
    values: [
      Math.round(ca[0] * (1 - ratio) + cb[0] * ratio),
      Math.round(ca[1] * (1 - ratio) + cb[1] * ratio),
      Math.round(ca[2] * (1 - ratio) + cb[2] * ratio),
    ],
  })
}

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

/**
 * Deriva a escala tonal de superfície (Material 3-style).
 * `base` = `surface` puro; demais misturam com `primary` em proporção crescente.
 */
export function derivarSurfaceContainer(p: PaletteTokens): SurfaceContainerTokens {
  return {
    low: mix(p.surface, p.primary, 0.05),
    base: p.surface,
    high: mix(p.surface, p.primary, 0.11),
    highest: mix(p.surface, p.primary, 0.14),
  }
}
