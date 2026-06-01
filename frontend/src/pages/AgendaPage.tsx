import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Paper, Box, Stack, Typography, IconButton, Button, Chip, Tooltip,
  ToggleButton, ButtonBase, useMediaQuery, Snackbar, Alert,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import TodayIcon from '@mui/icons-material/Today'
import AddIcon from '@mui/icons-material/Add'
import WeekendIcon from '@mui/icons-material/Weekend'
import { consultasApi, type Consulta } from '../api/consultas'
import {
  inicioDaSemana, addDias, mesmaData, formatarHora, formatarData,
  primeiroDiaUtilDoMes, formatarMes, formatarDataLonga,
} from '../utils/datas'
import ConsultaDialog, { type ConsultaSalvoResultado } from '../components/ConsultaDialog'

const HORA_INICIO = 7
const HORA_FIM = 21
const ALTURA_HORA = 60
const LARGURA_HORA_COL = 64
const HEADER_DIAS = 56
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const PREF_FDS_KEY = 'psi.agenda.ocultarFds'

const MAPA_STATUS: Record<Consulta['status'], 'agendada' | 'confirmada' | 'realizada' | 'falta'> = {
  AGENDADA: 'agendada',
  CONFIRMADA: 'confirmada',
  REALIZADA: 'realizada',
  FALTA: 'falta',
  CANCELADA: 'falta', // reaproveita o token visual de "falta" (cinza/tachado)
}

function tooltipStatusConfirmacao(c: Consulta): string {
  if (c.statusConfirmacao === 'CONFIRMADA') {
    return c.confirmadaPelaPacienteEm
      ? `Confirmada pela paciente em ${new Date(c.confirmadaPelaPacienteEm).toLocaleString('pt-BR')}`
      : 'Confirmada pela paciente'
  }
  if (c.statusConfirmacao === 'CANCELADA_PELA_PACIENTE') {
    return 'Cancelada pela paciente via WhatsApp'
  }
  // AGUARDANDO — depende do estágio do lembrete
  if (!c.lembreteEnviadoEm) return 'Lembrete será enviado 1 dia antes'
  if (c.lembreteEtapa === 'AGUARDANDO_CONFIRMACAO_DUPLA') return 'Paciente iniciou confirmação'
  if (c.lembreteEtapa === 'EXPIRADO') return 'Paciente não finalizou a confirmação'
  if (c.lembreteEtapa === 'CONGELADO_POR_LOOP') return 'Confirmação cancelada após múltiplas voltas — fale com a paciente'
  return 'Aguardando confirmação da paciente'
}

function corStatusConfirmacao(
  c: Consulta,
  palette: { success: string; error: string; warning: string; muted: string },
): string {
  if (c.statusConfirmacao === 'CONFIRMADA') return palette.success
  if (c.statusConfirmacao === 'CANCELADA_PELA_PACIENTE') return palette.error
  if (c.lembreteEtapa === 'CONGELADO_POR_LOOP' || c.lembreteEtapa === 'EXPIRADO') {
    return palette.warning
  }
  return palette.muted
}

