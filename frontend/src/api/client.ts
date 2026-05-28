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
  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({ erro: res.statusText }))
    throw body
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
