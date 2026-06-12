import { useCallback, useEffect, useState } from 'react'
import {
  Stack, Box, Paper, Typography, TextField, InputAdornment, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, Avatar,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import BlockIcon from '@mui/icons-material/Block'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import { adminApi, type AdminPsicologa } from '../api/admin'
import { formatarMoeda as brl, iniciais } from '../utils/formatadores'
import AdminMensalidadesDialog from '../components/AdminMensalidadesDialog'
import AdminContratoDialog from '../components/AdminContratoDialog'

const PAGE_SIZE = 20

export default function AdminPage() {
  const theme = useTheme()
  const [psicologas, setPsicologas] = useState<AdminPsicologa[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [dialogMensalidades, setDialogMensalidades] = useState<AdminPsicologa | null>(null)
  const [dialogContrato, setDialogContrato] = useState<AdminPsicologa | null>(null)
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState<AdminPsicologa | null>(null)
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // Debounce simples da busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await adminApi.psicologas(buscaAplicada, PAGE_SIZE, 0)
      setPsicologas(r.psicologas)
      setTotal(r.total)
      setTemMais(r.temMais)
    } finally {
      setCarregando(false)
    }
  }, [buscaAplicada])

  useEffect(() => { carregar() }, [carregar])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const r = await adminApi.psicologas(buscaAplicada, PAGE_SIZE, psicologas.length)
      setPsicologas(prev => [...prev, ...r.psicologas])
      setTemMais(r.temMais)
    } finally {
      setCarregandoMais(false)
    }
  }

  async function confirmarBloqueio() {
    const alvo = confirmandoBloqueio
    if (!alvo) return
    setSalvandoBloqueio(true)
    try {
      await adminApi.bloquear(alvo.id, !alvo.bloqueada)
      setConfirmandoBloqueio(null)
      setMensagemSucesso(alvo.bloqueada
        ? `Acesso de ${alvo.nomeCompleto} desbloqueado`
        : `Acesso de ${alvo.nomeCompleto} bloqueado`)
      await carregar()
    } finally {
      setSalvandoBloqueio(false)
    }
  }

  function aposMudanca() {
    carregar()
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Gestão de contas e mensalidades do sistema
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Psicólogas {!carregando && `(${total})`}
          </Typography>
        </Stack>
        <TextField
          size="small"
          placeholder="Buscar por nome ou e-mail"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          sx={{ minWidth: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>

      {carregando ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Conta</TableCell>
                <TableCell>Contrato</TableCell>
                <TableCell align="right">Pendências</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" sx={{ width: 220 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {psicologas.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: 12, fontWeight: 600,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                      }}>
                        {iniciais(p.nomeCompleto)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                          {p.nomeCompleto}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {p.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {p.contratoAtivo ? (
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {brl(p.contratoAtivo.valorMensal)}/mês
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">sem contrato</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {p.mensalidadesPendentes > 0 ? (
                      <Chip
                        size="small"
                        label={`${brl(p.totalPendente)} (${p.mensalidadesPendentes})`}
                        color="warning"
                        sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.admin
                      ? <Chip size="small" label="Admin" color="info" variant="outlined" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                      : p.bloqueada
                        ? <Chip size="small" label="Bloqueada" color="error" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                        : <Chip size="small" label="Ativa" color="success" variant="outlined" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Mensalidades">
                        <Button size="small" startIcon={<ReceiptLongIcon />}
                                onClick={() => setDialogMensalidades(p)}
                                sx={{ borderRadius: 999, minWidth: 0, fontSize: 12 }}>
                          Mensalidades
                        </Button>
                      </Tooltip>
                      <Tooltip title="Contrato">
                        <Button size="small" startIcon={<DescriptionIcon />}
                                onClick={() => setDialogContrato(p)}
                                sx={{ borderRadius: 999, minWidth: 0, fontSize: 12 }}>
                          Contrato
                        </Button>
                      </Tooltip>
                      {!p.admin && (
                        <Tooltip title={p.bloqueada ? 'Desbloquear acesso' : 'Bloquear acesso'}>
                          <Button
                            size="small"
                            color={p.bloqueada ? 'success' : 'error'}
                            startIcon={p.bloqueada ? <LockOpenIcon /> : <BlockIcon />}
                            onClick={() => setConfirmandoBloqueio(p)}
                            sx={{ borderRadius: 999, minWidth: 0, fontSize: 12 }}
                          >
                            {p.bloqueada ? 'Desbloquear' : 'Bloquear'}
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {temMais && (
        <Button
          onClick={carregarMais}
          variant="text"
          startIcon={<KeyboardArrowDownIcon />}
          disabled={carregandoMais}
          sx={{ alignSelf: 'center', borderRadius: 999 }}
        >
          {carregandoMais ? 'Carregando…' : `Ver mais (${total - psicologas.length} restantes)`}
        </Button>
      )}

      {/* Confirmação de bloqueio/desbloqueio */}
      <Dialog
        open={confirmandoBloqueio !== null}
        onClose={() => setConfirmandoBloqueio(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {confirmandoBloqueio?.bloqueada ? 'Desbloquear acesso' : 'Bloquear acesso'}
        </DialogTitle>
        <DialogContent>
          {confirmandoBloqueio?.bloqueada ? (
            <Typography variant="body2">
              Desbloquear o acesso de{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>{confirmandoBloqueio?.nomeCompleto}</Box>?
              Ela poderá entrar no sistema normalmente.
            </Typography>
          ) : (
            <Typography variant="body2">
              Bloquear o acesso de{' '}
              <Box component="span" sx={{ fontWeight: 600 }}>{confirmandoBloqueio?.nomeCompleto}</Box>?
              O bloqueio vale a partir do próximo login — uma sessão já aberta
              expira sozinha em até 24h. Os dados dela permanecem intactos.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmandoBloqueio(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmandoBloqueio?.bloqueada ? 'success' : 'error'}
            disabled={salvandoBloqueio}
            onClick={confirmarBloqueio}
          >
            {salvandoBloqueio
              ? 'Salvando…'
              : confirmandoBloqueio?.bloqueada ? 'Desbloquear' : 'Bloquear'}
          </Button>
        </DialogActions>
      </Dialog>

      <AdminMensalidadesDialog
        psicologa={dialogMensalidades}
        onFechar={() => setDialogMensalidades(null)}
        onMudanca={aposMudanca}
      />

      <AdminContratoDialog
        psicologa={dialogContrato}
        onFechar={() => setDialogContrato(null)}
        onMudanca={aposMudanca}
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
