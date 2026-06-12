import { useCallback, useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stack, Typography, Chip, Skeleton, Divider, Box,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { adminApi, type AdminPsicologa, type Mensalidade } from '../api/admin'
import { formatarMoeda as brl } from '../utils/formatadores'
import { formatarData } from '../utils/datas'

type Props = {
  psicologa: AdminPsicologa | null
  onFechar: () => void
  /** Notifica o pai pra recarregar a lista (pendências mudaram). */
  onMudanca: () => void
}

/** Histórico de mensalidades de uma psicóloga com baixa/estorno por competência. */
export default function AdminMensalidadesDialog({ psicologa, onFechar, onMudanca }: Props) {
  const theme = useTheme()
  const [mensalidades, setMensalidades] = useState<Mensalidade[] | null>(null)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [houveMudanca, setHouveMudanca] = useState(false)

  const carregar = useCallback(async () => {
    if (!psicologa) return
    setMensalidades(null)
    const r = await adminApi.mensalidades(psicologa.id)
    setMensalidades(r)
  }, [psicologa])

  useEffect(() => { carregar() }, [carregar])

  async function alternarBaixa(m: Mensalidade) {
    setSalvandoId(m.id)
    try {
      await adminApi.darBaixa(m.id, !m.paga)
      setHouveMudanca(true)
      await carregar()
    } finally {
      setSalvandoId(null)
    }
  }

  function fechar() {
    if (houveMudanca) onMudanca()
    setHouveMudanca(false)
    onFechar()
  }

  const totalPendente = (mensalidades ?? [])
    .filter(m => !m.paga)
    .reduce((acc, m) => acc + m.valor, 0)

  return (
    <Dialog open={psicologa !== null} onClose={fechar} maxWidth="sm" fullWidth>
      <DialogTitle>
        Mensalidades — {psicologa?.nomeCompleto}
      </DialogTitle>
      <DialogContent>
        {mensalidades === null ? (
          <Stack spacing={1}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : mensalidades.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Nenhuma mensalidade lançada — a psicóloga ainda não tem contrato,
            ou o contrato começa em mês futuro.
          </Typography>
        ) : (
          <>
            {totalPendente > 0 && (
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Em aberto:{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {brl(totalPendente)}
                </Box>
              </Typography>
            )}
            <Stack divider={<Divider />}>
              {mensalidades.map(m => (
                <Stack
                  key={m.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', py: 1 }}
                >
                  <Typography variant="body2" sx={{
                    fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 72,
                  }}>
                    {m.competencia}
                  </Typography>
                  <Typography variant="body2" sx={{
                    fontVariantNumeric: 'tabular-nums', flexGrow: 1,
                  }}>
                    {brl(m.valor)}
                  </Typography>
                  {m.paga ? (
                    <Chip
                      size="small"
                      label={m.pagaEm ? `paga em ${formatarData(new Date(m.pagaEm))}` : 'paga'}
                      color="success"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="em aberto"
                      color="warning"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                  <Button
                    size="small"
                    variant={m.paga ? 'text' : 'outlined'}
                    color={m.paga ? 'inherit' : 'success'}
                    disabled={salvandoId === m.id}
                    onClick={() => alternarBaixa(m)}
                    sx={{ borderRadius: 999, flexShrink: 0, minWidth: 92, fontSize: 12 }}
                  >
                    {salvandoId === m.id ? 'Salvando…' : m.paga ? 'Estornar' : 'Dar baixa'}
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              Competências vencidas são geradas automaticamente a partir do contrato ativo.
            </Typography>
            <Box sx={{ borderTop: `1px dashed ${theme.palette.divider}`, mt: 1 }} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={fechar}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
