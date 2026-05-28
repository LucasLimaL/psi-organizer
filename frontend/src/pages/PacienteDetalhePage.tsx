import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Paper, Typography, Box, Button, Chip } from '@mui/material'
import { pacientesApi, type Paciente, type PacienteInput } from '../api/pacientes'
import PacienteForm from '../components/PacienteForm'

export default function PacienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paciente, setPaciente] = useState<Paciente | null>(null)

  useEffect(() => {
    if (!id) return
    pacientesApi.buscar(id).then(setPaciente)
  }, [id])

  if (!paciente) return <Paper sx={{ p: 3 }}><Typography>Carregando…</Typography></Paper>

  async function salvar(p: PacienteInput) {
    if (!id) return
    const atualizado = await pacientesApi.atualizar(id, p)
    setPaciente(atualizado)
  }

  const inicial: PacienteInput = {
    nome: paciente.nome,
    cpf: paciente.cpf,
    dataNascimento: paciente.dataNascimento,
    telefone: paciente.telefone,
    email: paciente.email ?? '',
    endereco: paciente.endereco,
    valorConsulta: paciente.valorConsulta,
    observacoes: paciente.observacoes ?? '',
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{paciente.nome}</Typography>
        {paciente.ativo
          ? <Chip label="Ativo" color="success" />
          : <Chip label="Inativo" />}
        <Button variant="outlined" onClick={() => navigate('/pacientes')}>Voltar</Button>
      </Box>
      <PacienteForm inicial={inicial} textoBotao="Salvar" onSubmit={salvar} />
    </Paper>
  )
}
