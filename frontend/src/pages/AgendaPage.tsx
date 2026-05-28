import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Paper, Box, Typography, IconButton, Button, Chip, FormControlLabel, Switch, Tooltip,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import TodayIcon from '@mui/icons-material/Today'
import { consultasApi, type Consulta } from '../api/consultas'
import {
  inicioDaSemana, addDias, mesmaData, formatarHora, formatarData,
  primeiroDiaUtilDoMes, formatarMes,
} from '../utils/datas'
import ConsultaDialog from '../components/ConsultaDialog'

const HORA_INICIO = 7
const HORA_FIM = 21
const ALTURA_HORA = 56
const LARGURA_HORA_COL = 64
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const PREF_FDS_KEY = 'psi.agenda.ocultarFds'

const MAPA_STATUS: Record<Consulta['status'], 'agendada' | 'confirmada' | 'realizada' | 'falta'> = {
  AGENDADA: 'agendada',
  CONFIRMADA: 'confirmada',
  REALIZADA: 'realizada',
  FALTA: 'falta',
}

export default function AgendaPage() {
  const theme = useTheme()
  const status = theme.palette.statusConsulta
  const divider = theme.palette.divider
  const dividerSubtle = alpha(theme.palette.divider, 0.5)
  const tintHoje = alpha(theme.palette.primary.main, 0.04)
  const tintHoverSlot = alpha(theme.palette.primary.main, 0.08)

  const [segunda, setSegunda] = useState(() => inicioDaSemana(new Date()))
  const [mesRef, setMesRef] = useState(() => {
    const h = new Date()
    return { year: h.getFullYear(), month: h.getMonth() }
  })
  const [ocultarFds, setOcultarFds] = useState(() =>
    localStorage.getItem(PREF_FDS_KEY) === '1')
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [consultaSelecionada, setConsultaSelecionada] = useState<Consulta | null>(null)
  const [inicioPadrao, setInicioPadrao] = useState<Date | undefined>()

  useEffect(() => {
    localStorage.setItem(PREF_FDS_KEY, ocultarFds ? '1' : '0')
  }, [ocultarFds])

  const dias = useMemo(() => {
    const total = ocultarFds ? 5 : 7
    return Array.from({ length: total }, (_, i) => addDias(segunda, i))
  }, [segunda, ocultarFds])

  const ultimoDia = dias[dias.length - 1]
  const intervaloFim = useMemo(() => addDias(segunda, 6), [segunda])

  const carregar = useCallback(async () => {
    const lista = await consultasApi.listar(segunda, intervaloFim)
    setConsultas(lista)
  }, [segunda, intervaloFim])

  useEffect(() => { carregar() }, [carregar])

  function consultasNoDia(dia: Date): Consulta[] {
    return consultas.filter(c => mesmaData(new Date(c.inicio), dia))
  }

  function onClicarHora(dia: Date, hora: number) {
    const d = new Date(dia)
    d.setHours(hora, 0, 0, 0)
    setInicioPadrao(d)
    setConsultaSelecionada(null)
    setDialogAberto(true)
  }

  function onClicarConsulta(c: Consulta) {
    setConsultaSelecionada(c)
    setInicioPadrao(undefined)
    setDialogAberto(true)
  }

  function topoEAltura(c: Consulta) {
    const ini = new Date(c.inicio)
    const minutos = ini.getHours() * 60 + ini.getMinutes() - HORA_INICIO * 60
    const top = (minutos / 60) * ALTURA_HORA
    const altura = (c.duracaoMinutos / 60) * ALTURA_HORA
    return { top, altura }
  }

  function pularMes(delta: number) {
    const total = mesRef.year * 12 + mesRef.month + delta
    const year = Math.floor(total / 12)
    const month = total - year * 12
    setMesRef({ year, month })
    const primeiro = primeiroDiaUtilDoMes(year, month)
    setSegunda(inicioDaSemana(primeiro))
  }

  function navegarSemana(delta: number) {
    const nova = addDias(segunda, delta * 7)
    setSegunda(nova)
    // sincroniza mês de referência com a quinta-feira da nova semana
    const ref = addDias(nova, 3)
    setMesRef({ year: ref.getFullYear(), month: ref.getMonth() })
  }

  function irParaHoje() {
    const h = new Date()
    setSegunda(inicioDaSemana(h))
    setMesRef({ year: h.getFullYear(), month: h.getMonth() })
  }

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const hoje = new Date()
  const mesReferencia = new Date(mesRef.year, mesRef.month, 1)

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Semana de {formatarData(segunda)} a {formatarData(ultimoDia)}
        </Typography>

        <Tooltip title="Mês anterior (semana do 1º dia útil)">
          <IconButton aria-label="Mês anterior" onClick={() => pularMes(-1)}>
            <KeyboardDoubleArrowLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" sx={{ minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>
          {formatarMes(mesReferencia)}
        </Typography>
        <Tooltip title="Próximo mês (semana do 1º dia útil)">
          <IconButton aria-label="Próximo mês" onClick={() => pularMes(1)}>
            <KeyboardDoubleArrowRightIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ borderLeft: `1px solid ${divider}`, height: 24, mx: 1 }} />

        <IconButton aria-label="Semana anterior" onClick={() => navegarSemana(-1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Button startIcon={<TodayIcon />} onClick={irParaHoje}>Hoje</Button>
        <IconButton aria-label="Próxima semana" onClick={() => navegarSemana(1)}>
          <ChevronRightIcon />
        </IconButton>

        <Button variant="contained" sx={{ ml: 2 }} onClick={() => {
          const d = new Date()
          d.setMinutes(0, 0, 0)
          setInicioPadrao(d)
          setConsultaSelecionada(null)
          setDialogAberto(true)
        }}>Nova consulta</Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FormControlLabel
          control={<Switch checked={ocultarFds}
                           onChange={e => setOcultarFds(e.target.checked)} />}
          label="Ocultar fim de semana" />
      </Box>

      <Box sx={{ display: 'flex', borderTop: `1px solid ${divider}` }}>
        <Box sx={{ width: LARGURA_HORA_COL, flexShrink: 0 }}>
          <Box sx={{ height: 40, borderBottom: `1px solid ${divider}` }} />
          {horas.map(h => (
            <Box key={h} sx={{
              height: ALTURA_HORA, borderBottom: `1px solid ${dividerSubtle}`,
              pr: 1, textAlign: 'right',
              fontSize: 12, color: 'text.secondary',
            }}>
              {String(h).padStart(2, '0')}:00
            </Box>
          ))}
        </Box>

        {dias.map((dia, idx) => (
          <Box key={idx} sx={{
            flex: 1, borderLeft: `1px solid ${divider}`, position: 'relative',
            bgcolor: mesmaData(dia, hoje) ? tintHoje : 'transparent',
          }}>
            <Box sx={{
              height: 40, borderBottom: `1px solid ${divider}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontWeight: mesmaData(dia, hoje) ? 700 : 500,
            }}>
              <Typography variant="caption">{DIAS_SEMANA[idx]}</Typography>
              <Typography variant="body2">{formatarData(dia)}</Typography>
            </Box>
            {horas.map(h => (
              <Box key={h}
                   onClick={() => onClicarHora(dia, h)}
                   sx={{
                     height: ALTURA_HORA, borderBottom: `1px solid ${dividerSubtle}`,
                     cursor: 'pointer', '&:hover': { bgcolor: tintHoverSlot },
                   }} />
            ))}
            {consultasNoDia(dia).map(c => {
              const { top, altura } = topoEAltura(c)
              const cor = status[MAPA_STATUS[c.status]]
              return (
                <Box key={c.id}
                     onClick={e => { e.stopPropagation(); onClicarConsulta(c) }}
                     sx={{
                       position: 'absolute', left: 4, right: 4,
                       top: 40 + top, height: Math.max(altura - 2, 18),
                       bgcolor: cor.bg, color: cor.fg,
                       border: `1px solid ${cor.border}`,
                       borderRadius: 1, px: 0.75, py: 0.25,
                       fontSize: 11, lineHeight: 1.2, overflow: 'hidden',
                       cursor: 'pointer', boxShadow: 1,
                     }}>
                  <Box sx={{ fontWeight: 700 }}>{formatarHora(new Date(c.inicio))} {c.pacienteNome}</Box>
                  {c.pago && <Chip size="small" label="pago" sx={{
                    height: 14, fontSize: 9, mt: 0.25,
                    bgcolor: alpha(cor.fg, 0.18), color: cor.fg,
                  }} />}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>

      <ConsultaDialog
        aberto={dialogAberto}
        consulta={consultaSelecionada}
        inicioPadrao={inicioPadrao}
        onFechar={() => setDialogAberto(false)}
        onSalvo={carregar}
      />
    </Paper>
  )
}
