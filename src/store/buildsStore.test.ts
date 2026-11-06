import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import { createLocalBuildRepository } from '../data/localBuildRepository'
import type { Build } from '../engine/types'
import { createBuildsStore } from './buildsStore'

function setup() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => void values.set(k, v),
  }
  const repository = createLocalBuildRepository({ storage, seed: [example] })
  const store = createBuildsStore(() => repository)
  const ids = () => store.getState().list.builds.map((b) => b.id)
  return { store, repository, ids }
}

describe('buildsStore', () => {
  it('charge les builds (build d’exemple au premier lancement)', async () => {
    const { store, ids } = setup()
    expect(store.getState().status).toBe('idle')
    await store.getState().load()
    expect(store.getState().status).toBe('ready')
    expect(ids()).toEqual(['exemple-yorick-top'])
  })

  it('duplique, met en favori et supprime, en relisant le dépôt à chaque fois', async () => {
    const { store, repository, ids } = setup()
    await store.getState().load()
    const copy = await store.getState().duplicate('exemple-yorick-top')
    expect(copy?.name).toBe('Exemple Yorick top 2')
    expect(ids()).toEqual(['exemple-yorick-top', copy!.id])

    expect(copy?.favorite).toBe(false)
    await store.getState().toggleFavorite(copy!.id)
    expect(ids()).toEqual([copy!.id, 'exemple-yorick-top']) // le favori passe en tête
    await store.getState().toggleFavorite(copy!.id)
    expect(store.getState().list.builds.some((b) => b.favorite)).toBe(false)

    await store.getState().remove('exemple-yorick-top')
    expect(ids()).toEqual([copy!.id])
    expect((await repository.list()).builds.map((b) => b.id)).toEqual([copy!.id])
  })

  it('enregistre un build modifié', async () => {
    const { store } = setup()
    await store.getState().load()
    const build = store.getState().list.builds[0] as Build
    await store.getState().save({ ...build, name: 'Renommé' })
    expect(store.getState().list.builds[0]?.name).toBe('Renommé')
  })

  it('dupliquer un id inconnu ne fait rien', async () => {
    const { store, ids } = setup()
    await store.getState().load()
    expect(await store.getState().duplicate('inconnu')).toBeNull()
    expect(ids()).toEqual(['exemple-yorick-top'])
  })

  it('erreur de stockage : état « error »', async () => {
    const store = createBuildsStore(() => {
      throw new Error('stockage inaccessible')
    })
    await store.getState().load()
    expect(store.getState().status).toBe('error')
  })
})
