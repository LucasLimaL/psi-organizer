/**
 * Helpers de telefone BR. UI usa formato `(DD) NNNNN-NNNN` ou `(DD) NNNN-NNNN`,
 * mas o backend exige E.164 (`+55DDNNNNNNNNN`) via @TelefoneE164.
 */

export function somenteDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Tira DDI `55` opcional do início e devolve só os dígitos do número nacional.
 * `+5511966663333` → `11966663333` · `(11) 96666-3333` → `11966663333`.
 */
function nacionalDigitos(input: string): string {
  const d = somenteDigitos(input)
  return d.length > 11 && d.startsWith('55') ? d.slice(2) : d
}

/**
 * Aplica máscara BR aceitando entrada parcial (enquanto digita) ou completa.
 * 10 dígitos → fixo `(DD) NNNN-NNNN`. 11 dígitos → celular `(DD) NNNNN-NNNN`.
 */
export function formatarTelefoneBr(input: string): string {
  const n = nacionalDigitos(input).slice(0, 11)
  if (n.length === 0) return ''
  if (n.length <= 2) return `(${n}`
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

/**
 * Normaliza pra E.164 BR. Retorna `null` se o número não tem 10 (fixo) ou 11
 * (celular) dígitos nacionais válidos.
 */
export function paraE164Br(input: string): string | null {
  const n = nacionalDigitos(input)
  if (n.length === 10 || n.length === 11) return `+55${n}`
  return null
}
