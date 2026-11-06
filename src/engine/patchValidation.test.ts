import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import { buildAlerts, validateBuildAgainstData, type PatchIndex } from './patchValidation'
import type { Build } from './types'

// Index de patch minimal contenant tout ce qu'utilise le build d'exemple (ids réels 16.22.1).
const set = (ids: string[]) => new Map(ids.map((id) => [id, {}]))
const patch: PatchIndex = {
  version: '16.22.1',
  championsById: set(['Yorick', 'Darius']),
  itemsById: set([
    '1055',
    '1054',
    '6610',
    '3078',
    '3047',
    '3111',
    '3071',
    '3065',
    '3053',
    '3075',
    '6333',
    '6694',
    '3742',
  ]),
  treesById: set(['8400', '8000', '8100']),
  runesById: new Map([
    ['8437', { treeId: '8400', row: 0 }], // Poigne de l'immortel
    ['8446', { treeId: '8400', row: 1 }], // Démolition
    ['8444', { treeId: '8400', row: 2 }], // Second souffle
    ['8451', { treeId: '8400', row: 3 }], // Surcroissance
    ['8473', { treeId: '8400', row: 2 }], // Plaque d'os
    ['9111', { treeId: '8000', row: 1 }], // Triomphe
    ['9105', { treeId: '8000', row: 2 }], // Légende : accélération
    ['9104', { treeId: '8000', row: 2 }], // Légende : alacrité
    ['8010', { treeId: '8000', row: 0 }], // Conquérant
  ]),
  summonerSpellsById: set(['SummonerFlash', 'SummonerTeleport', 'SummonerDot']),
  shardRows: [
    { shards: [{ id: '5008' }, { id: '5005' }, { id: '5007' }] },
    { shards: [{ id: '5008' }, { id: '5010' }, { id: '5001' }] },
    { shards: [{ id: '5011' }, { id: '5013' }, { id: '5001' }] },
  ],
}

function exampleCopy(): Build {
  return structuredClone(example) as Build
}

describe('validateBuildAgainstData', () => {
  it('le build d’exemple est entièrement valide pour le patch', () => {
    expect(validateBuildAgainstData(exampleCopy(), patch)).toEqual([])
  })

  it('critère du ticket : un item inexistant est listé avec son emplacement', () => {
    const build = exampleCopy()
    build.itemOrder[0]!.alternatives[0]!.itemId = '9999'
    expect(validateBuildAgainstData(build, patch)).toEqual([
      {
        path: 'itemOrder[0].alternatives[0].itemId',
        kind: 'item',
        id: '9999',
        problem: 'unknown',
        message: 'Item 9999 introuvable dans le patch 16.22.1.',
      },
    ])
  })

  it('liste chaque id inconnu : champion, arbre, rune, sort, fragment, items', () => {
    const build = exampleCopy()
    build.championId = 'Inconnu'
    build.runes.secondaryTree = '8999'
    build.runes.primarySlots[0] = '1234'
    build.summonerSpells[1] = 'SummonerVieux'
    build.runes.shards[2] = '5999'
    build.firstItemOptions[0]!.itemId = '1111'
    build.itemOrder[5]!.default = '2222'
    const issues = validateBuildAgainstData(build, patch)
    expect(issues.map((i) => `${i.kind}:${i.id}:${i.path}`)).toEqual([
      'champion:Inconnu:championId',
      'runeTree:8999:runes.secondaryTree',
      'rune:1234:runes.primarySlots[0]',
      'shard:5999:runes.shards[2]',
      'summonerSpell:SummonerVieux:summonerSpells[1]',
      'item:1111:firstItemOptions[0].itemId',
      'item:2222:itemOrder[5].default',
    ])
    expect(issues.every((i) => i.problem === 'unknown')).toBe(true)
  })

  it('signale une rune qui n’est plus dans son arbre ou à sa ligne', () => {
    const build = exampleCopy()
    build.runes.keystone = '8010' // Conquérant : arbre Précision, pas Volonté
    build.runes.primarySlots[0] = '8473' // Plaque d'os : ligne 2, pas ligne 1
    const issues = validateBuildAgainstData(build, patch)
    expect(issues.map((i) => [i.path, i.problem, i.message])).toEqual([
      ['runes.keystone', 'misplaced', "Rune 8010 : n'appartient plus à l'arbre 8400."],
      ['runes.primarySlots[0]', 'misplaced', "Rune 8473 : n'est plus à cette ligne de l'arbre."],
    ])
  })

  it('runes secondaires sur la même ligne, fragment sur la mauvaise ligne', () => {
    const build = exampleCopy()
    build.runes.secondarySlots = ['9105', '9104'] // deux runes de la ligne 2
    build.runes.shards[0] = '5011' // PV : ligne Défense, pas Attaque
    const issues = validateBuildAgainstData(build, patch)
    expect(issues.map((i) => i.path)).toEqual(['runes.secondarySlots[1]', 'runes.shards[0]'])
    expect(issues.every((i) => i.problem === 'misplaced')).toBe(true)
  })

  it('un arbre inconnu ne produit pas d’erreur en cascade sur ses runes connues', () => {
    const build = exampleCopy()
    build.runes.primaryTree = '7777'
    expect(validateBuildAgainstData(build, patch).map((i) => i.path)).toEqual(['runes.primaryTree'])
  })

  it('utilise les noms quand le patch les fournit', () => {
    const named: PatchIndex = {
      ...patch,
      treesById: new Map([
        ['8400', { name: 'Volonté' }],
        ['8000', { name: 'Précision' }],
      ]),
      runesById: new Map([...patch.runesById].map(([id, r]) => [id, { ...r, name: `Rune-${id}` }])),
    }
    const build = exampleCopy()
    build.runes.keystone = '8010'
    expect(validateBuildAgainstData(build, named).map((i) => i.message)).toEqual([
      "Rune Rune-8010 : n'appartient plus à l'arbre Volonté.",
    ])
  })
})

describe('buildAlerts', () => {
  it('garde seulement les builds à revoir, avec leurs problèmes', () => {
    const ok = exampleCopy()
    const broken = { ...exampleCopy(), id: 'ancien' }
    broken.itemOrder[0]!.default = '9999'
    const alerts = buildAlerts([ok, broken], patch)
    expect(alerts.map((a) => [a.build.id, a.issues.map((i) => i.id)])).toEqual([
      ['ancien', ['9999']],
    ])
    expect(buildAlerts([ok], patch)).toEqual([])
  })
})
