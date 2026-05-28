import { useState, type FormEvent } from 'react'
import { Box, TextField, Button, Grid, Typography, Alert } from '@mui/material'
import type { PacienteInput } from '../api/pacientes'

type Props = {
  inicial?: PacienteInput
  textoBotao: string
  onSubmit: (p: PacienteInput) => Promise<void>
}

const vazio: PacienteInput = {
  nome: '', cpf: '', dataNascimento: '', telefone: '', email: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  valorConsulta: 0, observacoes: '',
}

export default function PacienteForm({ inicial, textoBotao, onSubmit }: Props) {
  const [form, setForm] = useState<PacienteInput>(inicial ?? vazio)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function setCampo<K extends keyof PacienteInput>(k: K, v: PacienteInput[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function setEnd<K extends keyof PacienteInput['endereco']>(k: K, v: string) {
    setForm(f => ({ ...f, endereco: { ...f.endereco, [k]: v } }))
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
        <Grid size={4}><TextField fullWidth label="Telefone" required value={form.telefone}
          onChange={e => setCampo('telefone', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="E-mail" type="email" value={form.email ?? ''}
          onChange={e => setCampo('email', e.target.value)} /></Grid>
        <Grid size={4}><TextField fullWidth label="Valor consulta (R$)" type="number" required
          slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
          value={form.valorConsulta} onChange={e => setCampo('valorConsulta', Number(e.target.value))} /></Grid>
        <Grid size={12}><TextField fullWidth label="Observações" multiline minRows={2}
          value={form.observacoes ?? ''} onChange={e => setCampo('observacoes', e.target.value)} /></Grid>

        <Grid size={12}><Typography variant="subtitle1" sx={{ mt: 1 }}>Endereço</Typography></Grid>
        <Grid size={3}><TextField fullWidth label="CEP" required value={form.endereco.cep}
          onChange={e => setEnd('cep', e.target.value)} /></Grid>
        <Grid size={6}><TextField fullWidth label="Logradouro" required value={form.endereco.logradouro}
          onChange={e => setEnd('logradouro', e.target.value)} /></Grid>
        <Grid size={3}><TextField fullWidth label="Número" required value={form.endereco.numero}
          onChange={e => setEnd('numero', e.target.value)} /></Grid>
        <Grid size={6}><TextField fullWidth label="Complemento" value={form.endereco.complemento ?? ''}
          onChange={e => setEnd('complemento', e.target.value)} /></Grid>
        <Grid size={6}><TextField fullWidth label="Bairro" required value={form.endereco.bairro}
          onChange={e => setEnd('bairro', e.target.value)} /></Grid>
        <Grid size={9}><TextField fullWidth label="Cidade" required value={form.endereco.cidade}
          onChange={e => setEnd('cidade', e.target.value)} /></Grid>
        <Grid size={3}><TextField fullWidth label="UF" required
          slotProps={{ htmlInput: { maxLength: 2 } }}
          value={form.endereco.uf}
          onChange={e => setEnd('uf', e.target.value.toUpperCase())} /></Grid>
      </Grid>

      <Button type="submit" variant="contained" sx={{ mt: 3 }} disabled={enviando}>
        {enviando ? 'Salvando…' : textoBotao}
      </Button>
    </Box>
  )
}
