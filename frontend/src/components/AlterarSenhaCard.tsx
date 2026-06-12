import { useState, type FormEvent } from 'react'
import {
  Paper, Stack, Typography, TextField, Button, Alert, Snackbar,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import LockResetIcon from '@mui/icons-material/LockReset'
import { perfilApi } from '../api/perfil'

/** Card de troca de senha do perfil — exige a senha atual. */
export default function AlterarSenhaCard() {
  const theme = useTheme()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [sucessoEm, setSucessoEm] = useState<number | null>(null)

  const confereDivergente = confirmacao !== '' && confirmacao !== novaSenha
  const podeSalvar = !enviando && senhaAtual !== '' && novaSenha !== ''
    && confirmacao === novaSenha

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await perfilApi.alterarSenha({ senhaAtual, novaSenha })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      setSucessoEm(Date.now())
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao alterar a senha') + det)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={onSubmit}
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        boxShadow: 'none',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LockResetIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Alterar senha
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Mínimo de 8 caracteres com pelo menos 1 número.
        </Typography>
        {erro && <Alert severity="error">{erro}</Alert>}
        <TextField
          fullWidth label="Senha atual" type="password" required
          autoComplete="current-password"
          value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth label="Nova senha" type="password" required
            autoComplete="new-password"
            value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
          />
          <TextField
            fullWidth label="Confirmar nova senha" type="password" required
            autoComplete="new-password"
            error={confereDivergente}
            helperText={confereDivergente ? 'As senhas não conferem' : undefined}
            value={confirmacao} onChange={e => setConfirmacao(e.target.value)}
          />
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button
            type="submit" variant="contained"
            disabled={!podeSalvar}
            sx={{ borderRadius: 2, px: 4 }}
          >
            {enviando ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={sucessoEm !== null}
        autoHideDuration={3000}
        onClose={() => setSucessoEm(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Senha alterada com sucesso
        </Alert>
      </Snackbar>
    </Paper>
  )
}
