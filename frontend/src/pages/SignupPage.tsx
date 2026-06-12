import { useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Stack, TextField, Button, Link, Alert, Grid, Typography, Divider,
  InputAdornment, IconButton,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import { useAuth } from '../auth/authContext'
import AuthShell from '../components/AuthShell'
import EnderecoForm from '../components/EnderecoForm'

import type { EnderecoFormValor } from '../components/EnderecoForm'

type Form = {
  nomeCompleto: string
  email: string
  senha: string
  cpf: string
  crp: string
  telefone: string
  diaFechamento: number
  endereco: EnderecoFormValor
}

const inicial: Form = {
  nomeCompleto: '', email: '', senha: '', cpf: '', crp: '', telefone: '',
  diaFechamento: 31,
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
}

const DIAS_FECHAMENTO = Array.from({ length: 31 }, (_, i) => i + 1)

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

        <Secao
          titulo="Fechamento da mensalidade"
          descricao="Dia do mês em que sua fatura de uso do sistema fecha (vencimento 7 dias depois). Meses mais curtos fecham no último dia."
        >
          <TextField
            select fullWidth label="Dia de fechamento" required
            value={form.diaFechamento}
            onChange={e => set('diaFechamento', Number(e.target.value))}
            slotProps={{ select: { native: true } }}
          >
            {DIAS_FECHAMENTO.map(d => <option key={d} value={d}>{d}</option>)}
          </TextField>
        </Secao>

        <Divider />

        <Secao titulo="Endereço do consultório">
          <EnderecoForm
            value={form.endereco}
            onChange={endereco => setForm(f => ({ ...f, endereco }))}
          />
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
