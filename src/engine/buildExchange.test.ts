import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import {
  createBuildExport,
  exportFileName,
  findConflicts,
  parseBuildImport,
  prepareImport,
  shouldRemindExport,
} from './buildExchange'
import type { Build } from './types'

const build = (over: Partial<Build> = {}): Build => ({
  ...structuredClone(example as Build),
  ...over,
})
const now = new Date('2026-11-06T10:00:00Z')

describe('export', () => {
  it('fichier versionné, relisable tel quel', () => {
    const builds = [build(), build({ id: 'b', name: 'Split push' })]
    const file = createBuildExport(builds, now)
    expect(file).toMatchObject({
      app: 'DraftDigger',
      type: 'builds',
      schemaVersion: 1,
      exportedAt: now.toISOString(),
    })
    const parsed = parseBuildImport(JSON.stringify(file))
    expect(parsed).toEqual({ ok: true, builds, invalid: [] })
  })

  it('nom de fichier : date pour plusieurs builds, nom du build pour un seul', () => {
    expect(exportFileName([build(), build()], now)).toBe('draftdigger-builds-2026-11-06.json')
    expect(exportFileName([build({ name: 'Anti-burst Élite' })], now)).toBe(
      'draftdigger-anti-burst-elite.json',
    )
  })
})

describe('parseBuildImport', () => {
  it('accepte une liste de builds ou un build seul', () => {
    expect(parseBuildImport(JSON.stringify([build()]))).toMatchObject({
      ok: true,
      builds: [build()],
    })
    expect(parseBuildImport(JSON.stringify(build()))).toMatchObject({ ok: true, builds: [build()] })
  })

  it('fichier illisible ou sans builds : refusé avec un message clair', () => {
    expect(parseBuildImport('{pas du json')).toEqual({
      ok: false,
      error: "Ce fichier n'est pas un fichier JSON lisible.",
    })
    expect(parseBuildImport(JSON.stringify({ hello: 1 }))).toEqual({
      ok: false,
      error: 'Ce fichier ne contient pas de builds DraftDigger.',
    })
    expect(parseBuildImport(JSON.stringify({ builds: [] }))).toEqual({
      ok: false,
      error: 'Ce fichier ne contient aucun build.',
    })
  })

  it('format d’une autre version de l’app : refusé', () => {
    const file = { ...createBuildExport([build()], now), schemaVersion: 9 }
    expect(parseBuildImport(JSON.stringify(file))).toMatchObject({ ok: false })
  })

  it('builds invalides listés à part avec leurs erreurs, les autres restent importables', () => {
    const parsed = parseBuildImport(JSON.stringify([build(), { ...build({ id: 'x' }), name: '' }]))
    expect(parsed.ok && parsed.builds).toHaveLength(1)
    expect(parsed.ok && parsed.invalid).toEqual([
      { index: 1, name: '', errors: ['name : nom vide'] },
    ])
  })
})

describe('conflits', () => {
  const existing = [build(), build({ id: 'b', name: 'Exemple Yorick top 2' })]
  const incoming = [
    build({ name: 'Exemple Yorick top', favorite: true }),
    build({ id: 'nouveau', name: 'Nouveau' }),
  ]
  let n = 0
  const newId = () => `id-${++n}`

  it('détecte les builds déjà présents (même id)', () => {
    expect(findConflicts(existing, incoming).map((b) => b.id)).toEqual(['exemple-yorick-top'])
  })

  it('remplacer : les builds sont importés tels quels', () => {
    expect(prepareImport(existing, incoming, 'replace', newId)).toEqual(incoming)
  })

  it('garder les deux : le build en conflit devient une copie numérotée, non favorite', () => {
    const prepared = prepareImport(existing, incoming, 'keepBoth', newId)
    expect(prepared[0]).toMatchObject({ id: 'id-1', name: 'Exemple Yorick top 3', favorite: false })
    expect(prepared[1]).toEqual(incoming[1])
  })
})

describe('shouldRemindExport', () => {
  const day = 24 * 60 * 60 * 1000
  const at = (days: number) => new Date(now.getTime() - days * day)
  const changed = build({ id: 'mien', updatedAt: at(10).toISOString() })

  it('jamais exporté : rappel dès qu’il y a un build à soi (pas le build d’exemple)', () => {
    expect(shouldRemindExport([build()], null, now, ['exemple-yorick-top'])).toBe(false)
    expect(shouldRemindExport([build(), changed], null, now, ['exemple-yorick-top'])).toBe(true)
  })

  it('exporté il y a 7 jours ou plus, avec des changements depuis : rappel', () => {
    const recent = build({ id: 'mien', updatedAt: at(1).toISOString() })
    expect(shouldRemindExport([recent], at(8), now)).toBe(true)
    expect(shouldRemindExport([recent], at(3), now)).toBe(false) // export récent
    expect(shouldRemindExport([changed], at(8), now)).toBe(false) // rien changé depuis l'export
  })
})
