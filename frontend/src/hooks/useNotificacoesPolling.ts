import { useCallback, useEffect, useRef, useState } from 'react'
import { notificacoesApi, type NotificacoesEnvelope } from '../api/notificacoes'

const INTERVALO_FOCO_MS = 60_000   // 1 min focada
const INTERVALO_BLUR_MS = 300_000  // 5 min blur

/**
 * Polling leve do endpoint /me/notificacoes. Spec §9.6.
 *
 * Backoff de janela: 60s quando aba focada, 5min quando blur. Detecta via
 * document.visibilityState e listener de visibilitychange.
 */
export function useNotificacoesPolling(): {
  envelope: NotificacoesEnvelope | null
  marcarLida: (id: string) => Promise<void>
  forcarRefetch: () => Promise<void>
} {
  const [envelope, setEnvelope] = useState<NotificacoesEnvelope | null>(null)
  const timerRef = useRef<number | null>(null)

  const fetchOnce = useCallback(async () => {
    try {
      const e = await notificacoesApi.listarNaoLidas()
      setEnvelope(e)
    } catch {
      // silencioso — proxima rodada tenta de novo
    }
  }, [])

  const reagendar = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const focada = document.visibilityState === 'visible'
    const intervalo = focada ? INTERVALO_FOCO_MS : INTERVALO_BLUR_MS
    timerRef.current = window.setTimeout(async () => {
      await fetchOnce()
      reagendar()
    }, intervalo)
  }, [fetchOnce])

  useEffect(() => {
    void fetchOnce()
    reagendar()
    const onVis = () => reagendar()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [fetchOnce, reagendar])

  const marcarLida = useCallback(async (id: string) => {
    await notificacoesApi.marcarLida(id)
    setEnvelope(prev => prev && {
      notificacoes: prev.notificacoes.filter(n => n.id !== id),
      naoLidas: Math.max(0, prev.naoLidas - 1),
    })
  }, [])

  return { envelope, marcarLida, forcarRefetch: fetchOnce }
}
