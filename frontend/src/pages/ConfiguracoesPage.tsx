import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Divider, FormControlLabel, Paper, Skeleton, Snackbar,
  Stack, Switch, TextField, Typography,
} from '@mui/material'
import { perfilApi } from '../api/perfil'
import { useAuth } from '../auth/authContext'
import ConfiguracaoWhatsappSection from '../components/ConfiguracaoWhatsappSection'

/**
 * Aba Configurações — reúne as preferências do psicólogo: cobrança (cobrarFaltas),
 * duração padrão das consultas e os lembretes via WhatsApp. As preferências
 * (cobrança + consultas) salvam juntas; o WhatsApp tem seu próprio salvar.
 */
export default function ConfiguracoesPage() {
  const { atualizarPsicologa } = useAuth()
  const [cobrarFaltas, setCobrarFaltas] = useState<boolean | null>(null)
  const [duracao, setDuracao] = useState<number>(50)
  const [baseCobrar, setBaseCobrar] = useState<boolean | null>(null)
  const [baseDuracao, setBaseDuracao] = useState<number>(50)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const carregar = useCallback(async () => {
    const p = await perfilApi.buscar()
    setCobrarFaltas(p.cobrarFaltas)
    setBaseCobrar(p.cobrarFaltas)
    setDuracao(p.duracaoPadraoMinutos)
    setBaseDuracao(p.duracaoPadraoMinutos)
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const duracaoValida = Number.isInteger(duracao) && duracao >= 5 && duracao <= 600
  const dirty = cobrarFaltas !== null
    && (cobrarFaltas !== baseCobrar || duracao !== baseDuracao)

  async function salvar() {
    if (cobrarFaltas === null || !duracaoValida) return
    setErro(null)
    setSalvando(true)
    try {
      const p = await perfilApi.atualizarPreferencias({
        cobrarFaltas, duracaoPadraoMinutos: duracao,
      })
      setCobrarFaltas(p.cobrarFaltas)
      setBaseCobrar(p.cobrarFaltas)
      setDuracao(p.duracaoPadraoMinutos)
      setBaseDuracao(p.duracaoPadraoMinutos)
      // Reflete no contexto pra o ConsultaDialog usar o novo padrão sem re-login.
      atualizarPsicologa({
        id: p.id, nomeCompleto: p.nomeCompleto, email: p.email, cpf: p.cpf,
        crp: p.crp, telefone: p.telefone, admin: p.admin,
        duracaoPadraoMinutos: p.duracaoPadraoMinutos,
      })
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
      {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}

      {cobrarFaltas === null ? (
        <Skeleton variant="rounded" height={240} />
      ) : (
        <>
          {/* Cobrança */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Cobrança
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Personalize como o financeiro trata suas consultas.
            </Typography>
          </Box>
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

          {/* Consultas */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Consultas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Padrões usados ao agendar.
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <TextField
              type="number"
              label="Duração padrão (min)"
              value={duracao}
              onChange={e => setDuracao(Number(e.target.value))}
              error={!duracaoValida}
              helperText={duracaoValida
                ? 'Pré-preenche a duração ao criar uma consulta — você pode alterar na hora.'
                : 'Informe um valor entre 5 e 600 minutos.'}
              slotProps={{ htmlInput: { min: 5, max: 600, step: 5 } }}
              sx={{ maxWidth: 260 }}
            />
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => void salvar()}
              disabled={salvando || !dirty || !duracaoValida}
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
          Preferências salvas
        </Alert>
      </Snackbar>
    </Stack>
  )
}
