import { create } from 'zustand'
import {
  addEnemy,
  emptyDraft,
  moveEnemy,
  removeEnemy,
  replaceEnemy,
  unlockEnemy,
  setAlly,
  setPlayerPosition,
  type Draft,
} from '../engine/draft'
import type { PositionRates } from '../engine/positions'
import type { Position } from '../engine/types'

/** État de la draft en cours. La logique est dans src/engine/draft.ts ; le store ne fait que l'appeler. */
type DraftStore = {
  draft: Draft
  setPlayerPosition: (position: Position) => void
  setAlly: (position: Position, championId: string | null) => void
  addEnemy: (championId: string, lockedPosition?: Position | null) => void
  replaceEnemy: (index: number, championId: string) => void
  removeEnemy: (index: number) => void
  moveEnemy: (from: Position, to: Position, rates: PositionRates) => void
  unlockEnemy: (index: number) => void
}

export const useDraftStore = create<DraftStore>()((set) => ({
  draft: emptyDraft(),
  setPlayerPosition: (position) => set((s) => ({ draft: setPlayerPosition(s.draft, position) })),
  setAlly: (position, championId) =>
    set((s) => ({ draft: setAlly(s.draft, position, championId) })),
  addEnemy: (championId, lockedPosition = null) =>
    set((s) => ({ draft: addEnemy(s.draft, championId, lockedPosition) })),
  replaceEnemy: (index, championId) =>
    set((s) => ({ draft: replaceEnemy(s.draft, index, championId) })),
  removeEnemy: (index) => set((s) => ({ draft: removeEnemy(s.draft, index) })),
  moveEnemy: (from, to, rates) => set((s) => ({ draft: moveEnemy(s.draft, from, to, rates) })),
  unlockEnemy: (index) => set((s) => ({ draft: unlockEnemy(s.draft, index) })),
}))
