import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Paper, Typography, TextField, Button, Link, Alert } from '@mui/material'
import { useAuth } from '../auth/authContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await login(email, senha)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = (err as { erro?: string })?.erro ?? 'Falha ao entrar'
      setErro(msg)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" gutterBottom>Entrar</Typography>
        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
        <TextField fullWidth label="E-mail" margin="normal"
                   value={email} onChange={e => setEmail(e.target.value)} required />
        <TextField fullWidth label="Senha" type="password" margin="normal"
                   value={senha} onChange={e => setSenha(e.target.value)} required />
        <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }} disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Não tem conta? <Link component={RouterLink} to="/signup">Cadastre-se</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
