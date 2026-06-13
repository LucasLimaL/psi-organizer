import { api } from './client'

/** Validação de e-mail da conta (ativação) — endpoints públicos de /auth. */
export const authValidacaoApi = {
  validarEmail: (token: string) =>
    api<void>('/auth/validar-email', { method: 'POST', body: JSON.stringify({ token }) }),
  reenviarValidacao: (email: string) =>
    api<void>('/auth/reenviar-validacao', { method: 'POST', body: JSON.stringify({ email }) }),
}
