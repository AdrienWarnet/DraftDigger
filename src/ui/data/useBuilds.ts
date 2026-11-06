import { useEffect, useState } from 'react'
import type { BuildList } from '../../data/buildRepository'
import { getBuildRepository } from '../../data/localBuildRepository'

export type BuildsState =
  { status: 'loading' } | { status: 'ready'; list: BuildList } | { status: 'error'; error: unknown }

/** Liste des builds du joueur (lecture seule ; la gestion arrive avec l'écran « Mes builds »). */
export function useBuilds(): BuildsState {
  const [state, setState] = useState<BuildsState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    getBuildRepository()
      .list()
      .then(
        (list) => !cancelled && setState({ status: 'ready', list }),
        (error: unknown) => !cancelled && setState({ status: 'error', error }),
      )
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
