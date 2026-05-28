import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { paletas, paletaPadrao } from './palettes'
import { createAppTheme } from './createAppTheme'
import { AppThemeContext } from './appThemeContext'

const PREF_KEY = 'psi.paleta'

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [paletaId, setPaletaId] = useState<string>(() => {
    const salva = localStorage.getItem(PREF_KEY)
    return salva && paletas.some(p => p.id === salva) ? salva : paletaPadrao.id
  })

  useEffect(() => {
    localStorage.setItem(PREF_KEY, paletaId)
  }, [paletaId])

  const paleta = useMemo(
    () => paletas.find(p => p.id === paletaId) ?? paletaPadrao,
    [paletaId],
  )

  const theme = useMemo(() => createAppTheme(paleta), [paleta])

  function trocarPaleta(id: string) {
    if (paletas.some(p => p.id === id)) setPaletaId(id)
  }

  return (
    <AppThemeContext.Provider
      value={{ paleta, trocarPaleta, paletasDisponiveis: paletas }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  )
}
