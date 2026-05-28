import { createTheme, type Theme } from '@mui/material/styles'
import { globalTokens, type PaletteTokens } from './tokens'

/**
 * Constrói um Theme do MUI a partir dos tokens de paleta + tokens globais.
 * Mantém a parametrização: trocar palette = trocar argumento.
 */
export function createAppTheme(p: PaletteTokens): Theme {
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
