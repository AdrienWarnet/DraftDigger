import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  addEnemy,
  emptyDraft,
  moveEnemy,
  newGame,
  parseDraft,
  playerChampionId,
  rememberChampion,
  removeEnemy,
  replaceEnemy,
  setAlly,
  setPlayerPosition,
  unlockEnemy,
  type Draft,
} from '../engine/draft'
import { INPUT_SHORTCUTS } from '../engine/config'
import { buyItem, parseIdList, parseOwnedItems, removeItem, replaceItem } from '../engine/inventory'
import type { PositionRates } from '../engine/positions'
import type { RoleQuestEffects } from '../engine/roleQuests'
import { parseSituation } from '../engine/situation'
import type { Item, Position, Situation } from '../engine/types'

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
  /** Items achetés pendant la partie (T6.1), dans l'ordre d'achat. Vidés à la nouvelle partie. */
  ownedItemIds: string[]
  buyItem: (
    itemId: string,
    itemsById: ReadonlyMap<string, Item>,
    questEffects?: RoleQuestEffects,
  ) => void
  removeItem: (index: number) => void
  replaceItem: (index: number, itemId: string) => void
  /** Situation en partie (T6.2) : « à égalité » au début de chaque partie. */
  situation: Situation
  setSituation: (situation: Situation) => void
  /** Derniers champions choisis dans la draft (T7.3), proposés en tête du sélecteur. */
  recentChampionIds: string[]
  /** Quête de rôle du poste joué terminée (epic 8) : ses effets s'appliquent. */
  questCompleted: boolean
  setQuestCompleted: (completed: boolean) => void
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      draft: emptyDraft(),
      setPlayerPosition: (position) =>
        set((s) => withPlayerChange(s, setPlayerPosition(s.draft, position))),
      setAlly: (position, championId) =>
        set((s) => ({
          ...withPlayerChange(s, setAlly(s.draft, position, championId)),
          ...remember(s, championId),
        })),
      addEnemy: (championId, lockedPosition = null) =>
        set((s) => ({
          draft: addEnemy(s.draft, championId, lockedPosition),
          ...remember(s, championId),
        })),
      replaceEnemy: (index, championId) =>
        set((s) => ({
          draft: replaceEnemy(s.draft, index, championId),
          ...remember(s, championId),
        })),
      removeEnemy: (index) => set((s) => ({ draft: removeEnemy(s.draft, index) })),
      moveEnemy: (from, to, rates) => set((s) => ({ draft: moveEnemy(s.draft, from, to, rates) })),
      unlockEnemy: (index) => set((s) => ({ draft: unlockEnemy(s.draft, index) })),
      newGame: () =>
        set((s) => ({
          draft: newGame(s.draft),
          forcedBuildId: null,
          ownedItemIds: [],
          situation: 'even',
          questCompleted: false,
        })),
      forcedBuildId: null,
      forceBuild: (buildId) => set({ forcedBuildId: buildId }),
      ownedItemIds: [],
      buyItem: (itemId, itemsById, questEffects) =>
        set((s) => ({ ownedItemIds: buyItem(s.ownedItemIds, itemId, itemsById, questEffects) })),
      removeItem: (index) => set((s) => ({ ownedItemIds: removeItem(s.ownedItemIds, index) })),
      replaceItem: (index, itemId) =>
        set((s) => ({ ownedItemIds: replaceItem(s.ownedItemIds, index, itemId) })),
      situation: 'even',
      setSituation: (situation) => set({ situation }),
      recentChampionIds: [],
      questCompleted: false,
      setQuestCompleted: (completed) => set({ questCompleted: completed }),
    }),
    {
      name: GAME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        draft: state.draft,
        forcedBuildId: state.forcedBuildId,
        ownedItemIds: state.ownedItemIds,
        situation: state.situation,
        recentChampionIds: state.recentChampionIds,
        questCompleted: state.questCompleted,
      }),
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
        const owned =
          typeof persisted === 'object' && persisted !== null && 'ownedItemIds' in persisted
            ? parseOwnedItems(persisted.ownedItemIds)
            : []
        const situation = parseSituation(
          typeof persisted === 'object' && persisted !== null && 'situation' in persisted
            ? persisted.situation
            : undefined,
        )
        const recent =
          typeof persisted === 'object' && persisted !== null && 'recentChampionIds' in persisted
            ? parseIdList(persisted.recentChampionIds, INPUT_SHORTCUTS.recentChampions)
            : []
        return saved
          ? {
              ...current,
              draft: saved,
              forcedBuildId: forced,
              ownedItemIds: owned,
              situation,
              recentChampionIds: recent,
              questCompleted:
                typeof persisted === 'object' &&
                persisted !== null &&
                'questCompleted' in persisted &&
                persisted.questCompleted === true,
            }
          : current
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

/** Ajoute un champion choisi aux récents (rien pour un retrait). */
function remember(state: { recentChampionIds: string[] }, championId: string | null) {
  return championId
    ? {
        recentChampionIds: rememberChampion(
          state.recentChampionIds,
          championId,
          INPUT_SHORTCUTS.recentChampions,
        ),
      }
    : {}
}
