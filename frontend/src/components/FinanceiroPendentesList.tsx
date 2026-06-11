import { useCallback, useEffect, useState } from 'react'
import {
  Stack, Box, Paper, Typography, Avatar, Button, Skeleton, Divider,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Link as RouterLink } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { financeiroApi, type GrupoPendente } from '../api/financeiro'
import { consultasApi } from '../api/consultas'
import { formatarMoeda as brl, iniciais } from '../utils/formatadores'
import FinanceiroConsultaItem from './FinanceiroConsultaItem'

const PAGE_SIZE = 10

type Props = {
  periodo: string
  /** Lista o acumulado ANTERIOR ao início do período (banner). */
  anteriores?: boolean
  /** Notifica o pai após registrar um pagamento (recarrega resumo e listas). */
  onPagamento: () => void
}

/** Pagamentos pendentes agrupados por paciente, com "Marcar pago" por consulta. */
export default function FinanceiroPendentesList({ periodo, anteriores = false, onPagamento }: Props) {
  const theme = useTheme()
  const [grupos, setGrupos] = useState<GrupoPendente[]>([])
  const [totalGrupos, setTotalGrupos] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const carregarPrimeiraPagina = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await financeiroApi.pendentes(periodo, anteriores, PAGE_SIZE, 0)
      setGrupos(r.grupos)
      setTotalGrupos(r.totalGrupos)
      setTemMais(r.temMais)
    } finally {
      setCarregando(false)
    }
  }, [periodo, anteriores])

  useEffect(() => { carregarPrimeiraPagina() }, [carregarPrimeiraPagina])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const r = await financeiroApi.pendentes(periodo, anteriores, PAGE_SIZE, grupos.length)
      setGrupos(prev => [...prev, ...r.grupos])
      setTemMais(r.temMais)
    } finally {
      setCarregandoMais(false)
    }
  }

  // O update de consulta exige o payload completo — busca antes de marcar pago
  async function marcarPago(id: string) {
    const c = await consultasApi.buscar(id)
    await consultasApi.atualizar(id, {
      inicio: c.inicio,
      duracaoMinutos: c.duracaoMinutos,
      valor: c.valor,
      status: c.status,
      pago: true,
      observacoes: c.observacoes ?? '',
    })
    onPagamento()
  }

  if (carregando) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} />
        ))}
      </Stack>
    )
  }

  if (grupos.length === 0) {
    return (
      <Box sx={{
        p: 4, textAlign: 'center',
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: 3,
      }}>
        <TaskAltIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {anteriores
            ? 'Nenhuma pendência de períodos anteriores.'
            : 'Nenhum pagamento pendente no período. Tudo em dia!'}
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={1.5}>
      {grupos.map(g => (
        <Paper
          key={g.pacienteId}
          variant="outlined"
          sx={{ p: { xs: 1.5, sm: 2 }, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
            <Avatar sx={{
              width: 36, height: 36, fontSize: 14, fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}>
              {iniciais(g.pacienteNome)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                component={RouterLink}
                to={`/pacientes/${g.pacienteId}`}
                variant="subtitle2"
                noWrap
                sx={{
                  display: 'block', fontWeight: 600,
                  color: 'text.primary', textDecoration: 'none',
                  '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                }}
              >
                {g.pacienteNome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {g.quantidade} consulta{g.quantidade === 1 ? '' : 's'} pendente{g.quantidade === 1 ? '' : 's'}
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: 'warning.main', flexShrink: 0,
            }}>
              {brl(g.total)}
            </Typography>
          </Stack>
          <Divider />
          <Stack divider={<Divider />}>
            {g.consultas.map(c => (
              <FinanceiroConsultaItem key={c.id} consulta={c} onMarcarPago={marcarPago} />
            ))}
          </Stack>
        </Paper>
      ))}
      {temMais && (
        <Button
          onClick={carregarMais}
          variant="text"
          startIcon={<KeyboardArrowDownIcon />}
          disabled={carregandoMais}
          sx={{ alignSelf: 'center', borderRadius: 999 }}
        >
          {carregandoMais
            ? 'Carregando…'
            : `Ver mais pacientes (${totalGrupos - grupos.length} restante${totalGrupos - grupos.length === 1 ? '' : 's'})`}
        </Button>
      )}
    </Stack>
  )
}
