import { createContext, useContext } from 'react'
import type { GameCatalog } from '../../data/catalog'
import type { DDragonLoadResult } from '../../data/ddragon'
import type { DDragonData } from '../../data/ddragonTypes'

export type GameDataState =
  | { status: 'loading' }
  | { status: 'ready'; result: DDragonLoadResult; catalog: GameCatalog }
  | { status: 'error'; error: unknown }

export type GameDataContextValue = { state: GameDataState; retry: () => void }

export const GameDataContext = createContext<GameDataContextValue | null>(null)

export function useGameDataState(): GameDataContextValue {
  const value = useContext(GameDataContext)
  if (!value) throw new Error('useGameDataState doit être utilisé sous <GameDataProvider>.')
  return value
}

/** Données brutes du patch. À n'utiliser que sous <GameDataGate>, qui garantit qu'elles sont chargées. */
export function useGameData(): DDragonData {
  const { state } = useGameDataState()
  if (state.status !== 'ready') throw new Error('Données du jeu pas encore chargées.')
  return state.result.data
}

/** Champions et items enrichis et corrigés par les overrides. Même condition que useGameData. */
export function useCatalog(): GameCatalog {
  const { state } = useGameDataState()
  if (state.status !== 'ready') throw new Error('Données du jeu pas encore chargées.')
  return state.catalog
}
