import { useEffect, useState } from 'react'

export type WakeLockStatus = 'active' | 'unsupported' | 'released'

/**
 * Garde l'écran allumé tant que `active` est vrai (T6.5), via la Wake Lock API si le navigateur
 * la propose. Le système relâche le verrou quand l'app passe en arrière-plan : il est redemandé
 * au retour.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [status, setStatus] = useState<WakeLockStatus>(supported ? 'released' : 'unsupported')

  useEffect(() => {
    if (!active || !supported) return
    // Verrou en cours et démontage, partagés avec les rappels asynchrones.
    const lock: { sentinel: WakeLockSentinel | null; cancelled: boolean } = {
      sentinel: null,
      cancelled: false,
    }

    const request = async () => {
      if (document.visibilityState !== 'visible' || lock.sentinel) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (lock.cancelled) {
          void sentinel.release()
          return
        }
        lock.sentinel = sentinel
        setStatus('active')
        sentinel.addEventListener('release', () => {
          lock.sentinel = null
          if (!lock.cancelled) setStatus('released')
        })
      } catch {
        // Refusé (économie d'énergie, onglet caché...) : l'app fonctionne normalement.
        setStatus('released')
      }
    }

    const onVisibility = () => void request()
    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      lock.cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock.sentinel?.release()
    }
  }, [active, supported])

  return status
}
