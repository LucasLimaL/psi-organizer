import { api } from './client'
import type { Psicologa } from '../auth/authContext'

export type Endereco = {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

/**
 * Perfil completo da psicóloga incluindo endereço (a `Psicologa` do
 * AuthContext só tem campos resumidos — usados pelo AppShell).
 */
export type PerfilCompleto = Psicologa & {
  endereco: Endereco
  cobrarFaltas: boolean
}

// (duracaoPadraoMinutos já vem de Psicologa)

export type AtualizarPerfilInput = {
  nomeCompleto: string
  crp: string
  telefone: string
  endereco: Endereco
}

/** Preferências editadas na aba Configurações (separadas do perfil). */
export type AtualizarPreferenciasInput = {
  cobrarFaltas: boolean
  duracaoPadraoMinutos: number
}

export type AlterarSenhaInput = {
  senhaAtual: string
  novaSenha: string
}

export const perfilApi = {
  buscar: () => api<PerfilCompleto>('/me'),
  atualizar: (p: AtualizarPerfilInput) =>
    api<PerfilCompleto>('/me', { method: 'PUT', body: JSON.stringify(p) }),
  atualizarPreferencias: (p: AtualizarPreferenciasInput) =>
    api<PerfilCompleto>('/me/preferencias', { method: 'PUT', body: JSON.stringify(p) }),
  alterarSenha: (p: AlterarSenhaInput) =>
    api<void>('/me/senha', { method: 'PUT', body: JSON.stringify(p) }),
}
