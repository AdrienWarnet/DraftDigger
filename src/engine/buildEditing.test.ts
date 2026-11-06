import { describe, expect, it } from 'vitest'
import {
  chooseKeystone,
  choosePrimaryRune,
  choosePrimaryTree,
  chooseSecondaryTree,
  chooseShard,
  EMPTY_RUNES,
  missingChoices,
  newBuild,
  toggleSecondaryRune,
  toggleSpell,
  type RuneLocator,
} from './buildEditing'
import { validateBuild } from './buildSchema'
import type { BuildRunes } from './types'

// Extrait réel du patch 16.22.1 : Volonté (8400) et Précision (8000).
const RUNES: Record<string, { treeId: string; row: number }> = {
  '8437': { treeId: '8400', row: 0 }, // Poigne de l'immortel
  '8439': { treeId: '8400', row: 0 }, // Après-coup
  '8446': { treeId: '8400', row: 1 }, // Démolition
  '8463': { treeId: '8400', row: 1 }, // Fontaine de vie
  '8444': { treeId: '8400', row: 2 }, // Second souffle
  '8451': { treeId: '8400', row: 3 }, // Surcroissance
  '8010': { treeId: '8000', row: 0 }, // Conquérant
  '9111': { treeId: '8000', row: 1 }, // Triomphe
  '8009': { treeId: '8000', row: 1 }, // Présence d'esprit
  '9105': { treeId: '8000', row: 2 }, // Légende : accélération
  '8299': { treeId: '8000', row: 3 }, // Baroud d'honneur
}
const locate: RuneLocator = (id) => RUNES[id]
const SHARD_ROWS = [
  ['5008', '5005', '5007'],
  ['5008', '5010', '5001'],
  ['5011', '5013', '5001'],
]

function resolvePage(): BuildRunes {
  let r = choosePrimaryTree(EMPTY_RUNES, '8400')
  r = chooseKeystone(r, '8437', locate)
  for (const id of ['8446', '8444', '8451']) r = choosePrimaryRune(r, id, locate)
  r = chooseSecondaryTree(r, '8000')
  for (const id of ['9111', '9105']) r = toggleSecondaryRune(r, id, locate)
  ;['5008', '5008', '5011'].forEach((id, row) => (r = chooseShard(r, row, id, SHARD_ROWS)))
  return r
}

describe('saisie des runes', () => {
  it('une page complète se construit pas à pas', () => {
    expect(resolvePage()).toEqual({
      primaryTree: '8400',
      keystone: '8437',
      primarySlots: ['8446', '8444', '8451'],
      secondaryTree: '8000',
      secondarySlots: ['9111', '9105'],
      shards: ['5008', '5008', '5011'],
    })
  })

  it('refuse une rune clé ou mineure qui n’est pas de l’arbre principal ou de la bonne ligne', () => {
    const r = choosePrimaryTree(EMPTY_RUNES, '8400')
    expect(chooseKeystone(r, '8010', locate)).toBe(r) // Conquérant : autre arbre
    expect(chooseKeystone(r, '8446', locate)).toBe(r) // Démolition : pas une rune clé
    expect(choosePrimaryRune(r, '8437', locate)).toBe(r) // rune clé en rune mineure
    expect(choosePrimaryRune(r, 'inconnue', locate)).toBe(r)
  })

  it('une rune mineure remplace celle de sa ligne', () => {
    let r = choosePrimaryTree(EMPTY_RUNES, '8400')
    r = choosePrimaryRune(r, '8446', locate)
    r = choosePrimaryRune(r, '8463', locate)
    expect(r.primarySlots).toEqual(['8463', '', ''])
  })

  it('changer d’arbre principal efface ses runes ; prendre l’arbre secondaire le libère', () => {
    const page = resolvePage()
    const switched = choosePrimaryTree(page, '8000')
    expect(switched.keystone).toBe('')
    expect(switched.primarySlots).toEqual(['', '', ''])
    expect(switched.secondaryTree).toBe('')
    expect(switched.secondarySlots).toEqual(['', ''])
    expect(switched.shards).toEqual(page.shards)
  })

  it('l’arbre secondaire ne peut pas être l’arbre principal', () => {
    const r = choosePrimaryTree(EMPTY_RUNES, '8400')
    expect(chooseSecondaryTree(r, '8400')).toBe(r)
  })

  it('runes secondaires : 2 lignes différentes, comme en jeu', () => {
    let r = chooseSecondaryTree(choosePrimaryTree(EMPTY_RUNES, '8400'), '8000')
    r = toggleSecondaryRune(r, '9111', locate) // ligne 1
    r = toggleSecondaryRune(r, '8009', locate) // ligne 1 aussi : remplace Triomphe
    expect(r.secondarySlots).toEqual(['8009', ''])
    r = toggleSecondaryRune(r, '9105', locate) // ligne 2
    r = toggleSecondaryRune(r, '8299', locate) // ligne 3 : remplace la plus ancienne (ligne 1)
    expect(r.secondarySlots).toEqual(['9105', '8299'])
    r = toggleSecondaryRune(r, '9105', locate) // toucher une rune choisie la retire
    expect(r.secondarySlots).toEqual(['8299', ''])
    expect(toggleSecondaryRune(r, '8010', locate)).toBe(r) // rune clé : interdite en secondaire
    expect(toggleSecondaryRune(r, '8446', locate)).toBe(r) // autre arbre
  })

  it('un fragment doit appartenir à sa ligne', () => {
    expect(chooseShard(EMPTY_RUNES, 0, '5011', SHARD_ROWS)).toBe(EMPTY_RUNES)
    expect(chooseShard(EMPTY_RUNES, 2, '5011', SHARD_ROWS).shards).toEqual(['', '', '5011'])
  })
})

describe('toggleSpell', () => {
  it('2 sorts différents ; retirer en touchant ; un 3e remplace le plus ancien', () => {
    let spells = toggleSpell(['', ''], 'SummonerFlash')
    spells = toggleSpell(spells, 'SummonerTeleport')
    expect(spells).toEqual(['SummonerFlash', 'SummonerTeleport'])
    expect(toggleSpell(spells, 'SummonerDot')).toEqual(['SummonerTeleport', 'SummonerDot'])
    expect(toggleSpell(spells, 'SummonerFlash')).toEqual(['SummonerTeleport', ''])
  })
})

describe('newBuild et missingChoices', () => {
  it('un nouveau build liste tout ce qui manque', () => {
    const build = newBuild('id', 'Yorick', 'top', new Date('2026-11-06T10:00:00Z'))
    expect(missingChoices(build)).toEqual([
      'le nom',
      "l'arbre principal",
      "l'arbre secondaire",
      '3 fragments',
      "2 sorts d'invocateur",
    ])
  })

  it('une fois tout choisi, rien ne manque et le build est valide (items par défaut)', () => {
    const build = {
      ...newBuild('id', 'Yorick', 'top', new Date('2026-11-06T10:00:00Z')),
      name: 'Duelliste',
      runes: resolvePage(),
      summonerSpells: ['SummonerFlash', 'SummonerTeleport'] as [string, string],
    }
    expect(missingChoices(build)).toEqual([])
    const result = validateBuild(build)
    expect(result.ok ? [] : result.errors).toEqual([])
  })
})
