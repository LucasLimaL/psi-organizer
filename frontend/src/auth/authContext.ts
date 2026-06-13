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
  /**
   * Sessão restrita por inadimplência: só a tela de Assinatura fica acessível.
   * Vem do topo do LoginResponse (não do PsicologaResponse) e é dobrado aqui pra
   * persistir entre reloads. Fonte de verdade do bloqueio é o backend (claim do JWT);
   * este campo é só pra UX. Ver docs/BUSINESS_RULES.md §11.
   */
  restrito: boolean
}

export type AuthCtx = {
  psicologa: Psicologa | null
  carregando: boolean
  /** Retorna a psicóloga logada — permite redirect condicional (ex.: admin → /admin). */
  login: (email: string, senha: string) => Promise<Psicologa>
  /** Conta comum nasce não validada → { pendenteValidacao: true } (sem sessão). */
  signup: (payload: unknown) => Promise<{ pendenteValidacao: boolean }>
  logout: () => void
  /** Atualiza a psicóloga no contexto e em localStorage (preserva `restrito`). */
  atualizarPsicologa: (p: Omit<Psicologa, 'restrito'>) => void
  /**
   * Re-emite o token recalculando a situação de cobrança (botão "já paguei").
   * Retorna a psicóloga atualizada — `restrito === false` significa que regularizou.
   */
  renovarSessao: () => Promise<Psicologa>
}

export const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
