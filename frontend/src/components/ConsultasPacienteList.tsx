import { useCallback, useEffect, useState } from 'react'
import { Stack, Button, Typography, Skeleton, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import EventNoteIcon from '@mui/icons-material/EventNoteOutlined'
import { pacientesApi, type ConsultaPaciente } from '../api/pacientes'
import ConsultaCard from './ConsultaCard'

const PAGE_SIZE = 5

type Props = {
  pacienteId: string
  tipo: 'proximas' | 'historico'
  /** Notifica o pai quando o total carrega — pra mostrar contagem na aba. */
  onTotalCarregado?: (total: number) => void
}

export default function ConsultasPacienteList({ pacienteId, tipo, onTotalCarregado }: Props) {
  const theme = useTheme()
  const [consultas, setConsultas] = useState<ConsultaPaciente[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)

  const carregarPrimeiraPagina = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await pacientesApi.listarConsultas(pacienteId, tipo, PAGE_SIZE, 0)
      setConsultas(r.consultas)
      setTotal(r.total)
      setTemMais(r.temMais)
      onTotalCarregado?.(r.total)
    } finally {
      setCarregando(false)
    }
  }, [pacienteId, tipo, onTotalCarregado])

  useEffect(() => { carregarPrimeiraPagina() }, [carregarPrimeiraPagina])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const r = await pacientesApi.listarConsultas(
        pacienteId, tipo, PAGE_SIZE, consultas.length,
      )
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
          <Skeleton key={i} variant="rounded" height={80} />
        ))}
      </Stack>
    )
  }

  if (consultas.length === 0) {
    const IconeVazio = tipo === 'proximas' ? EventNoteIcon : EventBusyIcon
    const msg = tipo === 'proximas'
      ? 'Sem consultas agendadas para os próximos dias.'
      : 'Sem histórico de atendimentos por enquanto.'
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
      {consultas.map(c => (
        <ConsultaCard key={c.id} consulta={c} />
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
            : `Ver mais (${total - consultas.length} restante${total - consultas.length === 1 ? '' : 's'})`}
        </Button>
      )}
      {!temMais && consultas.length > PAGE_SIZE && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'center', mt: 1 }}
        >
          Fim da lista · {total} consulta{total === 1 ? '' : 's'} no total
        </Typography>
      )}
    </Stack>
  )
}
