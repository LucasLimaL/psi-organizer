import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, FormControlLabel, Switch, Alert, Grid, Divider,
} from '@mui/material'
import type {
  Consulta, ConsultaInput, ConsultaUpdate, ConsultaRecorrenteInput,
  DiaSemana, StatusConsulta,
} from '../api/consultas'
import { consultasApi } from '../api/consultas'
import type { Paciente } from '../api/pacientes'
import { pacientesApi } from '../api/pacientes'
import { useAuth } from '../auth/authContext'
import { toDatetimeLocal, fromDatetimeLocal } from '../utils/datas'
import { useDirty } from '../hooks/useDirty'
import { sxInputSemSpinner } from '../theme/sx'

export type ConsultaSalvoResultado = 'criada' | 'criada_recorrente' | 'atualizada' | 'removida'

type Props = {
  aberto: boolean
  consulta: Consulta | null
  inicioPadrao?: Date
  /** Pré-seleciona o paciente na criação (ex.: dialog aberto a partir da página do paciente). */
  pacientePadraoId?: string
  onFechar: () => void
  onSalvo: (resultado: ConsultaSalvoResultado, qtd?: number) => void
}

const STATUSES: StatusConsulta[] = ['AGENDADA', 'CONFIRMADA', 'REALIZADA', 'FALTA', 'CANCELADA']

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'SEG', label: 'Segunda' },
  { value: 'TER', label: 'Terça' },
  { value: 'QUA', label: 'Quarta' },
  { value: 'QUI', label: 'Quinta' },
  { value: 'SEX', label: 'Sexta' },
  { value: 'SAB', label: 'Sábado' },
  { value: 'DOM', label: 'Domingo' },
]

