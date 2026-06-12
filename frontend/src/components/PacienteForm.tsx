import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid, Snackbar, TextField, Typography,
} from '@mui/material'
import type { PacienteInput } from '../api/pacientes'
import { useAuth } from '../auth/authContext'
import { useDirty } from '../hooks/useDirty'
import { formatarTelefoneBr, paraE164Br } from '../utils/telefones'
import { sxInputSemSpinner } from '../theme/sx'
import EnderecoForm from './EnderecoForm'

type Props = {
  inicial?: PacienteInput
  textoBotao: string
  onSubmit: (p: PacienteInput) => Promise<void>
}

const vazio: PacienteInput = {
  nome: '', cpf: '', dataNascimento: '', telefone: '', email: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  valorConsulta: 0, observacoes: '',
  optInWhatsapp: false,
}

export default function PacienteForm({ inicial, textoBotao, onSubmit }: Props) {
  const { psicologa } = useAuth()
  const modoEditar = inicial !== undefined

  // Em editar, o backend pode entregar o telefone em E.164 — formatamos pra exibição
  // apenas na montagem inicial. As mudanças subsequentes (digitação) já vivem em formato BR.
  const inicialFormatado: PacienteInput | undefined = useMemo(() => {
    if (!inicial) return undefined
    return { ...inicial, telefone: formatarTelefoneBr(inicial.telefone) }
  }, [inicial])

  const [form, setForm] = useState<PacienteInput>(inicialFormatado ?? vazio)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [sucessoEm, setSucessoEm] = useState<number | null>(null)
  const { dirty, setBaseline } = useDirty(form)

  // Quando o inicial chega depois do mount (typical em página com fetch), realinha
  // o baseline e o form. Sem isso, dirty fica `true` mesmo sem mudança do usuário.
  useEffect(() => {
    if (!inicialFormatado) return
    setForm(inicialFormatado)
    setBaseline(inicialFormatado)
    // setBaseline é estável (setState), inicialFormatado vem de useMemo — checa por igualdade referencial
  }, [inicialFormatado, setBaseline])

  function setCampo<K extends keyof PacienteInput>(k: K, v: PacienteInput[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const telefoneE164 = paraE164Br(form.telefone)
  const erroTelefone = form.telefone && !telefoneE164
    ? 'Telefone precisa ter DDD + número (10 ou 11 dígitos)'
    : null

  // Em criar: dirty não trava nada (form começa vazio == baseline). Habilita
  // assim que algo foi preenchido — usamos `dirty` mesmo, que vira true ao
  // primeiro toque, e o disable principal é a validação E.164.
  const podeSalvar = !enviando && !erroTelefone && !!telefoneE164
    && (modoEditar ? dirty : true)

  async function handle(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!telefoneE164) {
      setErro('Telefone inválido')
      return
    }
    setEnviando(true)
    try {
      const payload: PacienteInput = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: telefoneE164,
        endereco: { ...form.endereco, cep: form.endereco.cep.replace(/\D/g, '') },
        valorConsulta: Number(form.valorConsulta),
      }
      await onSubmit(payload)
      // Pós-save: estado do form vira o novo baseline. Em editar, isso desabilita
      // o botão até a próxima edição. Em criar, o consumer normalmente fecha o
      // dialog, mas se permanecer aberto o mesmo comportamento se aplica.
      const persistido: PacienteInput = { ...form, telefone: formatarTelefoneBr(telefoneE164) }
      setForm(persistido)
      setBaseline(persistido)
      if (modoEditar) setSucessoEm(Date.now())
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar') + det)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box component="form" onSubmit={handle}>
      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
      <Grid container spacing={2}>
        <Grid size={8}><TextField fullWidth label="Nome" required value={form.nome}
          onChange={e => setCampo('nome', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="CPF" required value={form.cpf}
          onChange={e => setCampo('cpf', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="Data de nascimento" type="date" required
          slotProps={{ inputLabel: { shrink: true } }}
          value={form.dataNascimento} onChange={e => setCampo('dataNascimento', e.target.value)} /></Grid>
        <Grid size={4}>
          <TextField fullWidth required
            label="Telefone"
            placeholder="(11) 96666-3333"
            value={form.telefone}
            onChange={e => setCampo('telefone', formatarTelefoneBr(e.target.value))}
            error={!!erroTelefone}
            helperText={erroTelefone ?? 'Salvo como E.164 (+55…) pra envio via WhatsApp'}
          />
        </Grid>
        <Grid size={4}><TextField fullWidth label="E-mail" type="email" value={form.email ?? ''}
          onChange={e => setCampo('email', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="Valor consulta (R$)" type="number" required
          slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
          sx={sxInputSemSpinner}
          value={form.valorConsulta} onChange={e => setCampo('valorConsulta', Number(e.target.value))} /></Grid>
        <Grid size={12}><TextField fullWidth label="Observações" multiline minRows={2}
          value={form.observacoes ?? ''} onChange={e => setCampo('observacoes', e.target.value)} /></Grid>

        <Grid size={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.optInWhatsapp}
                onChange={e => setCampo('optInWhatsapp', e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">
                  Autorizo receber lembretes de consulta da
                  {' '}<strong>{psicologa?.nomeCompleto ?? '(psicólogo)'}</strong>
                  {' '}via WhatsApp no número informado.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sem essa autorização, a paciente não receberá lembretes.
                </Typography>
              </Box>
            }
          />
        </Grid>

        <Grid size={12}>
          <Typography variant="subtitle1" sx={{ mt: 1 }}>Endereço</Typography>
        </Grid>
        <Grid size={12}>
          <EnderecoForm
            value={form.endereco}
            onChange={endereco => setForm(f => ({ ...f, endereco }))}
          />
        </Grid>
      </Grid>

      <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={!podeSalvar}>
        {enviando ? 'Salvando…' : textoBotao}
      </Button>

      <Snackbar
        open={sucessoEm !== null}
        autoHideDuration={3000}
        onClose={() => setSucessoEm(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Paciente atualizado com sucesso
        </Alert>
      </Snackbar>
    </Box>
  )
}
