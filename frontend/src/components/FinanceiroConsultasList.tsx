import { useCallback, useEffect, useState } from 'react'
import { Stack, Box, Paper, Typography, Button, Skeleton, Divider } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined'
import {
  financeiroApi, type CategoriaFinanceiro, type FinanceiroConsulta,
} from '../api/financeiro'
import FinanceiroConsultaItem from './FinanceiroConsultaItem'

const PAGE_SIZE = 20

type Props = {
  periodo: string
  categoria: CategoriaFinanceiro
}

/** Lista cronológica paginada (realizados / futuros) da tela financeiro. */
export default function FinanceiroConsultasList({ periodo, categoria }: Props) {
  const theme = useTheme()
  const [consultas, setConsultas] = useState<FinanceiroConsulta[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const carregarPrimeiraPagina = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await financeiroApi.consultas(periodo, categoria, PAGE_SIZE, 0)
      setConsultas(r.consultas)
      setTotal(r.total)
      setTemMais(r.temMais)
    } finally {
      setCarregando(false)
    }
  }, [periodo, categoria])

  useEffect(() => { carregarPrimeiraPagina() }, [carregarPrimeiraPagina])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const r = await financeiroApi.consultas(periodo, categoria, PAGE_SIZE, consultas.length)
      setConsultas(prev => [...prev, ...r.consultas])
      setTemMais(r.temMais)
    } finally {
      setCarregandoMais(false)
    }
  }

  if (carregando) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Stack>
    )
  }

  if (consultas.length === 0) {
    const IconeVazio = categoria === 'futuros' ? EventNoteIcon : EventBusyIcon
    const msg = categoria === 'futuros'
      ? 'Nenhuma consulta agendada no período.'
      : 'Nenhum pagamento recebido no período.'
    return (
      <Box sx={{
        p: 4, textAlign: 'center',
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: 3,
      }}>
        <IconeVazio sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {msg}
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Paper
        variant="outlined"
        sx={{
          px: { xs: 1.5, sm: 2 }, py: 0.5,
          boxShadow: 'none', border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack divider={<Divider />}>
          {consultas.map(c => (
            <FinanceiroConsultaItem key={c.id} consulta={c} mostrarPaciente />
          ))}
        </Stack>
      </Paper>
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
            : `Ver mais (${total - consultas.length} restante${total - consultas.length === 1 ? '' : 's'})`}
        </Button>
      )}
    </Stack>
  )
}