function diaSemanaDaData(d: Date): DiaSemana {
  return DIAS[(d.getDay() + 6) % 7].value
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function horarioDaData(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ConsultaDialog({
  aberto, consulta, inicioPadrao, pacientePadraoId, onFechar, onSalvo,
}: Props) {
  const { psicologa } = useAuth()
  const duracaoPadrao = psicologa?.duracaoPadraoMinutos ?? 50
  const editando = consulta !== null
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [inicio, setInicio] = useState('')
  const [duracaoMinutos, setDuracao] = useState(50)
  const [valor, setValor] = useState(0)
  const [status, setStatus] = useState<StatusConsulta>('AGENDADA')
  const [pago, setPago] = useState(false)
  const [observacoes, setObservacoes] = useState('')

  // Recorrência (só usado em criação)
  const [recorrente, setRecorrente] = useState(false)
  const [diaDaSemana, setDiaDaSemana] = useState<DiaSemana>('SEG')
  const [horario, setHorario] = useState('08:00')
  const [intervaloSemanas, setIntervaloSemanas] = useState(1)
  const [inicioEm, setInicioEm] = useState('')
  const [fimEm, setFimEm] = useState('')

  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Snapshot dos campos editáveis. Usado pra dirty-check do botão Salvar.
  const snapshot = useMemo(() => ({
    pacienteId, inicio, duracaoMinutos, valor, status, pago, observacoes,
    recorrente, diaDaSemana, horario, intervaloSemanas, inicioEm, fimEm,
  }), [pacienteId, inicio, duracaoMinutos, valor, status, pago, observacoes,
    recorrente, diaDaSemana, horario, intervaloSemanas, inicioEm, fimEm])
  const { dirty, setBaseline } = useDirty(snapshot)

  useEffect(() => {
    if (!aberto) return
    setErro(null)
    pacientesApi.listar(false).then(setPacientes)
    let proximo: typeof snapshot
    if (consulta) {
      proximo = {
        pacienteId: consulta.pacienteId,
        inicio: toDatetimeLocal(new Date(consulta.inicio)),
        duracaoMinutos: consulta.duracaoMinutos,
        valor: consulta.valor,
        status: consulta.status,
        pago: consulta.pago,
        observacoes: consulta.observacoes ?? '',
        recorrente: false,
        diaDaSemana: 'SEG' as DiaSemana,
        horario: '08:00',
        intervaloSemanas: 1,
        inicioEm: '',
        fimEm: '',
      }
    } else {
      const base = inicioPadrao ?? new Date()
      proximo = {
        pacienteId: pacientePadraoId ?? '',
        inicio: toDatetimeLocal(base),
        duracaoMinutos: duracaoPadrao,
        valor: 0,
        status: 'AGENDADA' as StatusConsulta,
        pago: false,
        observacoes: '',
        recorrente: false,
        diaDaSemana: diaSemanaDaData(base),
        horario: horarioDaData(base),
        intervaloSemanas: 1,
        inicioEm: isoDate(base),
        fimEm: '',
      }
    }
    setPacienteId(proximo.pacienteId)
    setInicio(proximo.inicio)
    setDuracao(proximo.duracaoMinutos)
    setValor(proximo.valor)
    setStatus(proximo.status)
    setPago(proximo.pago)
    setObservacoes(proximo.observacoes)
    setRecorrente(proximo.recorrente)
    setDiaDaSemana(proximo.diaDaSemana)
    setHorario(proximo.horario)
    setIntervaloSemanas(proximo.intervaloSemanas)
    setInicioEm(proximo.inicioEm)
    setFimEm(proximo.fimEm)
    setBaseline(proximo)
    // setBaseline é estável; queremos rodar apenas quando o dialog reabre / alvo muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, consulta, inicioPadrao, pacientePadraoId])

  // Pré-preenche valor pelo paciente (criação)
  useEffect(() => {
    if (editando || !pacienteId) return
    const p = pacientes.find(x => x.id === pacienteId)
    if (p) setValor(p.valorConsulta)
  }, [pacienteId, pacientes, editando])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      let resultado: ConsultaSalvoResultado
      let qtd: number | undefined
      if (editando && consulta) {
        const payload: ConsultaUpdate = {
          inicio: fromDatetimeLocal(inicio).toISOString(),
          duracaoMinutos, valor: Number(valor), status, pago, observacoes,
        }
        await consultasApi.atualizar(consulta.id, payload)
        resultado = 'atualizada'
      } else if (recorrente) {
        const payload: ConsultaRecorrenteInput = {
          pacienteId, diaDaSemana, horario,
          intervaloSemanas: Number(intervaloSemanas),
          duracaoMinutos, valor: Number(valor),
          inicioEm, fimEm, observacoes,
        }
        const criadas = await consultasApi.criarRecorrente(payload)
        resultado = 'criada_recorrente'
        qtd = criadas.length
      } else {
        const payload: ConsultaInput = {
          pacienteId,
          inicio: fromDatetimeLocal(inicio).toISOString(),
          duracaoMinutos, valor: Number(valor), observacoes,
        }
        await consultasApi.criar(payload)
        resultado = 'criada'
      }
      onSalvo(resultado, qtd)
      onFechar()
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar') + det)
    } finally {
      setEnviando(false)
    }
  }

  async function excluir() {
    if (!consulta) return
    if (!confirm('Remover esta consulta?')) return
    await consultasApi.remover(consulta.id)
    onSalvo('removida')
    onFechar()
  }

  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle>{editando ? 'Editar consulta' : 'Nova consulta'}</DialogTitle>
      <DialogContent>
        <form id="consulta-form" onSubmit={salvar}>
          {erro && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{erro}</Alert>}
          {editando && consulta?.lembreteEnviadoEm
            && inicio !== toDatetimeLocal(new Date(consulta.inicio)) && (
            <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
              O lembrete já foi enviado pra paciente. Avise a mudança manualmente —
              o sistema não dispara novo lembrete em reagendamento.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField select fullWidth label="Paciente" required
                         disabled={editando || pacientePadraoId !== undefined}
                         value={pacienteId} onChange={e => setPacienteId(e.target.value)}>
                {pacientes.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {!editando && (
              <Grid size={12}>
                <FormControlLabel
                  control={<Switch checked={recorrente}
                                   onChange={e => setRecorrente(e.target.checked)} />}
                  label="Consulta recorrente (semanal)" />
              </Grid>
            )}

            {!recorrente && (
              <Grid size={7}>
                <TextField fullWidth label="Início" type="datetime-local" required
                           slotProps={{ inputLabel: { shrink: true } }}
                           value={inicio} onChange={e => setInicio(e.target.value)} />
              </Grid>
            )}
            {recorrente && (
              <>
                <Grid size={7}>
                  <TextField select fullWidth label="Dia da semana" required
                             value={diaDaSemana}
                             onChange={e => setDiaDaSemana(e.target.value as DiaSemana)}>
                    {DIAS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={5}>
                  <TextField fullWidth label="Horário" type="time" required
                             slotProps={{ inputLabel: { shrink: true } }}
                             value={horario} onChange={e => setHorario(e.target.value)} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth label="A cada N semanas" type="number" required
                             slotProps={{ htmlInput: { min: 1, max: 52, step: 1 } }}
                             helperText="1 = toda semana; 2 = a cada duas semanas; etc."
                             value={intervaloSemanas}
                             onChange={e => setIntervaloSemanas(Number(e.target.value))} />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label="Início em" type="date" required
                             slotProps={{ inputLabel: { shrink: true } }}
                             value={inicioEm} onChange={e => setInicioEm(e.target.value)} />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label="Fim em" type="date" required
                             slotProps={{ inputLabel: { shrink: true } }}
                             value={fimEm} onChange={e => setFimEm(e.target.value)} />
                </Grid>
              </>
            )}

            <Grid size={recorrente ? 6 : 5}>
              <TextField fullWidth label="Duração (min)" type="number" required
                         slotProps={{ htmlInput: { min: 5, max: 600, step: 5 } }}
                         value={duracaoMinutos}
                         onChange={e => setDuracao(Number(e.target.value))} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label="Valor (R$)" type="number" required
                         slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                         sx={sxInputSemSpinner}
                         value={valor} onChange={e => setValor(Number(e.target.value))} />
            </Grid>

            {editando && (
              <>
                <Grid size={6}>
                  <TextField select fullWidth label="Status"
                             value={status}
                             onChange={e => setStatus(e.target.value as StatusConsulta)}>
                    {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={12}>
                  <FormControlLabel
                    control={<Switch checked={pago} onChange={e => setPago(e.target.checked)} />}
                    label="Pago" />
                </Grid>
              </>
            )}

            <Grid size={12}>
              <TextField fullWidth label="Observações" multiline minRows={2}
                         value={observacoes} onChange={e => setObservacoes(e.target.value)} />
            </Grid>
          </Grid>
          {recorrente && (
            <Divider sx={{ mt: 2 }}>Recorrência semanal — se algum horário conflitar, nada será criado</Divider>
          )}
        </form>
      </DialogContent>
      <DialogActions>
        {editando && (
          <Button color="error" onClick={excluir} sx={{ mr: 'auto' }}>Remover</Button>
        )}
        <Button onClick={onFechar}>Cancelar</Button>
        <Button type="submit" form="consulta-form" variant="contained" disabled={enviando || !dirty}>
          {enviando ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
