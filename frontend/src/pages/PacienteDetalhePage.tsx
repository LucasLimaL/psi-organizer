import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Stack, Box, Paper, Typography, Button, Chip, Avatar, IconButton,
  Skeleton, Tooltip, Tabs, Tab,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import RestoreIcon from '@mui/icons-material/Restore'
import { pacientesApi, type Paciente, type PacienteInput } from '../api/pacientes'
import PacienteForm from '../components/PacienteForm'
import InativarPacienteDialog from '../components/InativarPacienteDialog'
import ConsultasPacienteList from '../components/ConsultasPacienteList'

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
}

function formatarCpf(cpf: string) {
  if (cpf.length !== 11) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

type AbaId = 'dados' | 'proximas' | 'historico'

export default function PacienteDetalhePage() {
  const theme = useTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [inativando, setInativando] = useState(false)
  const [aba, setAba] = useState<AbaId>('dados')
  const [totalProximas, setTotalProximas] = useState<number | null>(null)
  const [totalHistorico, setTotalHistorico] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    const p = await pacientesApi.buscar(id)
    setPaciente(p)
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function salvar(p: PacienteInput) {
    if (!id) return
    const atualizado = await pacientesApi.atualizar(id, p)
    setPaciente(atualizado)
  }

  async function confirmarInativar() {
    if (!id) return
    await pacientesApi.inativar(id)
    await carregar()
    // Após inativar, consultas futuras foram apagadas — recarrega contagem
    setTotalProximas(null)
  }

  async function reativar() {
    if (!id) return
    await pacientesApi.reativar(id)
    await carregar()
  }

  // Skeleton enquanto carrega
  if (!paciente) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={120} />
        </Stack>
        <Paper variant="outlined" sx={{ p: 3, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width={200} height={32} />
              <Skeleton variant="text" width={160} />
            </Box>
          </Stack>
        </Paper>
        <Skeleton variant="rectangular" height={300} />
      </Stack>
    )
  }

  const inicial: PacienteInput = {
    nome: paciente.nome,
    cpf: paciente.cpf,
    dataNascimento: paciente.dataNascimento,
    telefone: paciente.telefone,
    email: paciente.email ?? '',
    endereco: paciente.endereco,
    valorConsulta: paciente.valorConsulta,
    observacoes: paciente.observacoes ?? '',
  }

  function rotuloAba(base: string, total: number | null) {
    return total === null ? base : `${base} (${total})`
  }

  return (
    <Stack spacing={2}>
      {/* Breadcrumb / Voltar */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title="Voltar à lista">
          <IconButton size="small" onClick={() => navigate('/pacientes')} aria-label="Voltar">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" color="text.secondary">
          Pacientes / <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{paciente.nome}</Box>
        </Typography>
      </Stack>

      {/* Header card */}
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
              bgcolor: paciente.ativo
                ? alpha(theme.palette.primary.main, 0.12)
                : alpha(theme.palette.text.secondary, 0.12),
              color: paciente.ativo ? 'primary.main' : 'text.secondary',
            }}
          >
            {iniciais(paciente.nome)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {paciente.nome}
              </Typography>
              {paciente.ativo
                ? <Chip size="small" label="Ativo" color="success" variant="outlined" />
                : <Chip size="small" label="Inativo" variant="outlined" />}
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              CPF {formatarCpf(paciente.cpf)} · {paciente.telefone}
              {paciente.email && <> · {paciente.email}</>}
            </Typography>
          </Box>
          {paciente.ativo ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setInativando(true)}
              sx={{ borderRadius: 999, flexShrink: 0 }}
            >
              Inativar
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={reativar}
              sx={{ borderRadius: 999, flexShrink: 0 }}
            >
              Reativar
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tabs */}
      <Box>
        <Tabs
          value={aba}
          onChange={(_, v) => setAba(v)}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
        >
          <Tab value="dados" label="Dados" />
          <Tab value="proximas" label={rotuloAba('Próximas', totalProximas)} />
          <Tab value="historico" label={rotuloAba('Histórico', totalHistorico)} />
        </Tabs>
      </Box>

      {/* Tab content */}
      {aba === 'dados' && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            boxShadow: 'none',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <PacienteForm inicial={inicial} textoBotao="Salvar alterações" onSubmit={salvar} />
        </Paper>
      )}

      {aba === 'proximas' && id && (
        <ConsultasPacienteList
          pacienteId={id}
          tipo="proximas"
          onTotalCarregado={setTotalProximas}
        />
      )}

      {aba === 'historico' && id && (
        <ConsultasPacienteList
          pacienteId={id}
          tipo="historico"
          onTotalCarregado={setTotalHistorico}
        />
      )}

      <InativarPacienteDialog
        aberto={inativando}
        paciente={paciente}
        onFechar={() => setInativando(false)}
        onConfirmar={confirmarInativar}
      />
    </Stack>
  )
}
