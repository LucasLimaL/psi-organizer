import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Stack, Box, Paper, Typography, Button, Chip, Avatar, IconButton,
  Skeleton, Tooltip, Snackbar, Alert, Grid, ButtonBase, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import { adminApi, type AdminPsicologo, type Contrato, type Mensalidade } from '../api/admin'
import { formatarMoeda as brl, iniciais } from '../utils/formatadores'
import AdminNovoContratoDialog from '../components/AdminNovoContratoDialog'

const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function dataLocal(iso: string): string {
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('pt-BR')
}

function vigencia(c: Contrato): string {
  return `${dataLocal(c.dataInicio)} → ${c.dataFim ? dataLocal(c.dataFim) : 'indeterminado'}`
}

export default function AdminPsicologoDetalhePage() {
  const theme = useTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [psicologo, setPsicologo] = useState<AdminPsicologo | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogContrato, setDialogContrato] = useState(false)
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false)
  const [mensalidadeAlvo, setMensalidadeAlvo] = useState<Mensalidade | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      const [p, cs, ms] = await Promise.all([
        adminApi.psicologo(id),
        adminApi.contratos(id),
        adminApi.mensalidades(id),
      ])
      setPsicologo(p)
      setContratos(cs)
      setMensalidades(ms)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  // Mensalidades indexadas por ano/mês pra grade anual (anos desc)
  const anos = useMemo(() => {
    const porAno = new Map<number, Map<number, Mensalidade>>()
    for (const m of mensalidades) {
      const [ano, mes] = m.competencia.split('-').map(Number)
      if (!porAno.has(ano)) porAno.set(ano, new Map())
      porAno.get(ano)!.set(mes, m)
    }
    return [...porAno.entries()].sort((a, b) => b[0] - a[0])
  }, [mensalidades])

  const anoAtual = new Date().getFullYear()
  const recebidoNoAno = mensalidades
    .filter(m => m.paga && m.competencia.startsWith(String(anoAtual)))
    .reduce((acc, m) => acc + m.valor, 0)

  async function confirmarBloqueio() {
    if (!psicologo) return
    setSalvando(true)
    try {
      await adminApi.bloquear(psicologo.id, !psicologo.bloqueada)
      setConfirmandoBloqueio(false)
      setMensagemSucesso(psicologo.bloqueada ? 'Acesso desbloqueado' : 'Acesso bloqueado')
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarBaixa() {
    const m = mensalidadeAlvo
    if (!m) return
    setSalvando(true)
    try {
      await adminApi.darBaixa(m.id, !m.paga)
      setMensalidadeAlvo(null)
      setMensagemSucesso(m.paga
        ? `Baixa de ${m.competencia} estornada`
        : `Mensalidade ${m.competencia} paga`)
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function encerrarContrato(c: Contrato) {
    setSalvando(true)
    try {
      await adminApi.encerrarContrato(c.id)
      setMensagemSucesso('Contrato encerrado')
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  if (carregando && !psicologo) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={220} />
        <Skeleton variant="rounded" height={96} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={160} />
      </Stack>
    )
  }

  if (!psicologo) return null

  const cardsx = {
    p: 2, boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
  }

  return (
    <Stack spacing={2}>
      {/* Breadcrumb */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title="Voltar à lista">
          <IconButton size="small" onClick={() => navigate('/admin')} aria-label="Voltar">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" color="text.secondary">
          Psicólogos / <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
            {psicologo.nomeCompleto}
          </Box>
        </Typography>
      </Stack>

      {/* Header */}
      <Paper variant="outlined" sx={{ ...cardsx, p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Avatar sx={{
            width: 56, height: 56, fontSize: 20, fontWeight: 600,
            bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main',
          }}>
            {iniciais(psicologo.nomeCompleto)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {psicologo.nomeCompleto}
              </Typography>
              {psicologo.bloqueada
                ? <Chip size="small" label="Bloqueado" color="error" sx={{ fontWeight: 600 }} />
                : <Chip size="small" label="Ativo" color="success" variant="outlined" sx={{ fontWeight: 600 }} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {psicologo.email} · {psicologo.crp} · cliente desde {dataLocal(psicologo.criadoEm)}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color={psicologo.bloqueada ? 'success' : 'error'}
            startIcon={psicologo.bloqueada ? <LockOpenIcon /> : <BlockIcon />}
            onClick={() => setConfirmandoBloqueio(true)}
            sx={{ borderRadius: 999, flexShrink: 0 }}
          >
            {psicologo.bloqueada ? 'Desbloquear' : 'Bloquear'}
          </Button>
        </Stack>
      </Paper>

      {/* Cards de resumo */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={cardsx}>
            <Typography variant="caption" sx={{
              color: 'text.secondary', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Contrato ativo
            </Typography>
            {psicologo.contratoAtivo ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {brl(psicologo.contratoAtivo.valorMensal)}
                  <Typography component="span" variant="body2" color="text.secondary">/mês</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {vigencia(psicologo.contratoAtivo)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="text.disabled" sx={{ mt: 0.5 }}>
                sem contrato
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.warning.main}` }}>
            <Typography variant="caption" sx={{
              color: 'warning.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Em aberto
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: psicologo.totalPendente > 0 ? 'warning.main' : 'text.primary',
            }}>
              {brl(psicologo.totalPendente)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {psicologo.mensalidadesPendentes} competência{psicologo.mensalidadesPendentes === 1 ? '' : 's'}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.success.main}` }}>
            <Typography variant="caption" sx={{
              color: 'success.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Recebido em {anoAtual}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {brl(recebidoNoAno)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Grade anual de mensalidades */}
      <Paper variant="outlined" sx={cardsx}>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Mensalidades
          </Typography>
          <Typography variant="caption" color="text.secondary">
            clique numa célula pra dar baixa ou estornar
          </Typography>
        </Stack>
        {anos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhuma mensalidade lançada — crie um contrato pra começar a cobrança.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {anos.map(([ano, porMes]) => (
              <Box key={ano}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {ano}
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: 0.5, mt: 0.5,
                }}>
                  {MESES_CURTO.map((rotulo, i) => {
                    const m = porMes.get(i + 1)
                    return (
                      <Box key={rotulo}>
                        <Typography variant="caption" sx={{
                          display: 'block', textAlign: 'center',
                          fontSize: 10, color: 'text.disabled',
                        }}>
                          {rotulo}
                        </Typography>
                        {m ? (
                          <Tooltip title={`${m.competencia} · ${brl(m.valor)} · ${m.paga ? 'paga — clique pra estornar' : 'em aberto — clique pra dar baixa'}`}>
                            <ButtonBase
                              onClick={() => setMensalidadeAlvo(m)}
                              aria-label={`Mensalidade ${m.competencia}, ${m.paga ? 'paga' : 'em aberto'}`}
                              sx={{
                                width: '100%', height: 34, borderRadius: 1.5,
                                bgcolor: m.paga
                                  ? alpha(theme.palette.success.main, 0.12)
                                  : alpha(theme.palette.warning.main, 0.15),
                                border: `1px solid ${m.paga
                                  ? alpha(theme.palette.success.main, 0.5)
                                  : theme.palette.warning.main}`,
                                color: m.paga ? 'success.main' : 'warning.main',
                                fontSize: 10, fontWeight: 700,
                                '&:hover': { filter: 'brightness(0.95)' },
                              }}
                            >
                              {m.paga ? <CheckIcon sx={{ fontSize: 16 }} /> : 'aberta'}
                            </ButtonBase>
                          </Tooltip>
                        ) : (
                          <Box sx={{
                            height: 34, borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.divider, 0.25),
                          }} />
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Contratos */}
      <Paper variant="outlined" sx={cardsx}>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Contratos
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogContrato(true)}
            sx={{ borderRadius: 999 }}
          >
            Novo contrato
          </Button>
        </Stack>
        {contratos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhum contrato ainda.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {contratos.map(c => (
              <Stack key={c.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {brl(c.valorMensal)}/mês
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vigencia(c)}
                  </Typography>
                </Stack>
                {c.ativo ? (
                  <>
                    <Chip size="small" label="Ativo" color="success" variant="outlined"
                          sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                    <Button size="small" color="error" disabled={salvando}
                            onClick={() => encerrarContrato(c)}
                            sx={{ borderRadius: 999, fontSize: 12 }}>
                      Encerrar
                    </Button>
                  </>
                ) : (
                  <Chip size="small" label="Encerrado" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Confirmação de baixa/estorno */}
      <Dialog open={mensalidadeAlvo !== null} onClose={() => setMensalidadeAlvo(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {mensalidadeAlvo?.paga ? 'Estornar baixa' : 'Confirmar pagamento'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {mensalidadeAlvo?.paga ? 'Estornar a baixa da mensalidade de ' : 'Dar baixa na mensalidade de '}
            <Box component="span" sx={{ fontWeight: 600 }}>{mensalidadeAlvo?.competencia}</Box>
            {' '}no valor de{' '}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {mensalidadeAlvo ? brl(mensalidadeAlvo.valor) : ''}
            </Box>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMensalidadeAlvo(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={mensalidadeAlvo?.paga ? 'inherit' : 'success'}
            disabled={salvando}
            onClick={confirmarBaixa}
          >
            {salvando ? 'Salvando…' : mensalidadeAlvo?.paga ? 'Estornar' : 'Dar baixa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmação de bloqueio */}
      <Dialog open={confirmandoBloqueio} onClose={() => setConfirmandoBloqueio(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{psicologo.bloqueada ? 'Desbloquear acesso' : 'Bloquear acesso'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {psicologo.bloqueada
              ? `Desbloquear o acesso de ${psicologo.nomeCompleto}? O login volta a funcionar normalmente.`
              : `Bloquear o acesso de ${psicologo.nomeCompleto}? Vale a partir do próximo login — uma sessão aberta expira sozinha em até 24h. Os dados permanecem intactos.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmandoBloqueio(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={psicologo.bloqueada ? 'success' : 'error'}
            disabled={salvando}
            onClick={confirmarBloqueio}
          >
            {salvando ? 'Salvando…' : psicologo.bloqueada ? 'Desbloquear' : 'Bloquear'}
          </Button>
        </DialogActions>
      </Dialog>

      <AdminNovoContratoDialog
        aberto={dialogContrato}
        psicologoId={psicologo.id}
        substituiAtivo={psicologo.contratoAtivo !== null}
        onFechar={() => setDialogContrato(false)}
        onCriado={() => { setMensagemSucesso('Contrato criado'); carregar() }}
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
