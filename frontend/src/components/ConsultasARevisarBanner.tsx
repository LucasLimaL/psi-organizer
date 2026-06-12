import { useCallback, useEffect, useState } from 'react'
import {
  Box, Stack, Paper, Typography, Button, ButtonBase, Chip, Collapse, Divider,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { consultasApi, type Consulta, type StatusConsulta } from '../api/consultas'
import { formatarData, formatarHora } from '../utils/datas'

const PAGE_SIZE = 10

const DESFECHOS: { status: StatusConsulta; rotulo: string }[] = [
  { status: 'REALIZADA', rotulo: 'Realizada' },
  { status: 'FALTA', rotulo: 'Falta' },
  { status: 'CANCELADA', rotulo: 'Cancelada' },
]

type Props = {
  /** Chamado após definir um desfecho — pai recarrega a grade da agenda. */
  onResolvida?: () => void
}

/**
 * Banner de consultas passadas sem desfecho (ainda AGENDADA/CONFIRMADA).
 * Só renderiza quando existe pendência; desfecho é definido inline.
 */
export default function ConsultasARevisarBanner({ onResolvida }: Props) {
  const theme = useTheme()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const carregar = useCallback(async () => {
    const r = await consultasApi.aRevisar(PAGE_SIZE, 0)
    setConsultas(r.consultas)
    setTotal(r.total)
    setTemMais(r.temMais)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const r = await consultasApi.aRevisar(PAGE_SIZE, consultas.length)
      setConsultas(prev => [...prev, ...r.consultas])
      setTemMais(r.temMais)
    } finally {
      setCarregandoMais(false)
    }
  }

  async function definirDesfecho(c: Consulta, status: StatusConsulta) {
    setSalvandoId(c.id)
    try {
      await consultasApi.atualizar(c.id, {
        inicio: c.inicio,
        duracaoMinutos: c.duracaoMinutos,
        valor: c.valor,
        status,
        pago: c.pago,
        observacoes: c.observacoes ?? '',
      })
      await carregar()
      onResolvida?.()
    } finally {
      setSalvandoId(null)
    }
  }

  if (total === 0) return null

  return (
    <Paper
      variant="outlined"
      sx={{
        boxShadow: 'none',
        border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
        bgcolor: alpha(theme.palette.warning.main, 0.06),
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        sx={{
          width: '100%', px: 2, py: 1.5, gap: 1.5,
          display: 'flex', alignItems: 'center', textAlign: 'left',
        }}
      >
        <WarningAmberIcon sx={{ color: 'warning.main' }} />
        <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            {total} consulta{total === 1 ? '' : 's'} passada{total === 1 ? '' : 's'} sem desfecho
          </Box>
          {' '}— defina o que aconteceu
        </Typography>
        <ExpandMoreIcon sx={{
          color: 'text.secondary',
          transform: aberto ? 'rotate(180deg)' : 'none',
          transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.short,
          }),
        }} />
      </ButtonBase>
      <Collapse in={aberto}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack divider={<Divider />}>
            {consultas.map(c => {
              const inicio = new Date(c.inicio)
              const salvando = salvandoId === c.id
              return (
                <Stack
                  key={c.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', py: 1, flexWrap: 'wrap', rowGap: 0.5 }}
                >
                  <Typography variant="body2" sx={{
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  }}>
                    {formatarData(inicio)} · {formatarHora(inicio)}
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0, flexGrow: 1 }}>
                    {c.pacienteNome}
                  </Typography>
                  <Chip
                    size="small"
                    label={c.status === 'AGENDADA' ? 'Agendada' : 'Confirmada'}
                    color="warning"
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    {DESFECHOS.map(d => (
                      <Button
                        key={d.status}
                        size="small"
                        disabled={salvando}
                        onClick={() => definirDesfecho(c, d.status)}
                        color={d.status === 'REALIZADA' ? 'success'
                          : d.status === 'FALTA' ? 'error' : 'inherit'}
                        sx={{ borderRadius: 999, minWidth: 0, px: 1.25, fontSize: 12 }}
                      >
                        {d.rotulo}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              )
            })}
          </Stack>
          {temMais && (
            <Button
              onClick={carregarMais}
              variant="text"
              size="small"
              startIcon={<KeyboardArrowDownIcon />}
              disabled={carregandoMais}
              sx={{ borderRadius: 999, mt: 0.5 }}
            >
              {carregandoMais
                ? 'Carregando…'
                : `Ver mais (${total - consultas.length} restante${total - consultas.length === 1 ? '' : 's'})`}
            </Button>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
