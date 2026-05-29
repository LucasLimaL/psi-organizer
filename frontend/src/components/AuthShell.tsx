import type { ReactNode } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import SpaIcon from '@mui/icons-material/Spa'

type Props = {
  titulo: string
  subtitulo?: string
  children: ReactNode
  larguraCard?: number
}

/**
 * Shell reutilizado pelas telas de autenticação (Login, Signup).
 * Renderiza:
 * - Background sutil tonal primary
 * - Logo + identidade da marca no topo
 * - Card centralizado com a forma de autenticação
 *
 * Responsivo: padding generoso em desktop, sem padding lateral em mobile.
 */
export default function AuthShell({
  titulo, subtitulo, children, larguraCard = 420,
}: Props) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        // gradiente sutil — usa a cor da paleta ativa
        backgroundImage: `
          radial-gradient(circle at 20% 10%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%),
          radial-gradient(circle at 80% 90%, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 50%)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 3, sm: 6 },
        px: 2,
      }}
    >
      {/* Identidade da marca */}
      <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
        <Box
          aria-hidden
          sx={{
            width: 56, height: 56, borderRadius: 3,
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.shadows[3],
          }}
        >
          <SpaIcon fontSize="large" />
        </Box>
        <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            psi-organizer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize seu consultório com calma
          </Typography>
        </Stack>
      </Stack>

      {/* Card de formulário */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: larguraCard,
          p: { xs: 3, sm: 4 },
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {titulo}
            </Typography>
            {subtitulo && (
              <Typography variant="body2" color="text.secondary">
                {subtitulo}
              </Typography>
            )}
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Box>
  )
}
