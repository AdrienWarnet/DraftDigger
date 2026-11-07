import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  addEnemy,
  emptyDraft,
  moveEnemy,
  newGame,
  parseDraft,
  playerChampionId,
  removeEnemy,
  replaceEnemy,
  setAlly,
  setPlayerPosition,
  unlockEnemy,
  type Draft,
} from '../engine/draft'
import type { PositionRates } from '../engine/positions'
import type { Position } from '../engine/types'

/** Clé de la partie en cours dans le stockage local. */
export const GAME_STORAGE_KEY = 'draftdigger:partie'

/**
 * État de la partie en cours, sauvegardé dans le stockage local à chaque modification.
 * La logique est dans src/engine/draft.ts ; le store ne fait que l'appeler.
 */
type DraftStore = {
  draft: Draft
  setPlayerPosition: (position: Position) => void
  setAlly: (position: Position, championId: string | null) => void
  addEnemy: (championId: string, lockedPosition?: Position | null) => void
  replaceEnemy: (index: number, championId: string) => void
  removeEnemy: (index: number) => void
  moveEnemy: (from: Position, to: Position, rates: PositionRates) => void
  unlockEnemy: (index: number) => void
  /** Vide la partie en gardant le poste et le champion du joueur. */
  newGame: () => void
  /**
   * Build choisi à la main par le joueur (T5.4), ou `null` pour suivre la recommandation.
   * Oublié à la nouvelle partie et quand le champion ou le poste du joueur change.
   */
  forcedBuildId: string | null
  forceBuild: (buildId: string | null) => void
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      draft: emptyDraft(),
      setPlayerPosition: (position) =>
        set((s) => withPlayerChange(s, setPlayerPosition(s.draft, position))),
      setAlly: (position, championId) =>
        set((s) => withPlayerChange(s, setAlly(s.draft, position, championId))),
      addEnemy: (championId, lockedPosition = null) =>
        set((s) => ({ draft: addEnemy(s.draft, championId, lockedPosition) })),
      replaceEnemy: (index, championId) =>
        set((s) => ({ draft: replaceEnemy(s.draft, index, championId) })),
      removeEnemy: (index) => set((s) => ({ draft: removeEnemy(s.draft, index) })),
      moveEnemy: (from, to, rates) => set((s) => ({ draft: moveEnemy(s.draft, from, to, rates) })),
      unlockEnemy: (index) => set((s) => ({ draft: unlockEnemy(s.draft, index) })),
      newGame: () => set((s) => ({ draft: newGame(s.draft), forcedBuildId: null })),
      forcedBuildId: null,
      forceBuild: (buildId) => set({ forcedBuildId: buildId }),
    }),
    {
      name: GAME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft, forcedBuildId: state.forcedBuildId }),
      // Sauvegarde relue et validée : une sauvegarde illisible repart d'une draft vide.
      merge: (persisted, current) => {
        const saved =
          typeof persisted === 'object' && persisted !== null && 'draft' in persisted
            ? parseDraft(persisted.draft)
            : null
        const forced =
          typeof persisted === 'object' &&
          persisted !== null &&
          'forcedBuildId' in persisted &&
          typeof persisted.forcedBuildId === 'string'
            ? persisted.forcedBuildId
            : null
        return saved ? { ...current, draft: saved, forcedBuildId: forced } : current
      },
    },
  ),
)

/** Nouvelle draft ; le choix forcé est oublié si le champion ou le poste du joueur change. */
function withPlayerChange(state: { draft: Draft; forcedBuildId: string | null }, next: Draft) {
  const playerChanged =
    next.playerPosition !== state.draft.playerPosition ||
    playerChampionId(next) !== playerChampionId(state.draft)
  return { draft: next, forcedBuildId: playerChanged ? null : state.forcedBuildId }
}
