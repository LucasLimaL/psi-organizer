import { useEffect, useState, type FormEvent } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Alert, TextField, Grid, Typography,
} from '@mui/material'
import { adminApi } from '../api/admin'
import { sxInputSemSpinner } from '../theme/sx'

type Props = {
  aberto: boolean
  psicologoId: string
  /** Há contrato ativo que será substituído? Muda o aviso do dialog. */
  substituiAtivo: boolean
  onFechar: () => void
  onCriado: () => void
}

/** Form de novo contrato — o contrato ativo anterior (se houver) é desativado. */
export default function AdminNovoContratoDialog({
  aberto, psicologoId, substituiAtivo, onFechar, onCriado,
}: Props) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setDataInicio('')
    setDataFim('')
    setValorMensal('')
    setErro(null)
  }, [aberto])

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await adminApi.criarContrato(psicologoId, {
        dataInicio,
        dataFim: dataFim || null,
        valorMensal: Number(valorMensal),
      })
      onCriado()
      onFechar()
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao criar contrato') + det)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="xs" fullWidth>
      <DialogTitle>Novo contrato</DialogTitle>
      <DialogContent>
        {substituiAtivo && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            O contrato ativo atual será encerrado e substituído por este.
          </Alert>
        )}
        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
        <form id="novo-contrato-form" onSubmit={criar}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <TextField fullWidth label="Início" type="date" required
                         slotProps={{ inputLabel: { shrink: true } }}
                         value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Fim (opcional)" type="date"
                         slotProps={{ inputLabel: { shrink: true } }}
                         value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="Valor mensal (R$)" type="number" required
                         slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                         sx={sxInputSemSpinner}
                         value={valorMensal} onChange={e => setValorMensal(e.target.value)} />
            </Grid>
          </Grid>
        </form>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Fim vazio = prazo indeterminado. As mensalidades vencidas são geradas
          automaticamente a partir do início.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onFechar}>Cancelar</Button>
        <Button
          type="submit" form="novo-contrato-form" variant="contained"
          disabled={enviando || !dataInicio || valorMensal === ''}
        >
          {enviando ? 'Salvando…' : 'Criar contrato'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
