import { Box, Stack, Typography, Chip, ButtonBase, Avatar, Tooltip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import UpcomingIcon from '@mui/icons-material/Upcoming'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined'
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import BarChartIcon from '@mui/icons-material/BarChart'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import type { DashboardData } from '../api/dashboard'
import type { WidgetDef } from './types'
import { formatarHora } from '../utils/datas'

// ────────── Utils ──────────
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('')

const DIAS_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ────────── Componentes auxiliares ──────────

function WidgetHeader({ icon, cor, fundoCor, titulo }: {
  icon: React.ReactNode
  cor: string
  fundoCor: string
  titulo: string
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: 1.5,
        bgcolor: fundoCor, color: cor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {titulo}
      </Typography>
    </Stack>
  )
}

function Numero({ valor, sufixo }: { valor: string | number; sufixo?: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
      <Typography variant="h4" sx={{
        fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
      }}>
        {valor}
      </Typography>
      {sufixo && (
        <Typography variant="body2" color="text.secondary">{sufixo}</Typography>
      )}
    </Stack>
  )
}

function DeltaCompacto({ atual, anterior }: { atual: number; anterior: number }) {
  const theme = useTheme()
  if (anterior === 0 && atual === 0) {
    return <Typography variant="caption" color="text.secondary">sem registro anterior</Typography>
  }
  if (anterior === 0) {
    return <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>novo período</Typography>
  }
  const delta = ((atual - anterior) / anterior) * 100
  const dir = Math.abs(delta) < 0.5 ? 'flat' : delta > 0 ? 'up' : 'down'
  const cor = dir === 'up'
    ? theme.palette.success.main
    : dir === 'down'
      ? theme.palette.error.main
      : theme.palette.text.secondary
  const Icone = dir === 'up' ? TrendingUpIcon : dir === 'down' ? TrendingDownIcon : TrendingFlatIcon
  const sinal = delta > 0 ? '+' : ''
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Icone sx={{ fontSize: 14, color: cor }} />
      <Typography variant="caption" sx={{ color: cor, fontWeight: 600 }}>
        {dir === 'flat' ? '0%' : `${sinal}${Math.round(delta)}%`}
      </Typography>
    </Stack>
  )
}

// ────────── Widgets ──────────

function HojeWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  const s = theme.palette.statusConsulta
  return (
    <>
      <WidgetHeader
        icon={<EventAvailableIcon fontSize="small" />}
        cor="primary.main"
        fundoCor={alpha(theme.palette.primary.main, 0.12)}
        titulo="Hoje"
      />
      <Numero valor={dados.hoje.total} sufixo={dados.hoje.total === 1 ? 'consulta' : 'consultas'} />
      <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
        {dados.hoje.agendadas > 0 && <Chip size="small" label={`${dados.hoje.agendadas} agend.`}
          sx={{ height: 20, fontSize: 10, bgcolor: s.agendada.bg, color: s.agendada.fg }} />}
        {dados.hoje.confirmadas > 0 && <Chip size="small" label={`${dados.hoje.confirmadas} confirm.`}
          sx={{ height: 20, fontSize: 10, bgcolor: s.confirmada.bg, color: s.confirmada.fg }} />}
        {dados.hoje.realizadas > 0 && <Chip size="small" label={`${dados.hoje.realizadas} realiz.`}
          sx={{ height: 20, fontSize: 10, bgcolor: s.realizada.bg, color: s.realizada.fg }} />}
        {dados.hoje.faltas > 0 && <Chip size="small" label={`${dados.hoje.faltas} falta${dados.hoje.faltas === 1 ? '' : 's'}`}
          sx={{ height: 20, fontSize: 10, bgcolor: s.falta.bg, color: s.falta.fg, border: `1px solid ${s.falta.border}` }} />}
        {dados.hoje.total === 0 && (
          <Typography variant="caption" color="text.secondary">Nenhum atendimento marcado</Typography>
        )}
      </Stack>
    </>
  )
}

function MesWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<EventNoteIcon fontSize="small" />}
        cor="info.main"
        fundoCor={alpha(theme.palette.info.main, 0.12)}
        titulo="Este mês"
      />
      <Numero valor={dados.mes.total} sufixo={dados.mes.total === 1 ? 'consulta' : 'consultas'} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
        {dados.mes.realizadas} realizada{dados.mes.realizadas === 1 ? '' : 's'} ·{' '}
        {dados.mes.agendadas + dados.mes.confirmadas} próxima{(dados.mes.agendadas + dados.mes.confirmadas) === 1 ? '' : 's'}
      </Typography>
    </>
  )
}

function RecebidoWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<AttachMoneyIcon fontSize="small" />}
        cor="success.main"
        fundoCor={alpha(theme.palette.success.main, 0.12)}
        titulo="Recebido no mês"
      />
      <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {brl(dados.mes.faturamentoPago)}
      </Typography>
      {dados.mes.faturamentoPendente > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
            {brl(dados.mes.faturamentoPendente)}
          </Box>{' '}a receber
        </Typography>
      ) : dados.mes.faturamentoRealizado > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Tudo em dia
        </Typography>
      ) : null}
    </>
  )
}

function ComparativoWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<CompareArrowsIcon fontSize="small" />}
        cor="text.primary"
        fundoCor={alpha(theme.palette.text.primary, 0.08)}
        titulo="vs mês anterior"
      />
      <Stack spacing={1.5} sx={{ mt: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Consultas</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {dados.mes.total}
            </Typography>
          </Box>
          <DeltaCompacto atual={dados.mes.total} anterior={dados.comparativo.consultasMesAnterior} />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Faturamento</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {brl(dados.mes.faturamentoRealizado)}
            </Typography>
          </Box>
          <DeltaCompacto atual={dados.mes.faturamentoRealizado} anterior={dados.comparativo.faturamentoMesAnterior} />
        </Stack>
      </Stack>
    </>
  )
}

function TaxaWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<CheckCircleIcon fontSize="small" />}
        cor="warning.main"
        fundoCor={alpha(theme.palette.warning.main, 0.12)}
        titulo="Comparecimento"
      />
      <Numero valor={pct(dados.mes.taxaComparecimento)} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
        {dados.mes.realizadas} realizada{dados.mes.realizadas === 1 ? '' : 's'} ·{' '}
        {dados.mes.faltas} falta{dados.mes.faltas === 1 ? '' : 's'}
      </Typography>
    </>
  )
}

function FuturasWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<UpcomingIcon fontSize="small" />}
        cor="primary.main"
        fundoCor={alpha(theme.palette.primary.main, 0.12)}
        titulo="Consultas futuras agendadas"
      />
      <Numero valor={dados.consultasFuturasAgendadas} sufixo={dados.consultasFuturasAgendadas === 1 ? 'consulta' : 'consultas'} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
        agendadas ou confirmadas a partir de agora
      </Typography>
    </>
  )
}

function PacientesWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<PeopleOutlineIcon fontSize="small" />}
        cor="info.main"
        fundoCor={alpha(theme.palette.info.main, 0.12)}
        titulo="Pacientes ativos"
      />
      <Numero valor={dados.pacientes.ativos} sufixo={dados.pacientes.ativos === 1 ? 'pessoa' : 'pessoas'} />
    </>
  )
}

function NovosPacientesWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  return (
    <>
      <WidgetHeader
        icon={<PersonAddIcon fontSize="small" />}
        cor="success.main"
        fundoCor={alpha(theme.palette.success.main, 0.12)}
        titulo="Novos no mês"
      />
      <Numero valor={dados.pacientes.novosNoMes} sufixo={dados.pacientes.novosNoMes === 1 ? 'paciente' : 'pacientes'} />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
        cadastrados neste mês
      </Typography>
    </>
  )
}

function Proximos7DiasWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  const max = Math.max(1, ...dados.proximos7Dias.map(d => d.total))
  return (
    <>
      <WidgetHeader
        icon={<BarChartIcon fontSize="small" />}
        cor="primary.main"
        fundoCor={alpha(theme.palette.primary.main, 0.12)}
        titulo="Próximos 7 dias"
      />
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        height: 90, gap: 0.5, mt: 1,
      }}>
        {dados.proximos7Dias.map((d, i) => {
          const date = new Date(d.dia + 'T00:00:00')
          const ehHoje = i === 0
          const altura = (d.total / max) * 100
          return (
            <Tooltip key={d.dia} title={`${d.total} consulta${d.total === 1 ? '' : 's'}`} placement="top">
              <Stack sx={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 0.5 }}>
                <Typography variant="caption" sx={{
                  fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 9,
                  color: d.total > 0 ? 'text.primary' : 'text.disabled',
                  height: 12,
                }}>
                  {d.total > 0 ? d.total : ''}
                </Typography>
                <Box sx={{
                  width: '100%',
                  height: `${Math.max(altura, d.total > 0 ? 8 : 4)}%`,
                  minHeight: 4,
                  bgcolor: ehHoje ? 'primary.main' : alpha(theme.palette.primary.main, 0.4),
                  borderRadius: 0.75,
                }} />
                <Typography variant="caption" sx={{
                  fontWeight: ehHoje ? 700 : 500,
                  color: ehHoje ? 'primary.main' : 'text.secondary',
                  fontSize: 9,
                }}>
                  {DIAS_CURTO[date.getDay()]}
                </Typography>
              </Stack>
            </Tooltip>
          )
        })}
      </Box>
    </>
  )
}

