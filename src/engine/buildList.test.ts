import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import { duplicateBuild, filterBuilds, groupBuilds } from './buildList'
import type { Build } from './types'

function b(id: string, championId: string, position: Build['position'], order: number): Build {
  return { ...structuredClone(example as Build), id, championId, position, order, name: id }
}

const builds = [
  b('yorick-jungle', 'Yorick', 'jungle', 0),
  b('yorick-top-2', 'Yorick', 'top', 1),
  b('darius-top', 'Darius', 'top', 0),
  b('yorick-top-1', 'Yorick', 'top', 0),
  b('wukong-top', 'MonkeyKing', 'top', 0),
]
const names: Record<string, string> = { Yorick: 'Yorick', Darius: 'Darius', MonkeyKing: 'Wukong' }

describe('groupBuilds', () => {
  it('par champion (nom affiché, ordre alphabétique) puis par poste, triés par ordre', () => {
    const groups = groupBuilds(builds, (id) => names[id] ?? id)
    expect(
      groups.map((g) => [
        g.championId,
        g.positions.map((p) => [p.position, p.builds.map((x) => x.id)]),
      ]),
    ).toEqual([
      ['Darius', [['top', ['darius-top']]]],
      ['MonkeyKing', [['top', ['wukong-top']]]],
      [
        'Yorick',
        [
          ['top', ['yorick-top-1', 'yorick-top-2']],
          ['jungle', ['yorick-jungle']],
        ],
      ],
    ])
  })

  it('le favori passe en tête de son groupe', () => {
    const withFavorite = builds.map((x) => (x.id === 'yorick-top-2' ? { ...x, favorite: true } : x))
    const yorick = groupBuilds(withFavorite).find((g) => g.championId === 'Yorick')!
    expect(yorick.positions[0]!.builds.map((x) => x.id)).toEqual(['yorick-top-2', 'yorick-top-1'])
  })

  it('aucun build : aucun groupe', () => {
    expect(groupBuilds([])).toEqual([])
  })
})

describe('filterBuilds', () => {
  it('filtre par champion, par poste, ou les deux', () => {
    expect(filterBuilds(builds, { championId: 'Yorick' })).toHaveLength(3)
    expect(filterBuilds(builds, { position: 'top' })).toHaveLength(4)
    expect(
      filterBuilds(builds, { championId: 'Yorick', position: 'top' }).map((x) => x.id),
    ).toEqual(['yorick-top-2', 'yorick-top-1'])
    expect(filterBuilds(builds, {})).toHaveLength(5)
  })
})

describe('duplicateBuild', () => {
  it('nouvel id, nom numéroté, contenu identique et indépendant, jamais favori', () => {
    const original = { ...builds[0]!, name: 'Duelliste', favorite: true }
    const copy = duplicateBuild(original, 'nouvel-id')
    expect(copy.id).toBe('nouvel-id')
    expect(copy.name).toBe('Duelliste 2')
    expect(copy.favorite).toBe(false)
    expect(copy.itemOrder).toEqual(original.itemOrder)
    copy.itemOrder[0]!.default = 'autre'
    expect(original.itemOrder[0]!.default).not.toBe('autre')
  })

  it('choisit le premier numéro libre et repart du nom sans numéro', () => {
    const original = { ...builds[0]!, name: 'Duelliste' }
    expect(duplicateBuild(original, 'x', ['Duelliste', 'Duelliste 2']).name).toBe('Duelliste 3')
    expect(
      duplicateBuild({ ...original, name: 'Duelliste 2' }, 'x', ['Duelliste', 'Duelliste 2']).name,
    ).toBe('Duelliste 3')
  })

  it('reste dans la limite de 24 caractères', () => {
    const long = { ...builds[0]!, name: 'Lethality early snowball' } // 24 caractères
    const copy = duplicateBuild(long, 'x')
    expect(copy.name).toBe('Lethality early snowba 2')
    expect(copy.name.length).toBeLessThanOrEqual(24)
  })
})
