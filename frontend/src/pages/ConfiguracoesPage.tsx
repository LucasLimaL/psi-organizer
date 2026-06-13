import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Divider, FormControlLabel, Paper, Skeleton, Snackbar,
  Stack, Switch, Typography,
} from '@mui/material'
import { perfilApi } from '../api/perfil'
import ConfiguracaoWhatsappSection from '../components/ConfiguracaoWhatsappSection'

/**
 * Aba Configurações — reúne as preferências do psicólogo: cobrança (cobrarFaltas)
 * e os lembretes via WhatsApp. Cada seção salva de forma independente.
 */
export default function ConfiguracoesPage() {
  const [cobrarFaltas, setCobrarFaltas] = useState<boolean | null>(null)
  const [baseline, setBaseline] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const carregar = useCallback(async () => {
    const p = await perfilApi.buscar()
    setCobrarFaltas(p.cobrarFaltas)
    setBaseline(p.cobrarFaltas)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const dirty = cobrarFaltas !== null && cobrarFaltas !== baseline

  async function salvarCobranca() {
    if (cobrarFaltas === null) return
    setErro(null)
    setSalvando(true)
    try {
      const p = await perfilApi.atualizarPreferencias({ cobrarFaltas })
      setBaseline(p.cobrarFaltas)
      setCobrarFaltas(p.cobrarFaltas)
      setSalvo(true)
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar') + det)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Preferências de cobrança e lembretes via WhatsApp.
        </Typography>
      </Box>

      {/* Cobrança */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Cobrança
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Personalize como o financeiro trata suas consultas.
        </Typography>
      </Box>

      {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}

      {cobrarFaltas === null ? (
        <Skeleton variant="rounded" height={120} />
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <FormControlLabel
              control={(
                <Switch
                  checked={cobrarFaltas}
                  onChange={e => setCobrarFaltas(e.target.checked)}
                />
              )}
              label={(
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    Cobrar consultas com falta
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Quando ativado, consultas marcadas como Falta entram no financeiro
                    como pagamento pendente. Faltas que você já recebeu continuam
                    contando mesmo com a opção desativada.
                  </Typography>
                </Box>
              )}
              sx={{ alignItems: 'flex-start', ml: 0, gap: 1 }}
            />
          </Paper>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => void salvarCobranca()}
              disabled={salvando || !dirty}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </Box>
        </>
      )}

      <Divider />

      {/* WhatsApp */}
      <ConfiguracaoWhatsappSection />

      <Snackbar
        open={salvo}
        autoHideDuration={3000}
        onClose={() => setSalvo(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Preferência de cobrança salva
        </Alert>
      </Snackbar>
    </Stack>
  )
}
