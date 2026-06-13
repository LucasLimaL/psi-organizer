import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { AuthContext, type Psicologa } from './authContext'

type LoginResponse = { token: string; psicologa: Psicologa }
type SignupResponse = {
  emailValidacaoPendente: boolean
  token: string | null
  psicologa: Psicologa
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

  function aplicar(resp: LoginResponse) {
    localStorage.setItem(TOKEN_KEY, resp.token)
    localStorage.setItem(USER_KEY, JSON.stringify(resp.psicologa))
    setPsicologa(resp.psicologa)
  }

  async function login(email: string, senha: string) {
    const resp = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    })
    aplicar(resp)
    return resp.psicologa
  }

  async function signup(payload: unknown) {
    const resp = await api<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (resp.emailValidacaoPendente || !resp.token) {
      return { pendenteValidacao: true }
    }
    aplicar({ token: resp.token, psicologa: resp.psicologa })
    return { pendenteValidacao: false }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setPsicologa(null)
  }

  function atualizarPsicologa(p: Psicologa) {
    localStorage.setItem(USER_KEY, JSON.stringify(p))
    setPsicologa(p)
  }

  return (
    <AuthContext.Provider value={{
      psicologa, carregando, login, signup, logout, atualizarPsicologa,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
