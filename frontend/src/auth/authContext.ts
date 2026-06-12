import { createContext, useContext } from 'react'

export type Psicologa = {
  id: string
  nomeCompleto: string
  email: string
  cpf: string
  crp: string
  telefone: string
  /** Conta de gestão do SaaS — habilita o painel /admin. */
  admin: boolean
}

export type AuthCtx = {
  psicologa: Psicologa | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  signup: (payload: unknown) => Promise<void>
  logout: () => void
  /** Atualiza a psicóloga no contexto e em localStorage. */
  atualizarPsicologa: (p: Psicologa) => void
}

export const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
