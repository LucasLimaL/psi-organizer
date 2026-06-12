import { useCallback, useEffect, useState } from 'react'
import {
  Stack, Box, Paper, Typography, IconButton, Tooltip, Tabs, Tab,
  ToggleButton, ToggleButtonGroup, TextField, MenuItem, Collapse,
  Skeleton, Snackbar, Alert, Grid, ButtonBase,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { financeiroApi, type FinanceiroResumo } from '../api/financeiro'
import { formatarMes } from '../utils/datas'
import { formatarMoeda as brl } from '../utils/formatadores'
import FinanceiroPendentesList from '../components/FinanceiroPendentesList'
import FinanceiroConsultasList from '../components/FinanceiroConsultasList'

type Modo = 'mes' | 'ano'
type AbaId = 'pendentes' | 'realizados' | 'futuros'

function periodoDoMes(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function FinanceiroPage() {
  const theme = useTheme()
  const hoje = new Date()
  const [modo, setModo] = useState<Modo>('mes')
  const [mesRef, setMesRef] = useState({ year: hoje.getFullYear(), month: hoje.getMonth() })
  const [anoSel, setAnoSel] = useState(hoje.getFullYear())
  const [resumo, setResumo] = useState<FinanceiroResumo | null>(null)
  const [aba, setAba] = useState<AbaId>('pendentes')
  const [bannerAberto, setBannerAberto] = useState(false)
  // Bump após registrar pagamento — recarrega resumo e remonta as listas
  const [versao, setVersao] = useState(0)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  const periodo = modo === 'mes' ? periodoDoMes(mesRef.year, mesRef.month) : String(anoSel)

  const carregarResumo = useCallback(async () => {
    const r = await financeiroApi.resumo(periodo)
    setResumo(r)
  }, [periodo])

  useEffect(() => { carregarResumo() }, [carregarResumo, versao])

  function pularMes(delta: number) {
    const total = mesRef.year * 12 + mesRef.month + delta
    const year = Math.floor(total / 12)
    setMesRef({ year, month: total - year * 12 })
  }

  function registrarPagamento(inicioConsulta: Date) {
    setVersao(v => v + 1)
    // Competência pode diferir do período em tela (ex.: pendência antiga paga
    // via banner) — informa onde o valor foi parar
    setMensagemSucesso(`Pagamento registrado — competência de ${formatarMes(inicioConsulta)}`)
  }

  const anos = resumo?.anosDisponiveis ?? [hoje.getFullYear()]
  const mesReferencia = new Date(mesRef.year, mesRef.month, 1)
  const temAnteriores = (resumo?.pendentesAnteriores.quantidade ?? 0) > 0

  const cards: { id: AbaId; rotulo: string; cor: string; total?: number; qtd?: number }[] = [
    {
      id: 'pendentes', rotulo: 'Pendentes', cor: theme.palette.warning.main,
      total: resumo?.pendentes.total, qtd: resumo?.pendentes.quantidade,
    },
    {
      id: 'realizados', rotulo: 'Realizados', cor: theme.palette.success.main,
      total: resumo?.realizados.total, qtd: resumo?.realizados.quantidade,
    },
    {
      id: 'futuros', rotulo: 'Futuros', cor: theme.palette.info.main,
      total: resumo?.futuros.total, qtd: resumo?.futuros.quantidade,
    },
  ]

  return (
    <Stack spacing={2}>
      {/* Filtro de período */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Regime de competência — pelo mês da consulta
          </Typography>
          <Typography variant="h5" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
            {modo === 'mes' ? formatarMes(mesReferencia) : anoSel}
          </Typography>
        </Stack>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={modo}
          onChange={(_, v: Modo | null) => { if (v) setModo(v) }}
          aria-label="Recorte do período"
          sx={{ '& .MuiToggleButton-root': { borderRadius: 999, px: 2 } }}
        >
          <ToggleButton value="mes">Mês</ToggleButton>
          <ToggleButton value="ano">Ano</ToggleButton>
        </ToggleButtonGroup>

        {modo === 'mes' ? (
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', alignItems: 'center',
              border: `1px solid ${theme.palette.divider}`, boxShadow: 'none',
              borderRadius: 999, p: 0.25,
            }}
          >
            <Tooltip title="Mês anterior">
              <IconButton size="small" aria-label="Mês anterior" onClick={() => pularMes(-1)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Próximo mês">
              <IconButton size="small" aria-label="Próximo mês" onClick={() => pularMes(1)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        ) : (
          <TextField
            select
            size="small"
            label="Ano"
            value={anoSel}
            onChange={e => setAnoSel(Number(e.target.value))}
            sx={{ minWidth: 110 }}
          >
            {anos.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      {/* Banner fixo: pendências anteriores ao período */}
      {temAnteriores && resumo && (
        <Paper
          variant="outlined"
          sx={{
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            overflow: 'hidden',
          }}
        >
          <ButtonBase
            onClick={() => setBannerAberto(a => !a)}
            aria-expanded={bannerAberto}
            sx={{
              width: '100%', px: 2, py: 1.5, gap: 1.5,
              display: 'flex', alignItems: 'center', textAlign: 'left',
            }}
          >
            <WarningAmberIcon sx={{ color: 'warning.main' }} />
            <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {brl(resumo.pendentesAnteriores.total)}
              </Box>
              {' '}pendente{resumo.pendentesAnteriores.quantidade === 1 ? '' : 's'} de períodos
              anteriores ({resumo.pendentesAnteriores.quantidade} consulta
              {resumo.pendentesAnteriores.quantidade === 1 ? '' : 's'})
            </Typography>
            <ExpandMoreIcon sx={{
              color: 'text.secondary',
              transform: bannerAberto ? 'rotate(180deg)' : 'none',
              transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.short,
              }),
            }} />
          </ButtonBase>
          <Collapse in={bannerAberto}>
            <Box sx={{ p: 2, pt: 0.5 }}>
              <FinanceiroPendentesList
                key={`anteriores-${periodo}-${versao}`}
                periodo={periodo}
                anteriores
                onPagamento={registrarPagamento}
              />
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Cards de resumo — clicáveis, levam à aba correspondente */}
      <Grid container spacing={1.5}>
        {cards.map(card => (
          <Grid key={card.id} size={{ xs: 12, sm: 4 }}>
            <Paper
              component={ButtonBase}
              onClick={() => setAba(card.id)}
              aria-label={`Ver ${card.rotulo.toLowerCase()}`}
              variant="outlined"
              sx={{
                p: 2, width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                boxShadow: 'none',
                border: `1px solid ${aba === card.id ? alpha(card.cor, 0.6) : theme.palette.divider}`,
                borderLeft: `3px solid ${card.cor}`,
                textAlign: 'left',
                transition: theme.transitions.create(['border-color', 'background-color'], {
                  duration: theme.transitions.duration.short,
                }),
                '&:hover': { bgcolor: alpha(card.cor, 0.04) },
              }}
            >
              <Typography variant="caption" sx={{
                color: 'text.secondary', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {card.rotulo}
              </Typography>
              {resumo ? (
                <>
                  <Typography variant="h5" sx={{
                    fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: card.cor,
                  }}>
                    {brl(card.total ?? 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.qtd} consulta{card.qtd === 1 ? '' : 's'}
                  </Typography>
                </>
              ) : (
                <>
                  <Skeleton variant="text" width={120} height={36} />
                  <Skeleton variant="text" width={80} />
                </>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Abas */}
      <Box>
        <Tabs
          value={aba}
          onChange={(_, v) => setAba(v)}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
        >
          <Tab value="pendentes" label="Pendentes" />
          <Tab value="realizados" label="Realizados" />
          <Tab value="futuros" label="Futuros" />
        </Tabs>
      </Box>

      {aba === 'pendentes' && (
        <FinanceiroPendentesList
          key={`pendentes-${periodo}-${versao}`}
          periodo={periodo}
          onPagamento={registrarPagamento}
        />
      )}
      {aba === 'realizados' && (
        <FinanceiroConsultasList
          key={`realizados-${periodo}-${versao}`}
          periodo={periodo}
          categoria="realizados"
        />
      )}
      {aba === 'futuros' && (
        <FinanceiroConsultasList
          key={`futuros-${periodo}-${versao}`}
          periodo={periodo}
          categoria="futuros"
        />
      )}

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
