import { describe, expect, it } from 'vitest'
import itemsJson from '../engine/__fixtures__/items-16.22.1.json'
import { BRUISER } from '../engine/__fixtures__/compos'
import { templateIssues, type BuildTemplate } from '../engine/buildTemplates'
import type { PatchIndex } from '../engine/patchValidation'
import type { Item } from '../engine/types'
import fixture from './__fixtures__/runes-16.22.1.json'
import type { RawRuneTree, RawSummonerSpell } from './ddragonTypes'
import { buildRuneCatalog } from './runes'

/** Index du patch 16.22.1 construit comme dans l'app (items + runes + sorts). */
const runes = buildRuneCatalog({
  version: fixture.version,
  runeTrees: fixture.runeTrees as RawRuneTree[],
  summonerSpells: fixture.summonerSpells as Record<string, RawSummonerSpell>,
})
const patch: PatchIndex = {
  version: '16.22.1',
  championsById: new Map(),
  itemsById: new Map((itemsJson as Item[]).map((i) => [i.id, i])),
  ...runes,
}

const { runes: r, summonerSpells, useWhen, firstItemOptions, itemOrder } = BRUISER
const template: BuildTemplate = {
  id: 'test',
  name: 'Test',
  match: { positions: ['top'], tags: ['Fighter'] },
  runes: r,
  summonerSpells,
  useWhen,
  firstItemOptions,
  itemOrder,
}

describe('templateIssues', () => {
  it('modèle à jour : aucune alerte (le champion n’est pas vérifié)', () => {
    expect(templateIssues(template, patch)).toEqual([])
  })

  it('item disparu du patch : signalé avec son emplacement', () => {
    const old = {
      ...template,
      itemOrder: [{ slot: 1, default: '9999', alternatives: [] }, ...itemOrder.slice(1)],
    }
    expect(templateIssues(old, patch)).toEqual([
      expect.objectContaining({ path: 'itemOrder[0].default', kind: 'item', id: '9999' }),
    ])
  })
})
