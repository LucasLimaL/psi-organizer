import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Stack, Box, Paper, Typography, TextField, Button, Alert, Avatar,
  Grid, Divider, Skeleton, InputAdornment, Snackbar,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import LockIcon from '@mui/icons-material/LockOutlined'
import { perfilApi, type AtualizarPerfilInput, type PerfilCompleto } from '../api/perfil'
import EnderecoForm, { type EnderecoFormValor } from '../components/EnderecoForm'
import { useAuth } from '../auth/authContext'
import { useDirty } from '../hooks/useDirty'
import { formatarCpf, iniciais } from '../utils/formatadores'

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

export default function PerfilPage() {
  const theme = useTheme()
  const { atualizarPsicologa } = useAuth()

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [form, setForm] = useState<AtualizarPerfilInput | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvoEm, setSalvoEm] = useState<number | null>(null)
  const { dirty, setBaseline } = useDirty(form)

  const carregar = useCallback(async () => {
    const p = await perfilApi.buscar()
    setPerfil(p)
    const inicial: AtualizarPerfilInput = {
      nomeCompleto: p.nomeCompleto,
      crp: p.crp,
      telefone: p.telefone,
      endereco: { ...p.endereco, complemento: p.endereco.complemento ?? '' },
    }
    setForm(inicial)
    setBaseline(inicial)
  }, [setBaseline])

  useEffect(() => { carregar() }, [carregar])

  function setCampo<K extends keyof AtualizarPerfilInput>(k: K, v: AtualizarPerfilInput[K]) {
    setForm(f => (f ? { ...f, [k]: v } : f))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro(null)
    setEnviando(true)
    try {
      const atualizado = await perfilApi.atualizar(form)
      setPerfil(atualizado)
      // Atualiza o contexto pra o AppShell refletir o novo nome no avatar/drawer
      atualizarPsicologa({
        id: atualizado.id,
        nomeCompleto: atualizado.nomeCompleto,
        email: atualizado.email,
        cpf: atualizado.cpf,
        crp: atualizado.crp,
        telefone: atualizado.telefone,
      })
      // Baseline vira o estado pós-save → botão desabilita até a próxima edição
      setBaseline(form)
      setSalvoEm(Date.now())
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar perfil') + det)
    } finally {
      setEnviando(false)
    }
  }

  // Skeleton
  if (!perfil || !form) {
    return (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 3, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width={200} height={32} />
              <Skeleton variant="text" width={160} />
            </Box>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 3, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <Skeleton variant="rectangular" height={400} />
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      {/* Header card — identidade */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          boxShadow: 'none',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Avatar
            sx={{
              width: 64, height: 64, fontSize: 22, fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            {iniciais(perfil.nomeCompleto)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {perfil.nomeCompleto}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {perfil.email} · {perfil.crp}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Form */}
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
        <Stack spacing={3}>
          {erro && <Alert severity="error">{erro}</Alert>}

          <Secao titulo="Dados pessoais" descricao="E-mail e CPF não são editáveis por aqui">
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth label="Nome completo" required
                  autoComplete="name"
                  value={form.nomeCompleto}
                  onChange={e => setCampo('nomeCompleto', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth label="E-mail" value={perfil.email} disabled
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth label="CPF" value={formatarCpf(perfil.cpf)} disabled
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="Telefone" required
                  autoComplete="tel"
                  value={form.telefone}
                  onChange={e => setCampo('telefone', e.target.value)}
                />
              </Grid>
            </Grid>
          </Secao>

          <Divider />

          <Secao titulo="Registro profissional">
            <TextField
              fullWidth label="CRP" required
              helperText="Inclua a sigla regional, ex: CRP 06/12345"
              value={form.crp}
              onChange={e => setCampo('crp', e.target.value)}
            />
          </Secao>

          <Divider />

          <Secao titulo="Endereço do consultório">
            <EnderecoForm
              value={form.endereco as EnderecoFormValor}
              onChange={endereco => setCampo('endereco', endereco)}
            />
          </Secao>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={enviando || !dirty}
              sx={{ borderRadius: 2, px: 4 }}
            >
              {enviando ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Snackbar
        open={salvoEm !== null}
        autoHideDuration={3000}
        onClose={() => setSalvoEm(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Perfil atualizado com sucesso
        </Alert>
      </Snackbar>
    </Stack>
  )
}
