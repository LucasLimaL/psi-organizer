import { api } from './client'
import type { Contrato, Fatura, PreviaFatura } from './admin'

/** Visão self-service da assinatura do psicólogo autenticado (somente leitura). */
export type Assinatura = {
  diaFechamento: number
  contratos: Contrato[]
  faturas: Fatura[]
  previas: PreviaFatura[]
}

export const assinaturaApi = {
  minha: () => api<Assinatura>('/me/assinatura'),
}
