import { useEffect, useRef, useState } from 'react'
import { buscarCep, type EnderecoCep } from '../api/cep'

export type EstadoCep = {
  /** True enquanto a requisição ao ViaCEP está em andamento. */
  buscando: boolean
  /**
   * True quando o ViaCEP respondeu com sucesso para o `cep` atual.
   * Vira false assim que o usuário modifica o CEP.
   * Útil pra travar campos que vieram preenchidos automaticamente.
   */
  autoPreenchido: boolean
}

/**
 * Dispara consulta ao ViaCEP sempre que `cep` atinge 8 dígitos.
 * Quando a API responde com sucesso, chama `onPreenchido` (deve usar
 * functional setState pra evitar dependências circulares).
 *
 * O hook ignora `onPreenchido` nas deps (via ref) de propósito:
 * trocar a callback NÃO deve refazer a chamada.
 */
export function useAutofillCep(
  cep: string,
  onPreenchido: (e: EnderecoCep) => void,
): EstadoCep {
  const [buscando, setBuscando] = useState(false)
  const [autoPreenchido, setAutoPreenchido] = useState(false)
  const callbackRef = useRef(onPreenchido)

  useEffect(() => {
    callbackRef.current = onPreenchido
  }, [onPreenchido])

  useEffect(() => {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) {
      setAutoPreenchido(false)
      return
    }
    let cancelado = false
    setBuscando(true)
    buscarCep(limpo)
      .then(end => {
        if (cancelado) return
        if (end) {
          callbackRef.current(end)
          setAutoPreenchido(true)
        } else {
          setAutoPreenchido(false)
        }
      })
      .finally(() => {
        if (!cancelado) setBuscando(false)
      })
    return () => {
      cancelado = true
    }
  }, [cep])

  return { buscando, autoPreenchido }
}
