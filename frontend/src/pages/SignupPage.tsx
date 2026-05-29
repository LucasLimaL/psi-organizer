import { useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Stack, TextField, Button, Link, Alert, Grid, Typography, Divider,
  InputAdornment, IconButton, CircularProgress,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useAuth } from '../auth/authContext'
import AuthShell from '../components/AuthShell'
import { useAutofillCep } from '../hooks/useAutofillCep'

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

function Secao({ titulo, descricao, children }: {
  titulo: string
  descricao?: string
  children: ReactNode
}) {
  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {titulo}
        </Typography>
        {descricao && (
          <Typography variant="caption" color="text.secondary">
            {descricao}
          </Typography>
        )}
      </Stack>
      {children}
    </Stack>
  )
}

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(inicial)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function setEnd<K extends keyof Form['endereco']>(k: K, v: string) {
    setForm(f => ({ ...f, endereco: { ...f.endereco, [k]: v } }))
  }

  const buscandoCep = useAutofillCep(form.endereco.cep, end => {
    setForm(f => ({
      ...f,
      endereco: {
        ...f.endereco,
        logradouro: end.logradouro || f.endereco.logradouro,
        bairro: end.bairro || f.endereco.bairro,
        cidade: end.cidade || f.endereco.cidade,
        uf: end.uf || f.endereco.uf,
      },
    }))
  })

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
    <AuthShell
      titulo="Criar conta"
      subtitulo="Comece a organizar sua agenda em poucos minutos"
      larguraCard={640}
    >
      <Stack component="form" onSubmit={onSubmit} spacing={3}>
        {erro && <Alert severity="error">{erro}</Alert>}

        <Secao titulo="Dados pessoais" descricao="Como você aparece para seus pacientes">
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="Nome completo" required
                         autoComplete="name"
                         value={form.nomeCompleto}
                         onChange={e => set('nomeCompleto', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="E-mail" type="email" required
                         autoComplete="email"
                         value={form.email} onChange={e => set('email', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                required
                helperText="Mín. 8 caracteres com pelo menos 1 número"
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                slotProps={{
                  input: {
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
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="CPF" required
                         helperText="Apenas números ou com pontuação"
                         value={form.cpf} onChange={e => set('cpf', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Telefone" required
                         autoComplete="tel"
                         value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </Grid>
          </Grid>
        </Secao>

        <Divider />

        <Secao titulo="Registro profissional">
          <TextField fullWidth label="CRP" required
                     helperText="Inclua a sigla regional, ex: CRP 06/12345"
                     value={form.crp} onChange={e => set('crp', e.target.value)} />
        </Secao>

        <Divider />

        <Secao titulo="Endereço do consultório">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth label="CEP" required
                autoComplete="postal-code"
                helperText="Preenche endereço automaticamente"
                value={form.endereco.cep}
                onChange={e => setEnd('cep', e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: buscandoCep ? (
                      <InputAdornment position="end">
                        <CircularProgress size={16} aria-label="Buscando CEP" />
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Logradouro" required
                         autoComplete="address-line1"
                         value={form.endereco.logradouro}
                         onChange={e => setEnd('logradouro', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField fullWidth label="Número" required
                         value={form.endereco.numero}
                         onChange={e => setEnd('numero', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Complemento"
                         autoComplete="address-line2"
                         value={form.endereco.complemento}
                         onChange={e => setEnd('complemento', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Bairro" required
                         value={form.endereco.bairro}
                         onChange={e => setEnd('bairro', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField fullWidth label="Cidade" required
                         autoComplete="address-level2"
                         value={form.endereco.cidade}
                         onChange={e => setEnd('cidade', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="UF" required
                         autoComplete="address-level1"
                         slotProps={{ htmlInput: { maxLength: 2 } }}
                         value={form.endereco.uf}
                         onChange={e => setEnd('uf', e.target.value.toUpperCase())} />
            </Grid>
          </Grid>
        </Secao>

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={enviando}
          sx={{ borderRadius: 2, py: 1.25, mt: 1 }}
        >
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Já tem conta?{' '}
          <Link
            component={RouterLink}
            to="/login"
            sx={{ fontWeight: 600, textDecoration: 'none' }}
          >
            Entrar
          </Link>
        </Typography>
      </Stack>
    </AuthShell>
  )
}
