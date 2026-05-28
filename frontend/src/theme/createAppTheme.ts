import { createTheme, type Theme } from '@mui/material/styles'
import { globalTokens, type PaletteTokens } from './tokens'
import { derivarStatusConsulta } from './derive'

/**
 * Detecta se o usuário pediu `prefers-reduced-motion: reduce`.
 * Em SSR ou sem suporte, retorna `false` (movimento normal).
 */
function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Constrói um Theme do MUI a partir dos tokens de paleta + tokens globais.
 * Mantém a parametrização: trocar palette = trocar argumento.
 */
export function createAppTheme(p: PaletteTokens): Theme {
  const statusConsulta = p.status ?? derivarStatusConsulta(p)
  const prm = reducedMotion()
  const dur = globalTokens.motion.duration
  return createTheme({
    palette: {
      mode: p.modo,
      primary: { main: p.primary, contrastText: p.primaryContrast },
      secondary: { main: p.secondary, contrastText: p.secondaryContrast },
      background: { default: p.background, paper: p.surface },
      text: {
        primary: p.textPrimary,
        secondary: p.textSecondary,
        disabled: p.textDisabled,
      },
      divider: p.divider,
      success: { main: p.success },
      warning: { main: p.warning },
      error: { main: p.error },
      info: { main: p.info },
      statusConsulta,
    },
    transitions: {
      duration: prm
        ? {
            shortest: 0, shorter: 0, short: 0, standard: 0,
            complex: 0, enteringScreen: 0, leavingScreen: 0,
          }
        : {
            shortest: dur.fast,
            shorter: dur.fast,
            short: dur.short,
            standard: dur.medium,
            complex: dur.long,
            enteringScreen: dur.medium,
            leavingScreen: dur.short,
          },
      easing: {
        easeInOut: globalTokens.motion.easing.standard,
        easeOut: globalTokens.motion.easing.decelerate,
        easeIn: globalTokens.motion.easing.accelerate,
        sharp: globalTokens.motion.easing.emphasized,
      },
    },
    typography: {
      fontFamily: globalTokens.typography.fontFamily,
      fontWeightRegular: globalTokens.typography.weightRegular,
      fontWeightMedium: globalTokens.typography.weightMedium,
      fontWeightBold: globalTokens.typography.weightBold,
      h1: { fontWeight: globalTokens.typography.weightBold, letterSpacing: '-0.02em' },
      h2: { fontWeight: globalTokens.typography.weightBold, letterSpacing: '-0.02em' },
      h3: { fontWeight: globalTokens.typography.weightSemibold, letterSpacing: '-0.01em' },
      h4: { fontWeight: globalTokens.typography.weightSemibold, letterSpacing: '-0.01em' },
      h5: { fontWeight: globalTokens.typography.weightSemibold },
      h6: { fontWeight: globalTokens.typography.weightSemibold },
      button: { textTransform: 'none', fontWeight: globalTokens.typography.weightMedium },
    },
    shape: {
      borderRadius: globalTokens.radius.md,
    },
    spacing: globalTokens.spacingUnit,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: p.background,
            color: p.textPrimary,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*:focus-visible': {
            outline: `2px solid ${p.primary}`,
            outlineOffset: 2,
            borderRadius: globalTokens.radius.xs,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${p.divider}`,
            boxShadow: globalTokens.shadow.sm,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: p.surface,
            color: p.textPrimary,
            borderBottom: `1px solid ${p.divider}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: p.surface,
            borderRight: `1px solid ${p.divider}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: globalTokens.radius.sm,
            paddingInline: 16,
            paddingBlock: 8,
            '&.MuiButton-containedPrimary:hover': {
              backgroundColor: p.primary,
              filter: 'brightness(1.08)',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: globalTokens.radius.sm },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: p.surfaceVariant,
            color: p.textSecondary,
            fontWeight: globalTokens.typography.weightSemibold,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          },
        },
      },
    },
  })
}
