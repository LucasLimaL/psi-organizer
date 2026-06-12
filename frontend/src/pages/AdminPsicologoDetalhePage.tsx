import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Stack, Box, Paper, Typography, Button, Chip, Avatar, IconButton,
  Skeleton, Tooltip, Snackbar, Alert, Grid, Divider, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Collapse, ButtonBase,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  adminApi, type AdminPsicologo, type Contrato, type Fatura, type PreviaFatura,
} from '../api/admin'
import { formatarMoeda as brl, iniciais } from '../utils/formatadores'
import { toDatetimeLocal } from '../utils/datas'
import {
  CHIP_STATUS, competencia, dataHoraLocal, dataLocal,
  situacaoContrato, vigencia,
} from '../utils/faturas'
import AdminNovoContratoDialog from '../components/AdminNovoContratoDialog'
import DetalheFatura from '../components/DetalheFatura'


export default function AdminPsicologoDetalhePage() {
  const theme = useTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [psicologo, setPsicologo] = useState<AdminPsicologo | null>(null)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [previas, setPrevias] = useState<PreviaFatura[]>([])
  const [carregando, setCarregando] = useState(true)
  const [itensAbertos, setItensAbertos] = useState<string | null>(null)
  const [anoFiltro, setAnoFiltro] = useState<number | null>(null)
  const [dialogContrato, setDialogContrato] = useState(false)
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false)
  const [faturaAlvo, setFaturaAlvo] = useState<Fatura | null>(null)
  const [dataHoraPagamento, setDataHoraPagamento] = useState('')

  // Abrindo o dialog de baixa, a data/hora de pagamento começa em agora
  useEffect(() => {
    if (faturaAlvo && !faturaAlvo.paga) setDataHoraPagamento(toDatetimeLocal(new Date()))
  }, [faturaAlvo])
  const [salvando, setSalvando] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    try {
      const [p, cs, fs] = await Promise.all([
        adminApi.psicologo(id),
        adminApi.contratos(id),
        adminApi.faturas(id),
      ])
      setPsicologo(p)
      setContratos(cs)
      setFaturas(fs.faturas)
      setPrevias(fs.previas)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  // Anos com fatura fechada (desc) — alimenta o filtro; prévias ficam fora dele
  const anos = useMemo(
    () => [...new Set(faturas.map(f => Number(f.periodoFim.slice(0, 4))))].sort((a, b) => b - a),
    [faturas],
  )

  useEffect(() => {
    if (anos.length > 0 && (anoFiltro === null || !anos.includes(anoFiltro))) {
      setAnoFiltro(anos[0])
    }
  }, [anos, anoFiltro])

  const fechadasDoAno = useMemo(
    () => faturas.filter(f => Number(f.periodoFim.slice(0, 4)) === anoFiltro),
    [faturas, anoFiltro],
  )

  // Mapa contrato → valor mensal, pro rateio expandido mostrar o plano de origem
  const valorMensalPorContrato = useMemo(
    () => new Map(contratos.map(c => [c.id, c.valorMensal])),
    [contratos],
  )

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
    const f = faturaAlvo
    if (!f) return
    setSalvando(true)
    try {
      await adminApi.darBaixa(f.id, !f.paga, !f.paga ? dataHoraPagamento : undefined)
      setFaturaAlvo(null)
      setMensagemSucesso(f.paga ? 'Baixa estornada' : 'Fatura paga — situação reavaliada')
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function encerrarContrato(c: Contrato) {
    setSalvando(true)
    try {
      await adminApi.encerrarContrato(c.id)
      setMensagemSucesso(situacaoContrato(c) === 'Agendado'
        ? 'Contrato agendado removido'
        : 'Contrato encerrado no fechamento do ciclo corrente')
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

  const cardsx = { p: 2, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }
  const previaAtual = previas[0] ?? null

  return (
    <Stack spacing={2}>
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
                ? <Chip size="small"
                        label={psicologo.bloqueadaMotivo === 'INADIMPLENCIA'
                          ? 'Bloqueado — inadimplência' : 'Bloqueado'}
                        color="error" sx={{ fontWeight: 600 }} />
                : <Chip size="small" label="Ativo" color="success" variant="outlined" sx={{ fontWeight: 600 }} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {psicologo.email} · {psicologo.crp} · fechamento dia {psicologo.diaFechamento} ·
              {' '}cliente desde {dataLocal(psicologo.criadoEm)}
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
              Contrato vigente
            </Typography>
            {psicologo.contratoVigente ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {brl(psicologo.contratoVigente.valorMensal)}
                  <Typography component="span" variant="body2" color="text.secondary">/mês</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {vigencia(psicologo.contratoVigente)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="error.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                sem contrato vigente
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.error.main}` }}>
            <Typography variant="caption" sx={{
              color: 'error.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Vencido
            </Typography>
            <Typography variant="h6" sx={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: psicologo.totalVencido > 0 ? 'error.main' : 'text.primary',
            }}>
              {brl(psicologo.totalVencido)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {psicologo.faturasVencidas} fatura{psicologo.faturasVencidas === 1 ? '' : 's'} vencida{psicologo.faturasVencidas === 1 ? '' : 's'}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ ...cardsx, borderLeft: `3px solid ${theme.palette.info.main}` }}>
            <Typography variant="caption" sx={{
              color: 'info.main', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Fatura atual
            </Typography>
            {previaAtual ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {brl(previaAtual.valor)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  fecha em {dataLocal(previaAtual.periodoFim)} · vence {dataLocal(previaAtual.vencimento)}
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="text.disabled" sx={{ mt: 0.5 }}>
                sem fatura em curso
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Faturas — competência por mês; detalhes só no expandir */}
      <Paper variant="outlined" sx={cardsx}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Faturas
          </Typography>
          {anos.map(ano => (
            <Chip
              key={ano}
              size="small"
              label={ano}
              clickable
              color={ano === anoFiltro ? 'primary' : 'default'}
              variant={ano === anoFiltro ? 'filled' : 'outlined'}
              onClick={() => setAnoFiltro(ano)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
        {faturas.length === 0 && previas.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhuma fatura ainda — crie um contrato pra iniciar a cobrança.
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {/* Ordem estritamente cronológica desc: próxima → atual → fechadas */}
            {[...previas].reverse().map((p, i) => {
              const chave = `previa-${p.periodoFim}`
              const aberta = itensAbertos === chave
              const rotulo = i === [...previas].length - 1 ? 'Fatura atual' : 'Próxima fatura'
              return (
                <Box key={chave}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                    <ButtonBase
                      onClick={() => setItensAbertos(aberta ? null : chave)}
                      aria-expanded={aberta}
                      sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1, borderRadius: 1 }}
                    >
                      <ExpandMoreIcon sx={{
                        fontSize: 18, color: 'text.disabled',
                        transform: aberta ? 'rotate(180deg)' : 'none',
                        transition: theme.transitions.create('transform', {
                          duration: theme.transitions.duration.short,
                        }),
                      }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.8 }}>
                        {competencia(p.periodoFim)}
                      </Typography>
                    </ButtonBase>
                    <Typography variant="body2" sx={{
                      fontWeight: 600, fontVariantNumeric: 'tabular-nums', opacity: 0.8,
                    }}>
                      {brl(p.valor)}
                    </Typography>
                    <Chip size="small" label={rotulo} variant="outlined" color="info"
                          sx={{ height: 22, fontSize: 11, fontWeight: 600, borderStyle: 'dashed' }} />
                  </Stack>
                  <Collapse in={aberta}>
                    <DetalheFatura
                      periodo={`${dataLocal(p.periodoInicio)} → ${dataLocal(p.periodoFim)}`}
                      vencimento={`${dataLocal(p.vencimento)} (previsto)`}
                      pagamento={null}
                      itens={p.itens}
                      valorMensalPorContrato={valorMensalPorContrato}
                    />
                  </Collapse>
                </Box>
              )
            })}
            {fechadasDoAno.map(f => {
              const chip = CHIP_STATUS[f.status]
              const aberta = itensAbertos === f.id
              return (
                <Box key={f.id}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                    <ButtonBase
                      onClick={() => setItensAbertos(aberta ? null : f.id)}
                      aria-expanded={aberta}
                      sx={{ flexGrow: 1, minWidth: 0, justifyContent: 'flex-start', gap: 1, borderRadius: 1 }}
                    >
                      <ExpandMoreIcon sx={{
                        fontSize: 18, color: 'text.disabled',
                        transform: aberta ? 'rotate(180deg)' : 'none',
                        transition: theme.transitions.create('transform', {
                          duration: theme.transitions.duration.short,
                        }),
                      }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {competencia(f.periodoFim)}
                      </Typography>
                    </ButtonBase>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {brl(f.valor)}
                    </Typography>
                    <Chip size="small" label={chip.rotulo} color={chip.cor}
                          variant={f.status === 'VENCIDA' ? 'filled' : 'outlined'}
                          sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                    {f.valor > 0 && (
                      <Button
                        size="small"
                        variant={f.paga ? 'text' : 'outlined'}
                        color={f.paga ? 'inherit' : 'success'}
                        disabled={salvando}
                        onClick={() => setFaturaAlvo(f)}
                        sx={{ borderRadius: 999, minWidth: 92, fontSize: 12, flexShrink: 0 }}
                      >
                        {f.paga ? 'Estornar' : 'Dar baixa'}
                      </Button>
                    )}
                  </Stack>
                  <Collapse in={aberta}>
                    <DetalheFatura
                      periodo={`${dataLocal(f.periodoInicio)} → ${dataLocal(f.periodoFim)}`}
                      vencimento={dataLocal(f.vencimento)}
                      pagamento={f.paga && f.pagaEm ? dataHoraLocal(f.pagaEm) : null}
                      itens={f.itens}
                      valorMensalPorContrato={valorMensalPorContrato}
                    />
                  </Collapse>
                </Box>
              )
            })}
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
            size="small" variant="contained" startIcon={<AddIcon />}
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
            {contratos.map(c => {
              const situacao = situacaoContrato(c)
              return (
                <Stack key={c.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1 }}>
                  <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {brl(c.valorMensal)}/mês
                      {c.valorMensal === 0 && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}(cortesia)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {vigencia(c)}
                    </Typography>
                  </Stack>
                  <Chip size="small" label={situacao}
                        color={situacao === 'Vigente' ? 'success' : situacao === 'Agendado' ? 'info' : 'default'}
                        variant="outlined" sx={{ height: 22, fontSize: 11, fontWeight: 600 }} />
                  {situacao !== 'Encerrado' && (
                    <Button size="small" color="error" disabled={salvando}
                            onClick={() => encerrarContrato(c)}
                            sx={{ borderRadius: 999, fontSize: 12 }}>
                      {situacao === 'Agendado' ? 'Remover' : 'Encerrar'}
                    </Button>
                  )}
                </Stack>
              )
            })}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Encerrar vale até o fechamento do ciclo corrente (fatura final cheia).
        </Typography>
      </Paper>

      {/* Confirmação de baixa/estorno */}
      <Dialog open={faturaAlvo !== null} onClose={() => setFaturaAlvo(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {faturaAlvo?.paga ? 'Estornar baixa' : 'Confirmar pagamento'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {faturaAlvo?.paga ? 'Estornar a baixa da fatura de ' : 'Dar baixa na fatura de '}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {faturaAlvo ? `${dataLocal(faturaAlvo.periodoInicio)} → ${dataLocal(faturaAlvo.periodoFim)}` : ''}
            </Box>
            {' '}no valor de{' '}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {faturaAlvo ? brl(faturaAlvo.valor) : ''}
            </Box>?
            {!faturaAlvo?.paga && psicologo.bloqueadaMotivo === 'INADIMPLENCIA' && (
              <> Se a situação regularizar, o bloqueio automático será desfeito.</>
            )}
          </Typography>
          {!faturaAlvo?.paga && (
            <TextField
              fullWidth label="Data e hora do pagamento" type="datetime-local" required
              slotProps={{ inputLabel: { shrink: true } }}
              value={dataHoraPagamento}
              onChange={e => setDataHoraPagamento(e.target.value)}
              sx={{ mt: 2.5 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFaturaAlvo(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={faturaAlvo?.paga ? 'inherit' : 'success'}
            disabled={salvando || (!faturaAlvo?.paga && !dataHoraPagamento)}
            onClick={confirmarBaixa}
          >
            {salvando ? 'Salvando…' : faturaAlvo?.paga ? 'Estornar' : 'Dar baixa'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmação de bloqueio */}
      <Dialog open={confirmandoBloqueio} onClose={() => setConfirmandoBloqueio(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{psicologo.bloqueada ? 'Desbloquear acesso' : 'Bloquear acesso'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {psicologo.bloqueada
              ? `Desbloquear o acesso de ${psicologo.nomeCompleto}? Atenção: se a situação seguir irregular (fatura vencida ou sem contrato vigente), o próximo login bloqueia de novo automaticamente.`
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
