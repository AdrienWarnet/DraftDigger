import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Build } from '../engine/types'

/** Clé du brouillon de l'éditeur dans le stockage local. */
export const EDITOR_DRAFT_KEY = 'draftdigger:brouillon-build'

/** Ce que l'éditeur modifie : un nouveau build, ou un build existant (par id). */
export type EditorTarget = 'nouveau' | string

type BuildEditorStore = {
  target: EditorTarget | null
  build: Build | null
  /** `true` dès que le brouillon diffère de ce qui a été ouvert. */
  dirty: boolean
  /**
   * Ouvre l'éditeur sur `target`. Si un brouillon non enregistré existe pour la même cible,
   * il est repris ; sinon on part de `initial`.
   */
  open: (target: EditorTarget, initial: () => Build) => void
  update: (change: (build: Build) => Build) => void
  /** Oublie le brouillon (après enregistrement ou abandon). */
  clear: () => void
}

export const useBuildEditorStore = create<BuildEditorStore>()(
  persist(
    (set, get) => ({
      target: null,
      build: null,
      dirty: false,
      open: (target, initial) => {
        const current = get()
        if (current.target === target && current.build && current.dirty) return
        set({ target, build: initial(), dirty: false })
      },
      update: (change) => {
        const { build } = get()
        if (build) set({ build: change(build), dirty: true })
      },
      clear: () => set({ target: null, build: null, dirty: false }),
    }),
    {
      name: EDITOR_DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Brouillon illisible : ignoré (l'éditeur repart du build ouvert).
      merge: (persisted, current) => {
        if (!isDraft(persisted)) return current
        return {
          ...current,
          target: persisted.target,
          build: persisted.build,
          dirty: persisted.dirty,
        }
      },
    },
  ),
)

function isDraft(value: unknown): value is { target: string; build: Build; dirty: boolean } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const build = v.build as Record<string, unknown> | null
  return (
    typeof v.target === 'string' &&
    typeof v.dirty === 'boolean' &&
    typeof build === 'object' &&
    build !== null &&
    typeof build.id === 'string' &&
    typeof build.runes === 'object' &&
    Array.isArray(build.summonerSpells) &&
    Array.isArray(build.itemOrder)
  )
}
