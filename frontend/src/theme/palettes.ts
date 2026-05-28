import type { PaletteTokens } from './tokens'

/**
 * Paletas pré-definidas. Pra adicionar uma nova: copiar uma existente,
 * trocar o `id`, `nome` e cores. O switcher detecta automaticamente.
 *
 * Critérios:
 * - Contraste WCAG AA (>= 4.5:1) entre texto e fundo.
 * - Primary saturada o suficiente para CTAs, mas não estridente.
 * - Soft = primary com ~12% alpha em branco (usada em hovers/superfícies tonais).
 */

export const paletaLavanda: PaletteTokens = {
  id: 'lavanda',
  nome: 'Lavanda',
  modo: 'light',
  primary: '#6750A4',
  primaryContrast: '#FFFFFF',
  primarySoft: '#EADDFF',
  secondary: '#7D5260',
  secondaryContrast: '#FFFFFF',
  background: '#FAF8FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F3EDF7',
  textPrimary: '#1D1B20',
  textSecondary: '#49454F',
  textDisabled: '#9E9E9E',
  divider: '#E7E0EC',
  success: '#2E7D5B',
  warning: '#B8860B',
  error: '#B3261E',
  info: '#0061A4',
}

export const paletaSalvia: PaletteTokens = {
  id: 'salvia',
  nome: 'Sálvia',
  modo: 'light',
  primary: '#4F7868',
  primaryContrast: '#FFFFFF',
  primarySoft: '#D1E8DE',
  secondary: '#516350',
  secondaryContrast: '#FFFFFF',
  background: '#F7FAF8',
  surface: '#FFFFFF',
  surfaceVariant: '#EAF0EC',
  textPrimary: '#171D1A',
  textSecondary: '#3F4944',
  textDisabled: '#9E9E9E',
  divider: '#DDE5E1',
  success: '#2E7D5B',
  warning: '#B8860B',
  error: '#B3261E',
  info: '#0061A4',
}

export const paletaAurora: PaletteTokens = {
  id: 'aurora',
  nome: 'Aurora',
  modo: 'light',
  primary: '#B5476B',
  primaryContrast: '#FFFFFF',
  primarySoft: '#FFD9E2',
  secondary: '#765761',
  secondaryContrast: '#FFFFFF',
  background: '#FFF8F9',
  surface: '#FFFFFF',
  surfaceVariant: '#F7E9EE',
  textPrimary: '#201A1C',
  textSecondary: '#514347',
  textDisabled: '#9E9E9E',
  divider: '#EBDDE0',
  success: '#2E7D5B',
  warning: '#B8860B',
  error: '#B3261E',
  info: '#0061A4',
}

export const paletaOceano: PaletteTokens = {
  id: 'oceano',
  nome: 'Oceano',
  modo: 'light',
  primary: '#1E5E8A',
  primaryContrast: '#FFFFFF',
  primarySoft: '#CFE5F8',
  secondary: '#50606E',
  secondaryContrast: '#FFFFFF',
  background: '#F6F9FC',
  surface: '#FFFFFF',
  surfaceVariant: '#E5EEF6',
  textPrimary: '#171C20',
  textSecondary: '#42474E',
  textDisabled: '#9E9E9E',
  divider: '#DCE3EB',
  success: '#2E7D5B',
  warning: '#B8860B',
  error: '#B3261E',
  info: '#0061A4',
}

export const paletas: PaletteTokens[] = [
  paletaLavanda,
  paletaSalvia,
  paletaAurora,
  paletaOceano,
]

export const paletaPadrao = paletaLavanda
