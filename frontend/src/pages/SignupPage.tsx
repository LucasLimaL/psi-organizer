import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Paper, Typography, TextField, Button, Link, Alert, Grid } from '@mui/material'
import { useAuth } from '../auth/authContext'

type Form = {
  nomeCompleto: string
  email: string
  senha: string
  cpf: string
  crp: string
  telefone: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
  }
}

const inicial: Form = {
  nomeCompleto: '', email: '', senha: '', cpf: '', crp: '', telefone: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
}

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function setEnd<K extends keyof Form['endereco']>(k: K, v: string) {
    setForm(f => ({ ...f, endereco: { ...f.endereco, [k]: v } }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const payload = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        endereco: { ...form.endereco, cep: form.endereco.cep.replace(/\D/g, '') },
      }
      await signup(payload)
      navigate('/', { replace: true })
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const detalhes = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao cadastrar') + detalhes)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 4, width: 640 }}>
        <Typography variant="h5" gutterBottom>Criar conta</Typography>
        {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth label="Nome completo" required
                       value={form.nomeCompleto} onChange={e => set('nomeCompleto', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="E-mail" type="email" required
                       value={form.email} onChange={e => set('email', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Senha (mín. 8, com 1 dígito)" type="password" required
                       value={form.senha} onChange={e => set('senha', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth label="CPF" required
                       value={form.cpf} onChange={e => set('cpf', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth label="CRP" required
                       value={form.crp} onChange={e => set('crp', e.target.value)} />
          </Grid>
          <Grid size={4}>
            <TextField fullWidth label="Telefone" required
                       value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          </Grid>

          <Grid size={12}><Typography variant="subtitle1" sx={{ mt: 1 }}>Endereço</Typography></Grid>
          <Grid size={3}>
            <TextField fullWidth label="CEP" required
                       value={form.endereco.cep} onChange={e => setEnd('cep', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Logradouro" required
                       value={form.endereco.logradouro} onChange={e => setEnd('logradouro', e.target.value)} />
          </Grid>
          <Grid size={3}>
            <TextField fullWidth label="Número" required
                       value={form.endereco.numero} onChange={e => setEnd('numero', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Complemento"
                       value={form.endereco.complemento} onChange={e => setEnd('complemento', e.target.value)} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Bairro" required
                       value={form.endereco.bairro} onChange={e => setEnd('bairro', e.target.value)} />
          </Grid>
          <Grid size={9}>
            <TextField fullWidth label="Cidade" required
                       value={form.endereco.cidade} onChange={e => setEnd('cidade', e.target.value)} />
          </Grid>
          <Grid size={3}>
            <TextField fullWidth label="UF" required
                       slotProps={{ htmlInput: { maxLength: 2 } }}
                       value={form.endereco.uf} onChange={e => setEnd('uf', e.target.value.toUpperCase())} />
          </Grid>
        </Grid>

        <Button fullWidth type="submit" variant="contained" sx={{ mt: 3 }} disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar conta'}
        </Button>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Já tem conta? <Link component={RouterLink} to="/login">Entrar</Link>
        </Typography>
      </Paper>
    </Box>
  )
}
