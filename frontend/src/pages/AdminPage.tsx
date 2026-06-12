import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack, Box, Paper, Typography, TextField, InputAdornment, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, Avatar,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { adminApi, type AdminPsicologo } from '../api/admin'
import { formatarMoeda as brl, iniciais } from '../utils/formatadores'

const PAGE_SIZE = 20

/**
 * Lista de psicólogos clientes do SaaS — navegação pro detalhe
 * (/admin/psicologos/:id), onde ficam contrato, mensalidades e bloqueio.
 */
export default function AdminPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [psicologos, setPsicologos] = useState<AdminPsicologo[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')

  // Debounce simples da busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await adminApi.psicologos(buscaAplicada, PAGE_SIZE, 0)
      setPsicologos(r.psicologos)
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
      const r = await adminApi.psicologos(buscaAplicada, PAGE_SIZE, psicologos.length)
      setPsicologos(prev => [...prev, ...r.psicologos])
      setTemMais(r.temMais)
    } finally {
      setCarregandoMais(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Gestão de contas e mensalidades do sistema
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Psicólogos {!carregando && `(${total})`}
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
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {psicologos.map(p => (
                <TableRow
                  key={p.id}
                  hover
                  onClick={() => navigate(`/admin/psicologos/${p.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
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
                    {p.bloqueada
                      ? <Chip size="small" label="Bloqueado" color="error" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                      : <Chip size="small" label="Ativo" color="success" variant="outlined" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />}
                  </TableCell>
                  <TableCell align="right">
                    <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
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
          {carregandoMais ? 'Carregando…' : `Ver mais (${total - psicologos.length} restantes)`}
        </Button>
      )}
    </Stack>
  )
}
