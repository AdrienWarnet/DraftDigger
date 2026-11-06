import { create } from 'zustand'
import type { BuildList, BuildRepository } from '../data/buildRepository'
import { createBuildId, getBuildRepository } from '../data/localBuildRepository'
import { duplicateBuild } from '../engine/buildList'
import type { Build } from '../engine/types'

export type BuildsStore = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  list: BuildList
  error: unknown
  /** Charge (ou recharge) les builds depuis le dépôt. */
  load: () => Promise<void>
  save: (build: Build) => Promise<Build>
  remove: (id: string) => Promise<void>
  /** Duplique un build ; renvoie la copie (placée à la fin de son groupe). */
  duplicate: (id: string) => Promise<Build | null>
  /** Fait de ce build le favori de son champion à ce poste (ou le retire s'il l'était). */
  toggleFavorite: (id: string) => Promise<void>
  /** Enregistre des builds importés ; renvoie le nombre enregistré. */
  importBuilds: (builds: Build[]) => Promise<number>
}

/**
 * Builds du joueur en mémoire pour l'UI. Chaque modification passe par le `BuildRepository`
 * (source de vérité), puis la liste est relue.
 */
export function createBuildsStore(repository: () => BuildRepository) {
  return create<BuildsStore>()((set, get) => {
    async function refresh() {
      const list = await repository().list()
      set({ status: 'ready', list, error: null })
    }
    return {
      status: 'idle',
      list: { builds: [], invalid: [] },
      error: null,
      load: async () => {
        if (get().status === 'idle') set({ status: 'loading' })
        try {
          await refresh()
        } catch (error) {
          set({ status: 'error', error })
        }
      },
      save: async (build) => {
        const saved = await repository().save(build)
        await refresh()
        return saved
      },
      remove: async (id) => {
        await repository().delete(id)
        await refresh()
      },
      duplicate: async (id) => {
        const original = await repository().get(id)
        if (!original) return null
        const names = get().list.builds.map((b) => b.name)
        const copy = await repository().save(duplicateBuild(original, createBuildId(), names))
        await refresh()
        return copy
      },
      importBuilds: async (builds) => {
        for (const build of builds) await repository().save(build, { keepUpdatedAt: true })
        await refresh()
        return builds.length
      },
      toggleFavorite: async (id) => {
        const build = await repository().get(id)
        if (!build) return
        await repository().save({ ...build, favorite: !build.favorite })
        await refresh()
      },
    }
  })
}

export const useBuildsStore = createBuildsStore(getBuildRepository)
