import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { AuthContext, type Psicologa } from './authContext'

// `restrito` vem no topo do LoginResponse (não dentro de psicologa) — dobramos
// no objeto guardado pra persistir entre reloads.
type LoginResponse = { token: string; psicologa: Omit<Psicologa, 'restrito'>; restrito: boolean }
type SignupResponse = {
  emailValidacaoPendente: boolean
  token: string | null
  psicologa: Omit<Psicologa, 'restrito'>
}

const TOKEN_KEY = 'psi.jwt'
const USER_KEY = 'psi.user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [psicologa, setPsicologa] = useState<Psicologa | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (token && raw) setPsicologa(JSON.parse(raw))
    setCarregando(false)
  }, [])

  function aplicar(resp: LoginResponse): Psicologa {
    const user: Psicologa = { ...resp.psicologa, restrito: resp.restrito }
    localStorage.setItem(TOKEN_KEY, resp.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setPsicologa(user)
    return user
  }

  async function login(email: string, senha: string) {
    const resp = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    })
    return aplicar(resp)
  }

  async function renovarSessao() {
    const resp = await api<LoginResponse>('/me/renovar-sessao', { method: 'POST' })
    return aplicar(resp)
  }

  async function signup(payload: unknown) {
    const resp = await api<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (resp.emailValidacaoPendente || !resp.token) {
      return { pendenteValidacao: true }
    }
    // Conta recém-criada nasce com cortesia — nunca restrita.
    aplicar({ token: resp.token, psicologa: resp.psicologa, restrito: false })
    return { pendenteValidacao: false }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setPsicologa(null)
  }

  function atualizarPsicologa(p: Omit<Psicologa, 'restrito'>) {
    setPsicologa(prev => {
      const user: Psicologa = { ...p, restrito: prev?.restrito ?? false }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    })
  }

  return (
    <AuthContext.Provider value={{
      psicologa, carregando, login, signup, logout, atualizarPsicologa, renovarSessao,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
