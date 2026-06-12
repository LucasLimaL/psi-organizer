import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Stack, TextField, Button, Link, Alert, IconButton, InputAdornment, Typography,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import EmailIcon from '@mui/icons-material/EmailOutlined'
import LockIcon from '@mui/icons-material/LockOutlined'
import { useAuth } from '../auth/authContext'
import AuthShell from '../components/AuthShell'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sessaoExpirada = params.get('sessao') === 'expirada'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const p = await login(email, senha)
      navigate(p.admin ? '/admin' : '/', { replace: true })
    } catch (err) {
      const msg = (err as { erro?: string })?.erro ?? 'Falha ao entrar'
      setErro(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell titulo="Entrar" subtitulo="Acesse sua conta para gerenciar a agenda">
      <Stack component="form" onSubmit={onSubmit} spacing={2.5}>
        {sessaoExpirada && !erro && (
          <Alert severity="info">
            Sua sessão expirou. Entre novamente para continuar.
          </Alert>
        )}
        {erro && <Alert severity="error">{erro}</Alert>}

        <TextField
          fullWidth
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          fullWidth
          label="Senha"
          type={mostrarSenha ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={senha}
          onChange={e => setSenha(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setMostrarSenha(v => !v)}
                  >
                    {mostrarSenha ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={enviando}
          sx={{ borderRadius: 2, py: 1.25, mt: 0.5 }}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Não tem conta?{' '}
          <Link
            component={RouterLink}
            to="/signup"
            sx={{ fontWeight: 600, textDecoration: 'none' }}
          >
            Cadastre-se
          </Link>
        </Typography>
      </Stack>
    </AuthShell>
  )
}
