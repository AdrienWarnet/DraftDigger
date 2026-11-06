import { describe, expect, it } from 'vitest'
import exampleJson from '../../data/builds/example.json'
import type { Build } from '../engine/types'
import { BuildStorageError, BuildValidationError } from './buildRepository'
import type { KeyValueStorage } from './ddragon'
import {
  BUILDS_SCHEMA_VERSION,
  BUILDS_STORAGE_KEY,
  createBuildId,
  createLocalBuildRepository,
} from './localBuildRepository'

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const example = exampleJson as Build

/** Build de test : copie de l'exemple avec un autre id, nom, champion ou poste. */
function testBuild(overrides: Partial<Build>): Build {
  return { ...structuredClone(example), ...overrides }
}

function setup(seed: unknown[] = []) {
  const storage = new MemoryStorage()
  let time = Date.parse('2026-11-06T10:00:00.000Z')
  const now = () => new Date((time += 1000))
  const repo = createLocalBuildRepository({ storage, seed, now })
  const stored = () => JSON.parse(storage.getItem(BUILDS_STORAGE_KEY) ?? 'null')
  return { storage, repo, stored }
}

describe('premier lancement', () => {
  it('charge le build d’exemple quand le stockage est vide, avec la version du format', async () => {
    const { repo, stored } = setup([exampleJson])
    const { builds, invalid } = await repo.list()
    expect(builds.map((b) => b.id)).toEqual(['exemple-yorick-top'])
    expect(invalid).toEqual([])
    expect(stored().schemaVersion).toBe(BUILDS_SCHEMA_VERSION)
  })

  it('ne recharge pas l’exemple une fois qu’il a été supprimé', async () => {
    const { repo } = setup([exampleJson])
    await repo.delete('exemple-yorick-top')
    expect((await repo.list()).builds).toEqual([])
    expect((await repo.list()).builds).toEqual([])
  })

  it('par défaut, le build d’exemple livré est utilisé', async () => {
    const repo = createLocalBuildRepository({ storage: new MemoryStorage() })
    expect((await repo.get('exemple-yorick-top'))?.championId).toBe('Yorick')
  })
})

