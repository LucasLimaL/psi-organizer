import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Alert, AlertTitle,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import type { Paciente } from '../api/pacientes'

type Props = {
  aberto: boolean
  paciente: Paciente | null
  onFechar: () => void
  onConfirmar: () => Promise<void> | void
}

export default function InativarPacienteDialog({
  aberto, paciente, onFechar, onConfirmar,
}: Props) {
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    setEnviando(true)
    try {
      await onConfirmar()
      onFechar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onClose={enviando ? undefined : onFechar}
      maxWidth="xs"
      fullWidth
      aria-labelledby="inativar-paciente-titulo"
      aria-describedby="inativar-paciente-descricao"
    >
      <DialogTitle id="inativar-paciente-titulo" sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, pb: 1,
      }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: theme => alpha(theme.palette.warning.main, 0.14),
          color: 'warning.main',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WarningAmberIcon />
        </Box>
        Inativar paciente?
      </DialogTitle>

      <DialogContent id="inativar-paciente-descricao">
        <Typography variant="body2" sx={{ mb: 2 }}>
          <Box component="strong" sx={{ fontWeight: 700 }}>{paciente?.nome}</Box>
          {' '}será marcado como inativo e não poderá receber novas consultas.
        </Typography>

        <Alert
          severity="warning"
          variant="outlined"
          icon={<EventBusyIcon />}
          sx={{ mb: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>
            Consultas futuras serão canceladas
          </AlertTitle>
          <Typography variant="body2">
            Todas as consultas com status{' '}
            <Box component="strong" sx={{ fontWeight: 700 }}>Agendada</Box>{' '}ou{' '}
            <Box component="strong" sx={{ fontWeight: 700 }}>Confirmada</Box>{' '}deste
            paciente que ainda não ocorreram serão{' '}
            <Box component="strong" sx={{ fontWeight: 700 }}>removidas da agenda permanentemente</Box>.
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          Consultas já realizadas ou marcadas como falta permanecem no histórico.
          Você pode reativar o paciente a qualquer momento — mas as consultas
          futuras canceladas não retornam automaticamente.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onFechar} disabled={enviando}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={confirmar}
          disabled={enviando}
        >
          {enviando ? 'Inativando…' : 'Inativar paciente'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
