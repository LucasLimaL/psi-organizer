import { useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid, TextField, Typography,
} from '@mui/material'
import type { PacienteInput } from '../api/pacientes'
import { useAuth } from '../auth/authContext'
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

const E164_BR = /^\+55\d{10,11}$/

function telefoneInvalidoMsg(t: string): string | null {
  if (!t) return null
  return E164_BR.test(t) ? null : 'Use o formato E.164: +55 DDD número (ex: +5511987654321)'
}

export default function PacienteForm({ inicial, textoBotao, onSubmit }: Props) {
  const { psicologa } = useAuth()
  const [form, setForm] = useState<PacienteInput>(inicial ?? vazio)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function setCampo<K extends keyof PacienteInput>(k: K, v: PacienteInput[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handle(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const payload: PacienteInput = {
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        endereco: { ...form.endereco, cep: form.endereco.cep.replace(/\D/g, '') },
        valorConsulta: Number(form.valorConsulta),
      }
      await onSubmit(payload)
    } catch (err) {
      const e = err as { erro?: string; detalhes?: Record<string, string> }
      const det = e?.detalhes ? ' — ' + Object.values(e.detalhes).join('; ') : ''
      setErro((e?.erro ?? 'Falha ao salvar') + det)
    } finally {
      setEnviando(false)
    }
  }

  const erroTelefone = telefoneInvalidoMsg(form.telefone)

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
            label="Telefone (E.164)"
            placeholder="+5511987654321"
            value={form.telefone}
            onChange={e => setCampo('telefone', e.target.value)}
            error={!!erroTelefone}
            helperText={erroTelefone ?? 'Necessário pra receber lembretes via WhatsApp'}
          />
        </Grid>
        <Grid size={4}><TextField fullWidth label="E-mail" type="email" value={form.email ?? ''}
          onChange={e => setCampo('email', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="Valor consulta (R$)" type="number" required
          slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
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
                  {' '}<strong>{psicologa?.nomeCompleto ?? '(psicóloga)'}</strong>
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

      <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={enviando || !!erroTelefone}>
        {enviando ? 'Salvando…' : textoBotao}
      </Button>
    </Box>
  )
}
