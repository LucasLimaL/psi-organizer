import { createContext, useContext } from 'react'
import type { PaletteTokens } from './tokens'

export type AppThemeCtx = {
  paleta: PaletteTokens
  trocarPaleta: (id: string) => void
  paletasDisponiveis: PaletteTokens[]
}

export const AppThemeContext = createContext<AppThemeCtx | undefined>(undefined)

export function useAppTheme() {
  const ctx = useContext(AppThemeContext)
  if (!ctx) throw new Error('useAppTheme fora de AppThemeProvider')
  return ctx
}
