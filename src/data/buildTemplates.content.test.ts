import { describe, expect, it, vi } from 'vitest'
import templatesJson from '../../data/templates/builds.json'
import itemsJson from '../engine/__fixtures__/items-16.22.1.json'
import { champion } from '../engine/__fixtures__/compos'
import { parseTemplates, pickTemplate, templateIssues } from '../engine/buildTemplates'
import type { PatchIndex } from '../engine/patchValidation'
import { POSITIONS, type Item, type Position } from '../engine/types'
import fixture from './__fixtures__/runes-16.22.1.json'
import type { RawRuneTree, RawSummonerSpell } from './ddragonTypes'
import { buildRuneCatalog } from './runes'

/** Contenu livré de data/templates/builds.json (T10.2), vérifié contre le patch 16.22.1. */
const warn = vi.fn()
const templates = parseTemplates(templatesJson, warn)
const patch: PatchIndex = {
  version: '16.22.1',
  championsById: new Map(),
  itemsById: new Map((itemsJson as Item[]).map((i) => [i.id, i])),
  ...buildRuneCatalog({
    version: fixture.version,
    runeTrees: fixture.runeTrees as RawRuneTree[],
    summonerSpells: fixture.summonerSpells as Record<string, RawSummonerSpell>,
  }),
}

describe('modèles livrés', () => {
  it('tous valides, sans avertissement', () => {
    expect(warn).not.toHaveBeenCalled()
    expect(templates).toHaveLength(templatesJson.templates.length)
  })

  it('aucun id disparu au patch 16.22.1 (items, runes, fragments, sorts)', () => {
    const issues = templates.flatMap((t) =>
      templateIssues(t, patch).map((i) => `${t.id} ${i.message}`),
    )
    expect(issues).toEqual([])
  })

  it('chaque poste a au moins un modèle', () => {
    for (const position of POSITIONS) {
      expect(templates.some((t) => t.match.positions.includes(position))).toBe(true)
    }
  })

  it.each<[string, Position, string]>([
    ['Darius', 'top', 'top-combattant-ad'],
    ['Yorick', 'top', 'top-combattant-ad'],
    ['Vladimir', 'top', 'top-mage-ap'],
    ['Ornn', 'top', 'top-tank'],
    ['Graves', 'jungle', 'jungle-combattant-ad'],
    ['Elise', 'jungle', 'jungle-assassin-ap'],
    ['Sejuani', 'jungle', 'jungle-tank'],
    ['Ahri', 'mid', 'mid-mage-ap'],
    ['Zed', 'mid', 'mid-assassin-ad'],
    ['Jinx', 'bot', 'bot-tireur'],
    ['Leona', 'support', 'support-tank'],
    ['Soraka', 'support', 'support-enchanteur'],
  ])('%s %s → %s', (id, position, expected) => {
    expect(pickTemplate(champion(id), position, templates)?.template.id).toBe(expected)
  })
})
