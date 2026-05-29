import { api } from './client'

export type Endereco = {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

export type Paciente = {
  id: string
  nome: string
  cpf: string
  dataNascimento: string
  telefone: string
  email?: string
  endereco: Endereco
  valorConsulta: number
  observacoes?: string
  ativo: boolean
}

export type PacienteInput = Omit<Paciente, 'id' | 'ativo'>

export const pacientesApi = {
  listar: (incluirInativos = false) =>
    api<Paciente[]>(`/pacientes?incluirInativos=${incluirInativos}`),
  buscar: (id: string) => api<Paciente>(`/pacientes/${id}`),
  criar: (p: PacienteInput) =>
    api<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(p) }),
  atualizar: (id: string, p: PacienteInput) =>
    api<Paciente>(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
  inativar: (id: string) =>
    api<void>(`/pacientes/${id}`, { method: 'DELETE' }),
  reativar: (id: string) =>
    api<Paciente>(`/pacientes/${id}/reativar`, { method: 'POST' }),
  listarConsultas: (id: string, tipo: 'proximas' | 'historico', limit: number, offset: number) =>
    api<ConsultasPaginado>(
      `/pacientes/${id}/consultas?tipo=${tipo}&limit=${limit}&offset=${offset}`,
    ),
}

export type ConsultaPaciente = {
  id: string
  pacienteId: string
  pacienteNome: string
  inicio: string
  duracaoMinutos: number
  valor: number
  status: 'AGENDADA' | 'CONFIRMADA' | 'REALIZADA' | 'FALTA'
  pago: boolean
  observacoes?: string
}

export type ConsultasPaginado = {
  consultas: ConsultaPaciente[]
  total: number
  temMais: boolean
}
