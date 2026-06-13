import { useState } from 'react'
import {
  Box, Stack, Typography, Chip, Button, Tooltip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import CheckIcon from '@mui/icons-material/Check'
import type { FinanceiroConsulta } from '../api/financeiro'
import type { StatusConsulta } from '../api/consultas'
import { formatarData, formatarHora } from '../utils/datas'
import { formatarMoeda as brl } from '../utils/formatadores'

const ROTULO_STATUS: Record<StatusConsulta, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  FALTA: 'Falta',
  CANCELADA: 'Cancelada',
}

const TOKEN_STATUS: Record<StatusConsulta, 'agendada' | 'confirmada' | 'realizada' | 'falta'> = {
  AGENDADA: 'agendada',
  CONFIRMADA: 'confirmada',
  REALIZADA: 'realizada',
  FALTA: 'falta',
  CANCELADA: 'falta',
}

type Props = {
  consulta: FinanceiroConsulta
  /** Mostra o nome da paciente na linha (listas cronológicas). */
  mostrarPaciente?: boolean
  /** Se presente e a consulta não está paga, exibe o botão "Marcar pago".
   *  `pagoEm` é o instante ISO escolhido no diálogo (default: agora). */
  onMarcarPago?: (id: string, pagoEm: string) => Promise<void>
}

/** Formata o instante atual no formato do input datetime-local (hora local, sem fuso). */
function agoraParaInputLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function FinanceiroConsultaItem({ consulta, mostrarPaciente, onMarcarPago }: Props) {
  const theme = useTheme()
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  // Data/hora do pagamento, editável no diálogo (pré-preenchido com o momento atual).
  const [pagoEmLocal, setPagoEmLocal] = useState('')
  const inicio = new Date(consulta.inicio)
  const cor = theme.palette.statusConsulta[TOKEN_STATUS[consulta.status]]
  const aRevisar = (consulta.status === 'AGENDADA' || consulta.status === 'CONFIRMADA')
    && inicio.getTime() < Date.now()

  function abrirConfirmacao() {
    setPagoEmLocal(agoraParaInputLocal())
    setConfirmando(true)
  }

  async function confirmarPagamento() {
    if (!onMarcarPago || !pagoEmLocal) return
    setConfirmando(false)
    setEnviando(true)
    try {
      // datetime-local é hora local sem fuso → Date interpreta como local; ISO vai em UTC.
      await onMarcarPago(consulta.id, new Date(pagoEmLocal).toISOString())
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', py: 1, minWidth: 0 }}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {formatarData(inicio)} · {formatarHora(inicio)}
          </Typography>
          {mostrarPaciente && (
            <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
              {consulta.pacienteNome}
            </Typography>
          )}
          <Chip
            size="small"
            label={ROTULO_STATUS[consulta.status]}
            sx={{
              height: 20, fontSize: 11, fontWeight: 600,
              bgcolor: alpha(cor.bg, 0.14), color: cor.bg,
            }}
          />
          {aRevisar && (
            <Tooltip title="Consulta no passado ainda sem status final — marque como realizada ou falta na agenda">
              <Chip
                size="small"
                label="a revisar"
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
              />
            </Tooltip>
          )}
        </Stack>
        {consulta.pago && consulta.pagoEm && (
          <Typography variant="caption" color="text.secondary">
            pago em {formatarData(new Date(consulta.pagoEm))}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
      >
        {brl(consulta.valor)}
      </Typography>
      {onMarcarPago && !consulta.pago && (
        <>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckIcon />}
            disabled={enviando}
            onClick={abrirConfirmacao}
            sx={{ borderRadius: 999, flexShrink: 0 }}
          >
            {enviando ? 'Salvando…' : 'Marcar pago'}
          </Button>

          <Dialog open={confirmando} onClose={() => setConfirmando(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Marcar como paga a consulta de{' '}
                <Box component="span" sx={{ fontWeight: 600 }}>{consulta.pacienteNome}</Box>
                {' '}em {formatarData(inicio)} às {formatarHora(inicio)}, no valor de{' '}
                <Box component="span" sx={{ fontWeight: 600 }}>{brl(consulta.valor)}</Box>?
              </Typography>
              <TextField
                type="datetime-local"
                label="Data e hora do pagamento"
                fullWidth
                value={pagoEmLocal}
                onChange={e => setPagoEmLocal(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Pré-preenchido com agora — ajuste se o pagamento foi em outro momento."
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                onClick={confirmarPagamento}
                disabled={!pagoEmLocal}
              >
                Marcar pago
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Stack>
  )
}
