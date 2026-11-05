import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { loadDDragon } from '../../data/ddragon'
import { GameDataContext, type GameDataState } from './gameDataContext'

/** Charge les données Data Dragon au démarrage et les met à disposition de toute l'app. */
export function GameDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameDataState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadDDragon().then(
      (result) => !cancelled && setState({ status: 'ready', result }),
      (error: unknown) => {
        console.error(error)
        if (!cancelled) setState({ status: 'error', error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return <GameDataContext.Provider value={{ state, retry }}>{children}</GameDataContext.Provider>
}
