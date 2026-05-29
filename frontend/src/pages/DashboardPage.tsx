import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack, Box, Paper, Typography, Button, Grid, Skeleton, Chip,
  IconButton, ButtonBase, Avatar, Tooltip,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import EventNoteIcon from '@mui/icons-material/EventNote'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import { dashboardApi, type DashboardData } from '../api/dashboard'
import { useAuth } from '../auth/authContext'
import { formatarHora } from '../utils/datas'

function saudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataLonga(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number | null): string {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

function deltaPct(atual: number, anterior: number): { dir: 'up' | 'down' | 'flat'; valor: string } {
  if (anterior === 0) {
    if (atual === 0) return { dir: 'flat', valor: '—' }
    return { dir: 'up', valor: 'novo' }
  }
  const delta = ((atual - anterior) / anterior) * 100
  if (Math.abs(delta) < 0.5) return { dir: 'flat', valor: '0%' }
  const sinal = delta > 0 ? '+' : ''
  return {
    dir: delta > 0 ? 'up' : 'down',
    valor: `${sinal}${Math.round(delta)}%`,
  }
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
}

const DIAS_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { psicologa } = useAuth()
  const [dados, setDados] = useState<DashboardData | null>(null)

  const carregar = useCallback(async () => {
    const d = await dashboardApi.get()
    setDados(d)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const status = theme.palette.statusConsulta

  // Maior valor para escala do gráfico
  const maxProximos7 = useMemo(() => {
    if (!dados) return 1
    return Math.max(1, ...dados.proximos7Dias.map(d => d.total))
  }, [dados])

  if (!dados) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={300} height={48} />
        <Skeleton variant="text" width={220} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={240} />
      </Stack>
    )
  }

  const primeiroNome = psicologa?.nomeCompleto.split(' ')[0] ?? ''
  const deltaConsultas = deltaPct(dados.mes.total, dados.comparativo.consultasMesAnterior)
  const deltaFaturamento = deltaPct(
    dados.mes.faturamentoRealizado,
    dados.comparativo.faturamentoMesAnterior,
  )

  return (
    <Stack spacing={3}>
      {/* Header com saudação */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {dataLonga()}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {saudacao()}, {primeiroNome || 'Dra.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<EventNoteIcon />}
            onClick={() => navigate('/agenda')}
            sx={{ borderRadius: 999 }}
          >
            Agenda
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pacientes')}
            sx={{ borderRadius: 999 }}
          >
            Novo paciente
          </Button>
        </Stack>
      </Stack>

      {/* 4 stat cards */}
      <Grid container spacing={2}>
        <StatCard
          icon={<EventAvailableIcon />}
          corIcone="primary.main"
          fundoIcone={alpha(theme.palette.primary.main, 0.1)}
          titulo="Atendimentos hoje"
          valor={dados.hoje.total}
          extra={
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
              {dados.hoje.agendadas > 0 && (
                <Chip size="small" label={`${dados.hoje.agendadas} agendada${dados.hoje.agendadas === 1 ? '' : 's'}`}
                      sx={{ height: 22, bgcolor: status.agendada.bg, color: status.agendada.fg }} />
              )}
              {dados.hoje.confirmadas > 0 && (
                <Chip size="small" label={`${dados.hoje.confirmadas} confirmada${dados.hoje.confirmadas === 1 ? '' : 's'}`}
                      sx={{ height: 22, bgcolor: status.confirmada.bg, color: status.confirmada.fg }} />
              )}
              {dados.hoje.realizadas > 0 && (
                <Chip size="small" label={`${dados.hoje.realizadas} realizada${dados.hoje.realizadas === 1 ? '' : 's'}`}
                      sx={{ height: 22, bgcolor: status.realizada.bg, color: status.realizada.fg }} />
              )}
              {dados.hoje.faltas > 0 && (
                <Chip size="small" label={`${dados.hoje.faltas} falta${dados.hoje.faltas === 1 ? '' : 's'}`}
                      sx={{
                        height: 22,
                        bgcolor: status.falta.bg,
                        color: status.falta.fg,
                        border: `1px solid ${status.falta.border}`,
                      }} />
              )}
              {dados.hoje.total === 0 && (
                <Typography variant="caption" color="text.secondary">
                  Nenhum atendimento marcado
                </Typography>
              )}
            </Stack>
          }
        />

        <StatCard
          icon={<EventNoteIcon />}
          corIcone="info.main"
          fundoIcone={alpha(theme.palette.info.main, 0.1)}
          titulo="Atendimentos no mês"
          valor={dados.mes.total}
          extra={<DeltaIndicador {...deltaConsultas} legenda="vs mês anterior" />}
        />

        <StatCard
          icon={<AttachMoneyIcon />}
          corIcone="success.main"
          fundoIcone={alpha(theme.palette.success.main, 0.1)}
          titulo="Faturamento (realizadas)"
          valor={brl(dados.mes.faturamentoRealizado)}
          valorTipo="texto"
          extra={
            <Stack spacing={0.25}>
              <DeltaIndicador {...deltaFaturamento} legenda="vs mês anterior" />
              <Typography variant="caption" color="text.secondary">
                {brl(dados.mes.faturamentoPago)} pago ·{' '}
                <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
                  {brl(dados.mes.faturamentoPendente)} pendente
                </Box>
              </Typography>
            </Stack>
          }
        />

        <StatCard
          icon={<CheckCircleIcon />}
          corIcone="warning.main"
          fundoIcone={alpha(theme.palette.warning.main, 0.1)}
          titulo="Taxa de comparecimento"
          valor={pct(dados.mes.taxaComparecimento)}
          valorTipo="texto"
          extra={
            <Typography variant="caption" color="text.secondary">
              {dados.mes.realizadas} realizada{dados.mes.realizadas === 1 ? '' : 's'} ·{' '}
              {dados.mes.faltas} falta{dados.mes.faltas === 1 ? '' : 's'}
            </Typography>
          }
        />
      </Grid>

      {/* Linha 2: Próximas consultas + chart 7 dias */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{
            p: 2.5, boxShadow: 'none',
            border: `1px solid ${theme.palette.divider}`, height: '100%',
          }}>
            <Stack direction="row" sx={{ alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                Próximas consultas
              </Typography>
              <Button
                size="small"
                endIcon={<ChevronRightIcon />}
                onClick={() => navigate('/agenda')}
              >
                Ver agenda
              </Button>
            </Stack>
            {dados.proximasConsultas.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Nenhuma consulta agendada nos próximos dias.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {dados.proximasConsultas.map(c => {
                  const d = new Date(c.inicio)
                  const ehHoje = d.toDateString() === new Date().toDateString()
                  const cor = status[c.status.toLowerCase() as keyof typeof status]
                  return (
                    <ButtonBase
                      key={c.id}
                      onClick={() => navigate('/agenda')}
                      sx={{
                        width: '100%',
                        p: 1.25,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        borderLeft: `4px solid ${cor.bg}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        textAlign: 'left',
                        bgcolor: 'background.paper',
                        transition: theme.transitions.create(['background-color', 'box-shadow'], {
                          duration: theme.transitions.duration.short,
                        }),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          boxShadow: theme.shadows[1],
                        },
                      }}
                    >
                      <Avatar sx={{
                        width: 36, height: 36, fontSize: 13, fontWeight: 600,
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                        flexShrink: 0,
                      }}>
                        {iniciais(c.pacienteNome)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                          {c.pacienteNome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary"
                                    sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {ehHoje
                            ? `Hoje, ${formatarHora(d)}`
                            : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                              + ', ' + formatarHora(d)}
                          {' · '}{c.duracaoMinutos}min
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={c.status.toLowerCase()}
                        sx={{
                          height: 22,
                          textTransform: 'capitalize',
                          bgcolor: cor.bg, color: cor.fg,
                          fontWeight: 600,
                        }}
                      />
                    </ButtonBase>
                  )
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{
            p: 2.5, boxShadow: 'none',
            border: `1px solid ${theme.palette.divider}`, height: '100%',
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Próximos 7 dias
            </Typography>
            <Box sx={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: 140,
              gap: 0.5,
            }}>
              {dados.proximos7Dias.map((d, i) => {
                const date = new Date(d.dia + 'T00:00:00')
                const ehHoje = i === 0
                const altura = (d.total / maxProximos7) * 100
                return (
                  <Tooltip
                    key={d.dia}
                    title={`${d.total} consulta${d.total === 1 ? '' : 's'}`}
                    placement="top"
                  >
                    <Stack sx={{
                      flex: 1, alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                    }}>
                      <Typography variant="caption" sx={{
                        fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 10,
                        color: d.total > 0 ? 'text.primary' : 'text.disabled',
                        height: 14,
                      }}>
                        {d.total > 0 ? d.total : ''}
                      </Typography>
                      <Box sx={{
                        width: '100%',
                        height: `${Math.max(altura, d.total > 0 ? 8 : 4)}%`,
                        minHeight: 4,
                        bgcolor: ehHoje
                          ? 'primary.main'
                          : alpha(theme.palette.primary.main, 0.4),
                        borderRadius: 1,
                        transition: theme.transitions.create('background-color', {
                          duration: theme.transitions.duration.short,
                        }),
                      }} />
                      <Typography variant="caption" sx={{
                        fontWeight: ehHoje ? 700 : 500,
                        color: ehHoje ? 'primary.main' : 'text.secondary',
                        fontSize: 10,
                      }}>
                        {DIAS_CURTO[date.getDay()]}
                      </Typography>
                      <Typography variant="caption" sx={{
                        color: ehHoje ? 'primary.main' : 'text.disabled',
                        fontSize: 9,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {date.getDate()}
                      </Typography>
                    </Stack>
                  </Tooltip>
                )
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Linha 3: Pacientes */}
      <Paper variant="outlined" sx={{
        p: 2.5, boxShadow: 'none',
        border: `1px solid ${theme.palette.divider}`,
      }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PeopleOutlineIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {dados.pacientes.ativos} paciente{dados.pacientes.ativos === 1 ? '' : 's'} ativo{dados.pacientes.ativos === 1 ? '' : 's'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dados.pacientes.novosNoMes > 0
                  ? `+${dados.pacientes.novosNoMes} cadastrado${dados.pacientes.novosNoMes === 1 ? '' : 's'} este mês`
                  : 'Nenhum novo este mês'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => navigate('/pacientes')} aria-label="Ver pacientes">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Paper>
    </Stack>
  )
}

// ────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ReactNode
  corIcone: string
  fundoIcone: string
  titulo: string
  valor: string | number
  valorTipo?: 'numero' | 'texto'
  extra?: React.ReactNode
}

function StatCard({ icon, corIcone, fundoIcone, titulo, valor, valorTipo = 'numero', extra }: StatCardProps) {
  const theme = useTheme()
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Paper variant="outlined" sx={{
        p: 2.5, boxShadow: 'none',
        border: `1px solid ${theme.palette.divider}`, height: '100%',
      }}>
        <Stack spacing={1.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            bgcolor: fundoIcone, color: corIcone,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {titulo}
            </Typography>
            <Typography
              variant={valorTipo === 'texto' ? 'h5' : 'h4'}
              sx={{
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {valor}
            </Typography>
          </Box>
          {extra}
        </Stack>
      </Paper>
    </Grid>
  )
}

function DeltaIndicador({ dir, valor, legenda }: { dir: 'up' | 'down' | 'flat'; valor: string; legenda: string }) {
  const theme = useTheme()
  const cor = dir === 'up'
    ? theme.palette.success.main
    : dir === 'down'
      ? theme.palette.error.main
      : theme.palette.text.secondary
  const Icone = dir === 'up' ? TrendingUpIcon : dir === 'down' ? TrendingDownIcon : TrendingFlatIcon
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Icone sx={{ fontSize: 16, color: cor }} />
      <Typography variant="caption" sx={{ color: cor, fontWeight: 600 }}>
        {valor}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {legenda}
      </Typography>
    </Stack>
  )
}
