import { useState } from 'react'

/**
 * Dirty-check de form via comparação serializada.
 *
 * Padrão de uso:
 *   const { dirty, setBaseline } = useDirty(form)
 *   useEffect(() => { setBaseline(form) }, [carregouInicial])
 *   <Button disabled={!dirty}>Salvar</Button>
 *   após salvar com sucesso: setBaseline(form)
 *
 * Vale pra forms onde o consumer permanece na tela depois do save. Em dialogs
 * que fecham após salvar, dirty cobre a UX de "Salvar começa disabled e
 * habilita só após mudança".
 */
export function useDirty<T>(valor: T): {
  dirty: boolean
  setBaseline: (v: T) => void
} {
  const [baseline, setBaseline] = useState<T>(valor)
  return {
    dirty: JSON.stringify(valor) !== JSON.stringify(baseline),
    setBaseline,
  }
}
