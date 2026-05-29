import { useEffect, useRef, useState } from 'react'
import { buscarCep, type EnderecoCep } from '../api/cep'

/**
 * Dispara consulta ao ViaCEP sempre que `cep` atinge 8 dígitos.
 * Quando a API responde com sucesso, chama `onPreenchido` (deve usar
 * functional setState pra evitar dependências circulares).
 *
 * Retorna `buscando: boolean` — útil pra mostrar spinner no campo.
 *
 * O hook ignora o `onPreenchido` nas deps (via ref) de propósito:
 * trocar a callback NÃO deve refazer a chamada.
 */
export function useAutofillCep(
  cep: string,
  onPreenchido: (e: EnderecoCep) => void,
): boolean {
  const [buscando, setBuscando] = useState(false)
  const callbackRef = useRef(onPreenchido)

  // Mantém a callback sempre fresca sem disparar reexecução do efeito.
  useEffect(() => {
    callbackRef.current = onPreenchido
  }, [onPreenchido])

  useEffect(() => {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return
    let cancelado = false
    setBuscando(true)
    buscarCep(limpo)
      .then(end => {
        if (cancelado || !end) return
        callbackRef.current(end)
      })
      .finally(() => {
        if (!cancelado) setBuscando(false)
      })
    return () => {
      cancelado = true
    }
  }, [cep])

  return buscando
}
