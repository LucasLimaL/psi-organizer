const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export type ApiError = { erro: string; detalhes?: unknown }

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('psi.jwt')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  // Sessão expirada/token inválido: limpa credenciais e força re-login com aviso.
  // Exceção: /auth/* — ali 401 significa credenciais erradas no form, não sessão caída.
  if (res.status === 401 && !path.startsWith('/auth')) {
    localStorage.removeItem('psi.jwt')
    localStorage.removeItem('psi.user')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login?sessao=expirada')
    }
    throw { erro: 'Sessão expirada — faça login novamente' } satisfies ApiError
  }
  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({ erro: res.statusText }))
    throw body
  }
  if (res.status === 204 || res.status === 202) return undefined as T
  return (await res.json()) as T
}
