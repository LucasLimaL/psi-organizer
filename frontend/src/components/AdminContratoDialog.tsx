import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stack, Typography, Chip, Skeleton, Divider, Alert, TextField, Grid,
} from '@mui/material'
import { adminApi, type AdminPsicologa, type Contrato } from '../api/admin'
import { formatarMoeda as brl } from '../utils/formatadores'
import { sxInputSemSpinner } from '../theme/sx'

type Props = {
  psicologa: AdminPsicologa | null
  onFechar: () => void
  /** Notifica o pai pra recarregar a lista (contrato/pendências mudaram). */
  onMudanca: () => void
}

function formatarPeriodo(c: Contrato): string {
  const ini = new Date(c.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')
  const fim = c.dataFim
    ? new Date(c.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'indeterminado'
  return `${ini} → ${fim}`
}

/** Contratos de uma psicóloga: histórico + criação (desativa o anterior) + encerramento. */
export default function AdminContratoDialog({ psicologa, onFechar, onMudanca }: Props) {
  const [contratos, setContratos] = useState<Contrato[] | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMensal, setValorMensal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [houveMudanca, setHouveMudanca] = useState(false)

  const carregar = useCallback(async () => {
    if (!psicologa) return
    setContratos(null)
    setErro(null)
    const r = await adminApi.contratos(psicologa.id)
    setContratos(r)
  }, [psicologa])

  useEffect(() => { carregar() }, [carregar])

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!psicologa) return
    setErro(null)
    setEnviando(true)
    try {
      await adminApi.criarContrato(psicologa.id, {
        dataInicio,
        dataFim: dataFim || null,
        valorMensal: Number(valorMensal),
      })
      setDataInicio('')
      setDataFim('')
      setValorMensal('')
      setHouveMudanca(true)
      await carregar()
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao criar contrato') + det)
    } finally {
      setEnviando(false)
    }
  }

  async function encerrar(c: Contrato) {
    setEnviando(true)
    try {
      await adminApi.encerrarContrato(c.id)
      setHouveMudanca(true)
      await carregar()
    } finally {
      setEnviando(false)
    }
  }

  function fechar() {
    if (houveMudanca) onMudanca()
    setHouveMudanca(false)
    onFechar()
  }

  const temAtivo = (contratos ?? []).some(c => c.ativo)

  return (
    <Dialog open={psicologa !== null} onClose={fechar} maxWidth="sm" fullWidth>
      <DialogTitle>Contrato — {psicologa?.nomeCompleto}</DialogTitle>
      <DialogContent>
        {contratos === null ? (
          <Skeleton variant="rounded" height={120} />
        ) : (
          <Stack spacing={2}>
            {erro && <Alert severity="error">{erro}</Alert>}

            {contratos.length > 0 && (
              <Stack divider={<Divider />}>
                {contratos.map(c => (
                  <Stack
                    key={c.id}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center', py: 1 }}
                  >
                    <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {brl(c.valorMensal)}/mês
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatarPeriodo(c)}
                      </Typography>
                    </Stack>
                    {c.ativo ? (
                      <>
                        <Chip size="small" label="Ativo" color="success" variant="outlined"
                              sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                        <Button
                          size="small" color="error" disabled={enviando}
                          onClick={() => encerrar(c)}
                          sx={{ borderRadius: 999, fontSize: 12 }}
                        >
                          Encerrar
                        </Button>
                      </>
                    ) : (
                      <Chip size="small" label="Encerrado" variant="outlined"
                            sx={{ height: 22, fontSize: 11 }} />
                    )}
                  </Stack>
                ))}
              </Stack>
            )}

            <Divider>{temAtivo ? 'Novo contrato (substitui o ativo)' : 'Novo contrato'}</Divider>

            <form id="contrato-form" onSubmit={criar}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField fullWidth label="Início" type="date" required
                             slotProps={{ inputLabel: { shrink: true } }}
                             value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label="Fim (opcional)" type="date"
                             slotProps={{ inputLabel: { shrink: true } }}
                             helperText="Vazio = prazo indeterminado"
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
            <Typography variant="caption" color="text.secondary">
              As mensalidades vencidas são geradas automaticamente a partir do início do contrato.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={fechar}>Fechar</Button>
        <Button
          type="submit" form="contrato-form" variant="contained"
          disabled={enviando || !dataInicio || valorMensal === ''}
        >
          {enviando ? 'Salvando…' : 'Criar contrato'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