function ProximasConsultasWidget({ dados }: { dados: DashboardData }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const s = theme.palette.statusConsulta
  const lista = dados.proximasConsultas.slice(0, 3)
  return (
    <>
      <WidgetHeader
        icon={<FormatListBulletedIcon fontSize="small" />}
        cor="primary.main"
        fundoCor={alpha(theme.palette.primary.main, 0.12)}
        titulo="Próximas consultas"
      />
      {lista.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Nenhuma agendada
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {lista.map(c => {
            const d = new Date(c.inicio)
            const ehHoje = d.toDateString() === new Date().toDateString()
            const cor = s[c.status.toLowerCase() as keyof typeof s]
            return (
              <ButtonBase
                key={c.id}
                onClick={() => navigate('/agenda')}
                sx={{
                  width: '100%', p: 0.75, borderRadius: 1.5,
                  borderLeft: `3px solid ${cor.bg}`,
                  bgcolor: alpha(theme.palette.divider, 0.15),
                  display: 'flex', alignItems: 'center', gap: 1, textAlign: 'left',
                }}
              >
                <Avatar sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                  {iniciais(c.pacienteNome)}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="caption" noWrap sx={{ fontWeight: 600, display: 'block', fontSize: 11 }}>
                    {c.pacienteNome}
                  </Typography>
                  <Typography variant="caption" color="text.secondary"
                              sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
                    {ehHoje ? `Hoje, ${formatarHora(d)}` : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' · ' + formatarHora(d)}
                  </Typography>
                </Box>
              </ButtonBase>
            )
          })}
        </Stack>
      )}
    </>
  )
}

// ────────── Catálogo ──────────

// eslint-disable-next-line react-refresh/only-export-components
export const WIDGETS: WidgetDef[] = [
  { id: 'hoje', titulo: 'Hoje', descricao: 'Consultas marcadas para hoje com breakdown por status', Render: HojeWidget, defaultAtivo: true },
  { id: 'mes', titulo: 'Este mês', descricao: 'Total de consultas no mês corrente', Render: MesWidget, defaultAtivo: true },
  { id: 'recebido', titulo: 'Recebido no mês', descricao: 'Valor recebido e a receber das consultas realizadas', Render: RecebidoWidget, defaultAtivo: true },
  { id: 'futuras', titulo: 'Consultas futuras', descricao: 'Total de consultas agendadas ou confirmadas a partir de agora', Render: FuturasWidget, defaultAtivo: true },
  { id: 'proximos7Dias', titulo: 'Próximos 7 dias', descricao: 'Distribuição de consultas pelos próximos dias', Render: Proximos7DiasWidget, defaultAtivo: true },
  { id: 'proximasConsultas', titulo: 'Próximas consultas', descricao: 'Lista das próximas 3 consultas', Render: ProximasConsultasWidget, defaultAtivo: true },
  { id: 'comparativo', titulo: 'Comparativo mensal', descricao: 'Consultas e faturamento vs mês anterior', Render: ComparativoWidget, defaultAtivo: false },
  { id: 'taxa', titulo: 'Taxa de comparecimento', descricao: 'Percentual de realizadas vs faltas no mês', Render: TaxaWidget, defaultAtivo: false },
  { id: 'pacientes', titulo: 'Pacientes ativos', descricao: 'Total atual de pacientes ativos', Render: PacientesWidget, defaultAtivo: false },
  { id: 'novosPacientes', titulo: 'Novos no mês', descricao: 'Pacientes cadastrados neste mês', Render: NovosPacientesWidget, defaultAtivo: false },
]

export const WIDGETS_POR_ID = new Map(WIDGETS.map(w => [w.id, w]))
