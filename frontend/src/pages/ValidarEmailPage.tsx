import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import {
  Stack, Typography, Button, Link, Alert, Box, CircularProgress, TextField,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined'
import AuthShell from '../components/AuthShell'
import { authValidacaoApi } from '../api/authValidacao'

type Estado = 'validando' | 'sucesso' | 'erro'

/** Destino do link enviado por e-mail: /validar-email?token=... */
export default function ValidarEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [estado, setEstado] = useState<Estado>('validando')
  const [erro, setErro] = useState<string>('')
  const [emailReenvio, setEmailReenvio] = useState('')
  const [reenviado, setReenviado] = useState(false)
  // StrictMode monta 2x em dev — o token é de uso único, então valida 1 vez só.
  const jaValidou = useRef(false)

  useEffect(() => {
    if (jaValidou.current) return
    jaValidou.current = true
    if (!token) {
      setErro('Link incompleto — abra exatamente o endereço recebido por e-mail.')
      setEstado('erro')
      return
    }
    authValidacaoApi.validarEmail(token)
      .then(() => setEstado('sucesso'))
      .catch((err: { erro?: string }) => {
        setErro(err?.erro ?? 'Não foi possível validar o e-mail.')
        setEstado('erro')
      })
  }, [token])

  async function onReenviar(e: FormEvent) {
    e.preventDefault()
    await authValidacaoApi.reenviarValidacao(emailReenvio)
    setReenviado(true)
  }

  return (
    <AuthShell titulo="Validação de e-mail" subtitulo="Ativação da sua conta">
      {estado === 'validando' && (
        <Stack spacing={2} sx={{ alignItems: 'center', py: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Validando seu e-mail…
          </Typography>
        </Stack>
      )}

      {estado === 'sucesso' && (
        <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box sx={{ color: 'success.main' }}>
            <CheckCircleIcon sx={{ fontSize: 56 }} />
          </Box>
          <Typography variant="body1">
            E-mail confirmado! Sua conta está ativa.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{ borderRadius: 2, px: 4 }}
          >
            Entrar
          </Button>
        </Stack>
      )}

      {estado === 'erro' && (
        <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box sx={{ color: 'error.main' }}>
            <ErrorIcon sx={{ fontSize: 56 }} />
          </Box>
          <Alert severity="error" sx={{ width: '100%' }}>{erro}</Alert>
          {reenviado ? (
            <Alert severity="success" sx={{ width: '100%' }}>
              Se houver uma conta aguardando validação com esse e-mail,
              um novo link foi enviado.
            </Alert>
          ) : (
            <Stack
              component="form"
              onSubmit={onReenviar}
              spacing={1.5}
              sx={{ width: '100%' }}
            >
              <Typography variant="body2" color="text.secondary">
                Peça um novo link informando o e-mail da conta:
              </Typography>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                required
                value={emailReenvio}
                onChange={e => setEmailReenvio(e.target.value)}
              />
              <Button type="submit" variant="outlined">
                Reenviar link de validação
              </Button>
            </Stack>
          )}
          <Link
            component={RouterLink}
            to="/login"
            sx={{ fontWeight: 600, textDecoration: 'none' }}
          >
            Voltar ao login
          </Link>
        </Stack>
      )}
    </AuthShell>
  )
}
