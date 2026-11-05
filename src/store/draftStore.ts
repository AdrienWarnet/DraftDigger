import { create } from 'zustand'
import {
  addEnemy,
  emptyDraft,
  removeEnemy,
  replaceEnemy,
  setAlly,
  setPlayerPosition,
  type Draft,
} from '../engine/draft'
import type { Position } from '../engine/types'

/** État de la draft en cours. La logique est dans src/engine/draft.ts ; le store ne fait que l'appeler. */
type DraftStore = {
  draft: Draft
  setPlayerPosition: (position: Position) => void
  setAlly: (position: Position, championId: string | null) => void
  addEnemy: (championId: string, lockedPosition?: Position | null) => void
  replaceEnemy: (index: number, championId: string) => void
  removeEnemy: (index: number) => void
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
}))
