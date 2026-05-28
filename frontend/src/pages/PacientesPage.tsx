import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Paper, Typography, Button, Box, TextField, FormControlLabel, Switch,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog,
  DialogTitle, DialogContent, Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import { pacientesApi, type Paciente, type PacienteInput } from '../api/pacientes'
import PacienteForm from '../components/PacienteForm'

function formatarCpf(cpf: string) {
  if (cpf.length !== 11) return cpf
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export default function PacientesPage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)

  const carregar = useCallback(async () => {
    const lista = await pacientesApi.listar(incluirInativos)
    setPacientes(lista)
  }, [incluirInativos])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return pacientes
    const qDigitos = q.replace(/\D/g, '')
    return pacientes.filter(p =>
      p.nome.toLowerCase().includes(q) ||
      (qDigitos && p.cpf.includes(qDigitos))
    )
  }, [pacientes, busca])

  async function onCriar(p: PacienteInput) {
    await pacientesApi.criar(p)
    setCriando(false)
    await carregar()
  }

  async function inativar(p: Paciente) {
    if (!confirm(`Inativar ${p.nome}? Consultas futuras serão canceladas.`)) return
    await pacientesApi.inativar(p.id)
    await carregar()
  }

  async function reativar(p: Paciente) {
    await pacientesApi.reativar(p.id)
    await carregar()
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Pacientes</Typography>
        <Button variant="contained" onClick={() => setCriando(true)}>Novo paciente</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField size="small" placeholder="Buscar por nome ou CPF"
                   value={busca} onChange={e => setBusca(e.target.value)} sx={{ width: 320 }} />
        <FormControlLabel
          control={<Switch checked={incluirInativos}
                           onChange={e => setIncluirInativos(e.target.checked)} />}
          label="Incluir inativos" />
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>CPF</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtrados.map(p => (
            <TableRow key={p.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/pacientes/${p.id}`)}>
              <TableCell>{p.nome}</TableCell>
              <TableCell>{formatarCpf(p.cpf)}</TableCell>
              <TableCell>{p.telefone}</TableCell>
              <TableCell align="right">R$ {p.valorConsulta.toFixed(2)}</TableCell>
              <TableCell>
                {p.ativo
                  ? <Chip size="small" label="Ativo" color="success" />
                  : <Chip size="small" label="Inativo" />}
              </TableCell>
              <TableCell align="right" onClick={e => e.stopPropagation()}>
                {p.ativo
                  ? <IconButton size="small" onClick={() => inativar(p)}><DeleteIcon /></IconButton>
                  : <IconButton size="small" onClick={() => reativar(p)}><RestoreIcon /></IconButton>}
              </TableCell>
            </TableRow>
          ))}
          {filtrados.length === 0 && (
            <TableRow><TableCell colSpan={6} align="center">Nenhum paciente.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={criando} onClose={() => setCriando(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo paciente</DialogTitle>
        <DialogContent>
          <PacienteForm textoBotao="Criar" onSubmit={onCriar} />
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
