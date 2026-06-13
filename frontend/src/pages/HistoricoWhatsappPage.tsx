import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  whatsappApi, type EtapaLembrete, type FiltrosHistorico, type LembreteResumo,
  type StatusEntregaLembrete,
} from '../api/whatsapp'

const ETAPAS: { value: EtapaLembrete; label: string; cor: 'default' | 'primary' | 'success' | 'warning' | 'error' }[] = [
  { value: 'AGUARDANDO_ESCOLHA', label: 'Aguardando escolha', cor: 'default' },
  { value: 'AGUARDANDO_CONFIRMACAO_DUPLA', label: 'Aguardando confirmação', cor: 'primary' },
  { value: 'FINALIZADO', label: 'Finalizado', cor: 'success' },
  { value: 'EXPIRADO', label: 'Expirado', cor: 'warning' },
  { value: 'CONGELADO_POR_LOOP', label: 'Congelado (loop)', cor: 'error' },
]

const STATUS_ENTREGA: { value: StatusEntregaLembrete; label: string; cor: 'default' | 'primary' | 'success' | 'warning' | 'error' }[] = [
  { value: 'PENDENTE', label: 'Pendente', cor: 'default' },
  { value: 'ENVIADO', label: 'Enviado', cor: 'primary' },
  { value: 'ENTREGUE', label: 'Entregue', cor: 'success' },
  { value: 'LIDO', label: 'Lido', cor: 'success' },
  { value: 'FALHOU', label: 'Falhou', cor: 'error' },
]

function isoData(date: Date) {
  return date.toISOString().slice(0, 10)
}

function rotuloEtapa(e: EtapaLembrete) {
  return ETAPAS.find(x => x.value === e)?.label ?? e
}
function corEtapa(e: EtapaLembrete) {
  return ETAPAS.find(x => x.value === e)?.cor ?? 'default'
}
function rotuloStatus(s: StatusEntregaLembrete) {
  return STATUS_ENTREGA.find(x => x.value === s)?.label ?? s
}
function corStatus(s: StatusEntregaLembrete) {
  return STATUS_ENTREGA.find(x => x.value === s)?.cor ?? 'default'
}

function escolhaFinalRotulo(l: LembreteResumo): string {
  if (l.escolhaFinal === 'CONFIRMAR') return 'Confirmou'
  if (l.escolhaFinal === 'CANCELAR') return 'Cancelou'
  return '—'
}

const LIMIT = 50

export default function HistoricoWhatsappPage() {
  const hoje = new Date()
  const ha30 = new Date(); ha30.setDate(ha30.getDate() - 30)

  const [filtros, setFiltros] = useState<FiltrosHistorico>({
    inicioEm: isoData(ha30),
    fimEm: isoData(hoje),
  })
  const [items, setItems] = useState<LembreteResumo[]>([])
  const [total, setTotal] = useState(0)
  const [temMais, setTemMais] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const carregarPrimeiraPagina = useCallback(async (f: FiltrosHistorico) => {
    setCarregando(true); setErro(null)
    try {
      const r = await whatsappApi.listarHistorico({ ...f, limit: LIMIT, offset: 0 })
      setItems(r.lembretes); setTotal(r.total); setTemMais(r.temMais); setOffset(r.lembretes.length)
    } catch (err) {
      const e = err as { erro?: string }
      setErro(e?.erro ?? 'Falha ao carregar histórico')
    } finally {
      setCarregando(false)
    }
  }, [])

  async function verMais() {
    setCarregando(true)
    try {
      const r = await whatsappApi.listarHistorico({ ...filtros, limit: LIMIT, offset })
      setItems(prev => [...prev, ...r.lembretes])
      setTotal(r.total); setTemMais(r.temMais); setOffset(prev => prev + r.lembretes.length)
    } catch (err) {
      const e = err as { erro?: string }
      setErro(e?.erro ?? 'Falha ao paginar')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { void carregarPrimeiraPagina(filtros) }, [carregarPrimeiraPagina, filtros])

  function setCampo<K extends keyof FiltrosHistorico>(k: K, v: FiltrosHistorico[K]) {
    setFiltros(f => ({ ...f, [k]: v }))
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          component={RouterLink}
          to="/configuracoes"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ mb: 1 }}
        >
          Voltar às configurações
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Histórico de lembretes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {total} lembrete{total === 1 ? '' : 's'} no período · Exibindo {items.length}.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ flexWrap: 'wrap', gap: 2 }}
        >
          <TextField
            label="De" type="date" size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filtros.inicioEm ?? ''}
            onChange={e => setCampo('inicioEm', e.target.value || undefined)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Até" type="date" size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filtros.fimEm ?? ''}
            onChange={e => setCampo('fimEm', e.target.value || undefined)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            select label="Etapa" size="small"
            value={filtros.etapa ?? ''}
            onChange={e => setCampo('etapa', (e.target.value || undefined) as EtapaLembrete | undefined)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {ETAPAS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
          </TextField>
          <TextField
            select label="Status entrega" size="small"
            value={filtros.statusEntrega ?? ''}
            onChange={e => setCampo('statusEntrega', (e.target.value || undefined) as StatusEntregaLembrete | undefined)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUS_ENTREGA.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Enviado em</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell>Consulta</TableCell>
              <TableCell>Entrega</TableCell>
              <TableCell>Etapa</TableCell>
              <TableCell>Escolha final</TableCell>
              <TableCell align="right">Reenvios Msg 2</TableCell>
              <TableCell>Erro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !carregando && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    Nenhum lembrete no filtro selecionado.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(l => (
              <TableRow key={l.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {l.enviadoEm ? new Date(l.enviadoEm).toLocaleString('pt-BR') : '—'}
                </TableCell>
                <TableCell>{l.pacienteNome}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {l.consultaInicio ? new Date(l.consultaInicio).toLocaleString('pt-BR') : '—'}
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" color={corStatus(l.statusEntrega)}
                        label={rotuloStatus(l.statusEntrega)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" color={corEtapa(l.etapa)}
                        label={rotuloEtapa(l.etapa)} />
                </TableCell>
                <TableCell>{escolhaFinalRotulo(l)}</TableCell>
                <TableCell align="right">{l.confirmacaoDuplaTentativas}/3</TableCell>
                <TableCell sx={{ maxWidth: 280, color: 'error.main' }}>
                  {l.erroCodigo
                    ? <Typography variant="caption">{l.erroCodigo}: {l.erroDescricao}</Typography>
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {temMais && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button onClick={() => void verMais()} disabled={carregando}>
            {carregando ? 'Carregando…' : `Ver mais (${total - items.length} restante${total - items.length === 1 ? '' : 's'})`}
          </Button>
        </Box>
      )}
    </Stack>
  )
}