describe('création, modification, suppression', () => {
  it('crée un build : validé, daté, placé à la fin de son champion et de son poste', async () => {
    const { repo } = setup()
    const a = await repo.save(testBuild({ id: 'a', order: 99 }))
    const b = await repo.save(testBuild({ id: 'b', order: 99 }))
    expect([a.order, b.order]).toEqual([0, 1])
    expect(a.updatedAt).toBe('2026-11-06T10:00:01.000Z')
    expect(await repo.get('b')).toEqual(b)
  })

  it('modifie un build existant sans changer son ordre ni dupliquer', async () => {
    const { repo } = setup()
    await repo.save(testBuild({ id: 'a' }))
    await repo.save(testBuild({ id: 'b' }))
    const edited = await repo.save({ ...(await repo.get('a'))!, name: 'Split push' })
    expect(edited.name).toBe('Split push')
    expect(edited.order).toBe(0)
    expect((await repo.list()).builds.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('changer le champion ou le poste place le build à la fin de son nouveau groupe', async () => {
    const { repo } = setup()
    await repo.save(testBuild({ id: 'jungle1', position: 'jungle' }))
    await repo.save(testBuild({ id: 'top1' }))
    const moved = await repo.save({ ...(await repo.get('top1'))!, position: 'jungle' })
    expect(moved.order).toBe(1)
  })

  it('refuse un build invalide avec la liste des erreurs, sans rien enregistrer', async () => {
    const { repo } = setup()
    const invalid = testBuild({ id: 'x', name: '' })
    await expect(repo.save(invalid)).rejects.toBeInstanceOf(BuildValidationError)
    await expect(repo.save(invalid)).rejects.toMatchObject({ errors: ['name : nom vide'] })
    expect((await repo.list()).builds).toEqual([])
  })

  it('supprime un build', async () => {
    const { repo } = setup()
    await repo.save(testBuild({ id: 'a' }))
    await repo.save(testBuild({ id: 'b' }))
    await repo.delete('a')
    expect((await repo.list()).builds.map((b) => b.id)).toEqual(['b'])
    expect(await repo.get('a')).toBeNull()
  })
})

describe('ordre et filtres', () => {
  it('liste triée par champion, poste puis ordre ; filtre par champion et poste', async () => {
    const { repo } = setup()
    await repo.save(testBuild({ id: 'yorick-jungle', position: 'jungle' }))
    await repo.save(testBuild({ id: 'darius-top', championId: 'Darius' }))
    await repo.save(testBuild({ id: 'yorick-top-1' }))
    await repo.save(testBuild({ id: 'yorick-top-2' }))
    expect((await repo.list()).builds.map((b) => b.id)).toEqual([
      'darius-top',
      'yorick-top-1',
      'yorick-top-2',
      'yorick-jungle',
    ])
    expect((await repo.listByChampion('Yorick')).map((b) => b.id)).toEqual([
      'yorick-top-1',
      'yorick-top-2',
      'yorick-jungle',
    ])
    expect((await repo.listByChampion('Yorick', 'top')).map((b) => b.id)).toEqual([
      'yorick-top-1',
      'yorick-top-2',
    ])
  })

  it('réordonne les builds', async () => {
    const { repo } = setup()
    for (const id of ['a', 'b', 'c']) await repo.save(testBuild({ id }))
    await repo.reorder(['c', 'a', 'b'])
    expect((await repo.listByChampion('Yorick', 'top')).map((b) => b.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('données corrompues', () => {
  it('un build invalide est signalé, conservé tel quel, et n’empêche pas les autres', async () => {
    const { repo, storage, stored } = setup()
    const broken = { id: 'casse', name: 'Build cassé', championId: 'Yorick' }
    storage.setItem(
      BUILDS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, builds: [example, broken] }),
    )

    const { builds, invalid } = await repo.list()
    expect(builds.map((b) => b.id)).toEqual(['exemple-yorick-top'])
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ id: 'casse', name: 'Build cassé' })
    expect(invalid[0]!.errors.length).toBeGreaterThan(0)

    await repo.save(testBuild({ id: 'nouveau' }))
    expect(stored().builds).toContainEqual(broken) // jamais supprimé automatiquement
  })

  it('sauvegarde illisible : mise de côté puis départ d’une liste vide', async () => {
    const { repo, storage } = setup([exampleJson])
    storage.setItem(BUILDS_STORAGE_KEY, '{pas du json')

    expect(await repo.list()).toEqual({ builds: [], invalid: [] })
    const backups = [...storage.values.keys()].filter((k) => k.includes('sauvegarde-illisible'))
    expect(backups).toHaveLength(1)
    expect(storage.getItem(backups[0]!)).toBe('{pas du json')
  })

  it('format d’une version inconnue : mis de côté aussi', async () => {
    const { repo, storage } = setup()
    storage.setItem(BUILDS_STORAGE_KEY, JSON.stringify({ schemaVersion: 99, builds: [example] }))
    expect((await repo.list()).builds).toEqual([])
    expect([...storage.values.keys()].some((k) => k.includes('sauvegarde-illisible'))).toBe(true)
  })

  it('stockage plein : erreur explicite', async () => {
    const { repo, storage } = setup()
    await repo.list()
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    await expect(repo.save(testBuild({ id: 'a' }))).rejects.toBeInstanceOf(BuildStorageError)
  })
})

describe('createBuildId', () => {
  it('génère des identifiants uniques', () => {
    expect(createBuildId()).not.toBe(createBuildId())
  })

  it('fonctionne sans crypto.randomUUID (HTTP en wifi)', () => {
    const original = crypto.randomUUID
    try {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
      expect(createBuildId()).toMatch(/^[0-9a-f]{32}$/)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})
