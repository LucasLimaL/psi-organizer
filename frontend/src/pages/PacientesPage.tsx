import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack, Box, Typography, Button, TextField, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog,
  DialogTitle, DialogContent, Paper, ButtonBase, Avatar, useMediaQuery,
  InputAdornment, Tooltip, Snackbar, Alert,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import RestoreIcon from '@mui/icons-material/Restore'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined'
import { pacientesApi, type Paciente, type PacienteInput } from '../api/pacientes'
import PacienteForm from '../components/PacienteForm'
import InativarPacienteDialog from '../components/InativarPacienteDialog'

function formatarCpf(cpf: string) {
  if (cpf.length !== 11) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
}

export default function PacientesPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const [pacienteParaInativar, setPacienteParaInativar] = useState<Paciente | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const lista = await pacientesApi.listar(incluirInativos)
    setPacientes(lista)
  }, [incluirInativos])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return pacientes
    const qDigitos = q.replace(/\D/g, '')
    return pacientes.filter(p => {
      if (p.nome.toLowerCase().includes(q)) return true
      if (!qDigitos) return false
      if (p.cpf.includes(qDigitos)) return true
      const telefoneDigitos = p.telefone.replace(/\D/g, '')
      return telefoneDigitos.includes(qDigitos)
    })
  }, [pacientes, busca])

  async function onCriar(p: PacienteInput) {
    await pacientesApi.criar(p)
    setCriando(false)
    await carregar()
    setMensagemSucesso('Paciente criado com sucesso')
  }

  async function confirmarInativar() {
    if (!pacienteParaInativar) return
    const nome = pacienteParaInativar.nome
    await pacientesApi.inativar(pacienteParaInativar.id)
    await carregar()
    setMensagemSucesso(`${nome} inativada`)
  }

  async function reativar(p: Paciente) {
    await pacientesApi.reativar(p.id)
    await carregar()
    setMensagemSucesso(`${p.nome} reativada`)
  }

  const totalAtivos = pacientes.filter(p => p.ativo).length
  const totalInativos = pacientes.length - totalAtivos

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap', gap: 1 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {pacientes.length} {pacientes.length === 1 ? 'paciente' : 'pacientes'}
            {incluirInativos && totalInativos > 0 && (
              <> · {totalAtivos} ativos, {totalInativos} inativos</>
            )}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Pacientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCriando(true)}
          sx={{ borderRadius: 999 }}
        >
          Novo paciente
        </Button>
      </Stack>

      {/* Filtros */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Buscar por nome, CPF ou telefone"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: busca && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setBusca('')} aria-label="Limpar busca">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Chip
          label={incluirInativos ? 'Incluindo inativos' : 'Apenas ativos'}
          color={incluirInativos ? 'default' : 'primary'}
          variant={incluirInativos ? 'outlined' : 'filled'}
          onClick={() => setIncluirInativos(v => !v)}
          sx={{ borderRadius: 999, cursor: 'pointer' }}
        />
      </Stack>

      {/* Empty state */}
      {filtrados.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4, boxShadow: 'none',
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 1.5, textAlign: 'center',
          }}
        >
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PeopleOutlineIcon fontSize="large" />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {busca || incluirInativos ? 'Nenhum paciente encontrado' : 'Sem pacientes cadastrados'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            {busca
              ? 'Tente outro termo na busca ou inclua inativos.'
              : 'Cadastre seu primeiro paciente para começar.'}
          </Typography>
          {!busca && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCriando(true)}
              sx={{ borderRadius: 999, mt: 1 }}
            >
              Novo paciente
            </Button>
          )}
        </Paper>
      ) : isDesktop ? (
        <Paper sx={{ overflow: 'hidden', p: 0 }}>
          <Table sx={{ '& .MuiTableRow-root:last-of-type .MuiTableCell-root': { borderBottom: 0 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" sx={{ width: 64 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map(p => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    transition: theme.transitions.create('background-color', {
                      duration: theme.transitions.duration.short,
                    }),
                  }}
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 32, height: 32, fontSize: 13, fontWeight: 600,
                          bgcolor: p.ativo
                            ? alpha(theme.palette.primary.main, 0.12)
                            : alpha(theme.palette.text.secondary, 0.12),
                          color: p.ativo ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        {iniciais(p.nome)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.nome}
                        </Typography>
                        {p.email && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {p.email}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatarCpf(p.cpf)}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.telefone}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    R$ {p.valorConsulta.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {p.ativo
                      ? <Chip size="small" label="Ativo" color="success" variant="outlined" />
                      : <Chip size="small" label="Inativo" variant="outlined" />}
                  </TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    {p.ativo
                      ? (
                        <Tooltip title="Inativar paciente">
                          <IconButton
                            size="small"
                            aria-label={`Inativar ${p.nome}`}
                            onClick={() => setPacienteParaInativar(p)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )
                      : (
                        <Tooltip title="Reativar paciente">
                          <IconButton
                            size="small"
                            aria-label={`Reativar ${p.nome}`}
                            onClick={() => reativar(p)}
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        /* Mobile: lista de cards */
        <Stack spacing={1}>
          {filtrados.map(p => (
            <ButtonBase
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              sx={{
                width: '100%',
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textAlign: 'left',
                transition: theme.transitions.create(['background-color', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  boxShadow: theme.shadows[1],
                },
              }}
            >
              <Avatar
                sx={{
                  width: 44, height: 44, fontSize: 15, fontWeight: 600, flexShrink: 0,
                  bgcolor: p.ativo
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.text.secondary, 0.12),
                  color: p.ativo ? 'primary.main' : 'text.secondary',
                }}
              >
                {iniciais(p.nome)}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', minWidth: 0 }}
                >
                  <Typography
                    variant="body1"
                    noWrap
                    sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }}
                  >
                    {p.nome}
                  </Typography>
                  {!p.ativo && (
                    <Chip size="small" label="Inativo" variant="outlined" />
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatarCpf(p.cpf)} · R$ {p.valorConsulta.toFixed(2)}
                </Typography>
              </Box>
              <ChevronRightIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
            </ButtonBase>
          ))}
        </Stack>
      )}

      <Dialog open={criando} onClose={() => setCriando(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo paciente</DialogTitle>
        <DialogContent>
          <PacienteForm textoBotao="Criar" onSubmit={onCriar} />
        </DialogContent>
      </Dialog>

      <InativarPacienteDialog
        aberto={pacienteParaInativar !== null}
        paciente={pacienteParaInativar}
        onFechar={() => setPacienteParaInativar(null)}
        onConfirmar={confirmarInativar}
      />

      <Snackbar
        open={mensagemSucesso !== null}
        autoHideDuration={3000}
        onClose={() => setMensagemSucesso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {mensagemSucesso}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
