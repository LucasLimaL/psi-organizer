import { Box, Paper, Stack, Typography, Chip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { ConsultaPaciente } from '../api/pacientes'
import { formatarDataLonga, formatarHora } from '../utils/datas'
import { formatarMoeda as brl } from '../utils/formatadores'

const MAPA_STATUS = {
  AGENDADA: 'agendada',
  CONFIRMADA: 'confirmada',
  REALIZADA: 'realizada',
  FALTA: 'falta',
} as const

const ROTULO_STATUS: Record<ConsultaPaciente['status'], string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  FALTA: 'Falta',
}

export default function ConsultaCard({ consulta }: { consulta: ConsultaPaciente }) {
  const theme = useTheme()
  const data = new Date(consulta.inicio)
  const cor = theme.palette.statusConsulta[MAPA_STATUS[consulta.status]]

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        boxShadow: 'none',
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${cor.bg}`,
        display: 'flex',
        gap: 2,
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            textTransform: 'capitalize',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatarDataLonga(data)} · {formatarHora(data)}
        </Typography>
        <Typography variant="caption" color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums', display: 'block', mt: 0.25 }}>
          {consulta.duracaoMinutos} min · {brl(consulta.valor)}
        </Typography>
        {consulta.observacoes && (
          <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
            {consulta.observacoes}
          </Typography>
        )}
      </Box>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 0.5 }}
      >
        <Chip
          size="small"
          label={ROTULO_STATUS[consulta.status]}
          sx={{
            bgcolor: cor.bg,
            color: cor.fg,
            fontWeight: 600,
            border: `1px solid ${cor.border}`,
          }}
        />
        {consulta.pago && (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            label="Pago"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: 'success.main',
              fontWeight: 600,
              border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
              '& .MuiChip-icon': { color: 'success.main' },
            }}
          />
        )}
      </Stack>
    </Paper>
  )
}