export default function AgendaPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const status = theme.palette.statusConsulta
  const divider = theme.palette.divider
  const dividerSubtle = alpha(theme.palette.divider, 0.5)
  const tintHoje = alpha(theme.palette.primary.main, 0.04)
  const tintHoverSlot = alpha(theme.palette.primary.main, 0.06)

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
  const [agora, setAgora] = useState(() => new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date())
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // tick a cada 60s pra mover o indicador "agora"
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  function ajustarDiaSelecionado(novaSegunda: Date) {
    // Mantém o offset do dia da semana atual; senão usa segunda
    const h = new Date()
    const hojeNaSemana = h >= novaSegunda && h < addDias(novaSegunda, 7)
    if (hojeNaSemana) {
      setDiaSelecionado(h)
    } else {
      setDiaSelecionado(novaSegunda)
    }
  }

  function pularMes(delta: number) {
    const total = mesRef.year * 12 + mesRef.month + delta
    const year = Math.floor(total / 12)
    const month = total - year * 12
    setMesRef({ year, month })
    const primeiro = primeiroDiaUtilDoMes(year, month)
    const nova = inicioDaSemana(primeiro)
    setSegunda(nova)
    ajustarDiaSelecionado(nova)
  }

  function navegarSemana(delta: number) {
    const nova = addDias(segunda, delta * 7)
    setSegunda(nova)
    const ref = addDias(nova, 3)
    setMesRef({ year: ref.getFullYear(), month: ref.getMonth() })
    ajustarDiaSelecionado(nova)
  }

  function irParaHoje() {
    const h = new Date()
    setSegunda(inicioDaSemana(h))
    setMesRef({ year: h.getFullYear(), month: h.getMonth() })
    setDiaSelecionado(h)
  }

  function abrirNovaConsulta() {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    setInicioPadrao(d)
    setConsultaSelecionada(null)
    setDialogAberto(true)
  }

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i)
  const hoje = new Date()
  const mesReferencia = new Date(mesRef.year, mesRef.month, 1)

  // Mobile: só renderiza o dia selecionado.
  const diasVisiveis = isDesktop ? dias : [diaSelecionado]
  const cabecalhoColuna = isDesktop ? HEADER_DIAS : 0
  // No mobile a strip da semana sempre mostra os 7 dias.
  const diasSemana7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDias(segunda, i)),
    [segunda],
  )

  // Posição da linha "agora": precisa que `agora` esteja em algum dos `diasVisiveis`.
  const colHojeIdx = diasVisiveis.findIndex(d => mesmaData(d, agora))
  const minutosDeAgora = agora.getHours() * 60 + agora.getMinutes() - HORA_INICIO * 60
  const mostrarLinhaAgora =
    colHojeIdx >= 0 && minutosDeAgora >= 0 && minutosDeAgora <= (HORA_FIM - HORA_INICIO) * 60
  const topoLinhaAgora = cabecalhoColuna + (minutosDeAgora / 60) * ALTURA_HORA

  return (
    <Stack spacing={2}>
      {/* Toolbar */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {formatarData(segunda)} – {formatarData(ultimoDia)}
          </Typography>
          <Typography variant="h5" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
            {formatarMes(mesReferencia)}
          </Typography>
        </Stack>

        {/* Mês */}
        <Paper
          variant="outlined"
          sx={{
            display: 'flex', alignItems: 'center',
            border: `1px solid ${divider}`, boxShadow: 'none',
            borderRadius: 999, p: 0.25,
          }}
        >
          <Tooltip title="Mês anterior (semana do 1º dia útil)">
            <IconButton size="small" aria-label="Mês anterior" onClick={() => pularMes(-1)}>
              <KeyboardDoubleArrowLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Próximo mês (semana do 1º dia útil)">
            <IconButton size="small" aria-label="Próximo mês" onClick={() => pularMes(1)}>
              <KeyboardDoubleArrowRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Semana + Hoje */}
        <Paper
          variant="outlined"
          sx={{
            display: 'flex', alignItems: 'center',
            border: `1px solid ${divider}`, boxShadow: 'none',
            borderRadius: 999, p: 0.25,
          }}
        >
          <Tooltip title="Semana anterior">
            <IconButton size="small" aria-label="Semana anterior" onClick={() => navegarSemana(-1)}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small" startIcon={<TodayIcon />} onClick={irParaHoje}
            sx={{ borderRadius: 999, mx: 0.25 }}
          >
            Hoje
          </Button>
          <Tooltip title="Próxima semana">
            <IconButton size="small" aria-label="Próxima semana" onClick={() => navegarSemana(1)}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* FDS toggle (desktop only — mobile mostra strip semanal) */}
        <Tooltip title={ocultarFds ? 'Mostrar fim de semana' : 'Ocultar fim de semana'}>
          <ToggleButton
            size="small"
            value="fds"
            selected={ocultarFds}
            onChange={() => setOcultarFds(o => !o)}
            aria-label="Ocultar fim de semana"
            sx={{ borderRadius: 999, px: 1.5, display: { xs: 'none', md: 'inline-flex' } }}
          >
            <WeekendIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirNovaConsulta}
          sx={{ borderRadius: 999, ml: 0.5 }}
        >
          Nova consulta
        </Button>
      </Stack>

      {/* Mobile: tira-semana + banner do dia selecionado */}
      {!isDesktop && (
        <>
          <Paper
            variant="outlined"
            sx={{
              p: 0.5, display: 'flex', boxShadow: 'none',
              border: `1px solid ${divider}`, borderRadius: 2,
            }}
          >
            {diasSemana7.map((d, i) => {
              const ehHoje = mesmaData(d, hoje)
              const ehSelecionado = mesmaData(d, diaSelecionado)
              const numConsultas = consultas.filter(c => mesmaData(new Date(c.inicio), d)).length
              const dots = Math.min(numConsultas, 3)
              return (
                <ButtonBase
                  key={i}
                  onClick={() => setDiaSelecionado(d)}
                  aria-current={ehSelecionado ? 'date' : undefined}
                  aria-label={`${DIAS_SEMANA[i]} ${d.getDate()}, ${numConsultas} consulta${numConsultas === 1 ? '' : 's'}`}
                  sx={{
                    flex: 1, py: 0.75, borderRadius: 1.5,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 0.5,
                    bgcolor: ehSelecionado
                      ? alpha(theme.palette.primary.main, 0.10)
                      : 'transparent',
                    color: ehSelecionado ? 'primary.main' : 'text.primary',
                    transition: theme.transitions.create('background-color', {
                      duration: theme.transitions.duration.short,
                    }),
                    '&:hover': { bgcolor: tintHoverSlot },
                  }}
                >
                  <Typography variant="caption" sx={{
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    color: ehSelecionado ? 'primary.main' : 'text.secondary',
                  }}>
                    {DIAS_SEMANA[i]}
                  </Typography>
                  <Box sx={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: ehHoje ? 'primary.main' : 'transparent',
                    color: ehHoje ? 'primary.contrastText' : 'inherit',
                    fontWeight: ehHoje ? 700 : 500,
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {d.getDate()}
                  </Box>
                  <Stack direction="row" spacing={0.25} sx={{ height: 4, alignItems: 'center' }}>
                    {dots > 0
                      ? Array.from({ length: dots }).map((_, k) => (
                          <Box key={k} sx={{
                            width: 4, height: 4, borderRadius: '50%',
                            bgcolor: ehSelecionado ? 'primary.main' : alpha(theme.palette.primary.main, 0.5),
                          }} />
                        ))
                      : <Box sx={{ width: 4, height: 4 }} />}
                  </Stack>
                </ButtonBase>
              )
            })}
          </Paper>

          {/* Banner do dia selecionado */}
          <Paper
            variant="outlined"
            sx={{
              px: 2, py: 1.5, boxShadow: 'none',
              border: `1px solid ${divider}`, borderRadius: 2,
              display: 'flex', alignItems: 'center', gap: 1,
            }}
          >
            <Box sx={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: mesmaData(diaSelecionado, hoje) ? 'primary.main' : alpha(theme.palette.primary.main, 0.1),
              color: mesmaData(diaSelecionado, hoje) ? 'primary.contrastText' : 'primary.main',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {diaSelecionado.getDate()}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 600, lineHeight: 1.2, textTransform: 'capitalize',
              }}>
                {formatarDataLonga(diaSelecionado)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {consultas.filter(c => mesmaData(new Date(c.inicio), diaSelecionado)).length} consulta(s)
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {/* Grade da agenda */}
      <Paper sx={{ overflow: 'hidden', p: 0 }}>
        <Box sx={{ display: 'flex', position: 'relative' }}>
          {/* Coluna de horários */}
          <Box sx={{ width: LARGURA_HORA_COL, flexShrink: 0 }}>
            {isDesktop && (
              <Box sx={{ height: HEADER_DIAS, borderBottom: `1px solid ${divider}` }} />
            )}
            {horas.map(h => (
              <Box key={h} sx={{
                height: ALTURA_HORA,
                borderBottom: `1px solid ${dividerSubtle}`,
                pr: 1, pt: 0.5,
                textAlign: 'right',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
                color: 'text.secondary',
              }}>
                {String(h).padStart(2, '0')}:00
              </Box>
            ))}
          </Box>

          {diasVisiveis.map((dia, idx) => {
            const ehHoje = mesmaData(dia, hoje)
            const idxNoArray7 = diasSemana7.findIndex(d => mesmaData(d, dia))
            const nomeAbreviado = idxNoArray7 >= 0 ? DIAS_SEMANA[idxNoArray7] : DIAS_SEMANA[idx]
            return (
              <Box key={idx} sx={{
                flex: 1, borderLeft: `1px solid ${divider}`,
                position: 'relative',
                bgcolor: ehHoje ? tintHoje : 'transparent',
              }}>
                {/* Header do dia (desktop only) */}
                {isDesktop && (
                  <Box sx={{
                    height: HEADER_DIAS,
                    borderBottom: `1px solid ${divider}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 0.25,
                  }}>
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontSize: 10,
                    }}>
                      {nomeAbreviado}
                    </Typography>
                    <Box sx={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: ehHoje ? 'primary.main' : 'transparent',
                      color: ehHoje ? 'primary.contrastText' : 'text.primary',
                      fontWeight: ehHoje ? 700 : 500,
                      fontSize: 14,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {dia.getDate()}
                    </Box>
                  </Box>
                )}

                {/* Slots horários */}
                {horas.map(h => (
                  <Box key={h}
                       onClick={() => onClicarHora(dia, h)}
                       sx={{
                         height: ALTURA_HORA,
                         borderBottom: `1px solid ${dividerSubtle}`,
                         cursor: 'pointer',
                         transition: theme.transitions.create('background-color', {
                           duration: theme.transitions.duration.short,
                         }),
                         '&:hover': { bgcolor: tintHoverSlot },
                       }} />
                ))}

                {/* Consultas */}
                {consultasNoDia(dia).map(c => {
                  const { top, altura } = topoEAltura(c)
                  const cor = status[MAPA_STATUS[c.status]]
                  const ePequena = altura < 36
                  const cancelada = c.statusConfirmacao === 'CANCELADA_PELA_PACIENTE'
                  const corConf = corStatusConfirmacao(c, {
                    success: theme.palette.success.main,
                    error: theme.palette.error.main,
                    warning: theme.palette.warning.main,
                    muted: theme.palette.text.disabled,
                  })
                  return (
                    <Tooltip
                      key={c.id}
                      title={`${formatarHora(new Date(c.inicio))} · ${c.pacienteNome} · ${c.status.toLowerCase()}\n${tooltipStatusConfirmacao(c)}`}
                      placement="right"
                    >
                      <Box
                        onClick={e => { e.stopPropagation(); onClicarConsulta(c) }}
                        sx={{
                          position: 'absolute',
                          left: 6, right: 6,
                          top: cabecalhoColuna + top + 2,
                          height: Math.max(altura - 4, 22),
                          bgcolor: alpha(cor.bg, 0.14),
                          color: 'text.primary',
                          border: `1px solid ${alpha(cor.border, 0.6)}`,
                          borderLeft: `3px solid ${cor.bg}`,
                          borderRadius: 1.5,
                          px: 1, py: 0.5,
                          fontSize: 12, lineHeight: 1.3,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          opacity: cancelada ? 0.6 : 1,
                          textDecoration: cancelada ? 'line-through' : 'none',
                          transition: theme.transitions.create(['box-shadow', 'transform'], {
                            duration: theme.transitions.duration.short,
                          }),
                          boxShadow: theme.shadows[1],
                          '&:hover': {
                            boxShadow: theme.shadows[3],
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {/* Indicador de status de confirmação no canto sup. direito */}
                        <Box
                          aria-hidden
                          sx={{
                            position: 'absolute',
                            top: 4, right: 4,
                            width: 8, height: 8,
                            borderRadius: '50%',
                            bgcolor: corConf,
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                          }}
                        />
                        <Stack
                          direction={ePequena ? 'row' : 'column'}
                          spacing={ePequena ? 0.75 : 0}
                          sx={{
                            minWidth: 0,
                            alignItems: ePequena ? 'center' : 'stretch',
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              fontVariantNumeric: 'tabular-nums',
                              color: cor.bg,
                              flexShrink: 0,
                            }}
                          >
                            {formatarHora(new Date(c.inicio))}
                          </Typography>
                          <Typography
                            component="span"
                            noWrap
                            sx={{
                              fontWeight: 600,
                              fontSize: 12,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.pacienteNome}
                          </Typography>
                        </Stack>
                        {!ePequena && c.pago && (
                          <Chip
                            label="pago"
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: 9,
                              fontWeight: 600,
                              mt: 0.5,
                              bgcolor: alpha(cor.bg, 0.2),
                              color: cor.bg,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  )
                })}
              </Box>
            )
          })}

          {/* Linha do "agora" — atravessa todas as colunas dos dias */}
          {mostrarLinhaAgora && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: topoLinhaAgora,
                left: LARGURA_HORA_COL,
                right: 0,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <Box sx={{
                position: 'relative',
                borderTop: `2px solid ${theme.palette.error.main}`,
              }}>
                <Box sx={{
                  position: 'absolute',
                  left: -5, top: -6,
                  width: 10, height: 10,
                  borderRadius: '50%',
                  bgcolor: theme.palette.error.main,
                }} />
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      <ConsultaDialog
        aberto={dialogAberto}
        consulta={consultaSelecionada}
        inicioPadrao={inicioPadrao}
        onFechar={() => setDialogAberto(false)}
        onSalvo={async (resultado: ConsultaSalvoResultado, qtd?: number) => {
          await carregar()
          const msg = resultado === 'criada' ? 'Consulta criada'
            : resultado === 'criada_recorrente' ? `${qtd ?? 0} consultas criadas`
              : resultado === 'atualizada' ? 'Consulta atualizada'
                : 'Consulta removida'
          setMensagemSucesso(msg)
        }}
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
