import { describe, expect, it, vi } from 'vitest'
import championOverridesJson from '../../data/overrides/champions.json'
import itemOverridesJson from '../../data/overrides/items.json'
import championFixture from './__fixtures__/champions-16.22.1.json'
import itemFixture from './__fixtures__/items-16.22.1.json'
import { buildCatalog } from './catalog'
import type { DDragonData, RawChampion, RawItem } from './ddragonTypes'
import {
  applyChampionOverrides,
  applyItemOverrides,
  parseChampionOverrides,
  parseItemOverrides,
} from './overrides'

const data: DDragonData = {
  version: '16.22.1',
  champions: championFixture.champions as Record<string, RawChampion>,
  items: itemFixture.items as Record<string, RawItem>,
  runeTrees: [],
  summonerSpells: {},
}
const silent = () => {}

describe('fichiers d’overrides livrés', () => {
  it('data/overrides/champions.json est valide (aucun avertissement)', () => {
    const warn = vi.fn()
    const overrides = parseChampionOverrides(championOverridesJson, warn)
    expect(warn).not.toHaveBeenCalled()
    expect(overrides.Warwick?.threats?.heal).toBe(3)
    expect(overrides.DrMundo?.threats?.heal).toBe(3)
    expect(overrides._format).toBeUndefined()
  })

  it('data/overrides/items.json est valide (aucun avertissement)', () => {
    const warn = vi.fn()
    const overrides = parseItemOverrides(itemOverridesJson, warn)
    expect(warn).not.toHaveBeenCalled()
    expect(overrides['3036']?.addCategories).toEqual(['antitank'])
  })
})

describe('applyChampionOverrides', () => {
  const base = buildCatalog(data, { championOverrides: {}, warn: silent }).champions

  it('complète les menaces sans toucher aux autres', () => {
    const overrides = parseChampionOverrides({ Soraka: { threats: { heal: 3 } } }, silent)
    const soraka = applyChampionOverrides(base, overrides, silent).find((c) => c.id === 'Soraka')!
    expect(soraka.threats).toEqual({ cc: 1, burst: 1, engage: 0, heal: 3, tank: 0 })
  })

  it('remplace les dégâts et les ramène à une somme de 1', () => {
    const overrides = parseChampionOverrides({ Zed: { damage: { ad: 0.6, ap: 0.2 } } }, silent)
    const zed = applyChampionOverrides(base, overrides, silent).find((c) => c.id === 'Zed')!
    expect(zed.damage.ad).toBeCloseTo(0.75)
    expect(zed.damage.ap).toBeCloseTo(0.25)
    expect(zed.damage.true).toBe(0)
  })

  it('remplace les tags', () => {
    const overrides = parseChampionOverrides({ Lux: { tags: ['Mage'] } }, silent)
    expect(
      applyChampionOverrides(base, overrides, silent).find((c) => c.id === 'Lux')?.tags,
    ).toEqual(['Mage'])
  })

  it('id inconnu : avertissement, pas de crash, les autres corrections s’appliquent', () => {
    const warn = vi.fn()
    const overrides = parseChampionOverrides(
      { Inconnu: { threats: { heal: 3 } }, Jinx: { threats: { burst: 2 } } },
      warn,
    )
    const result = applyChampionOverrides(base, overrides, warn)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« Inconnu » inconnu'))
    expect(result.find((c) => c.id === 'Jinx')?.threats.burst).toBe(2)
    expect(result).toHaveLength(base.length)
  })

  it('entrée invalide : avertissement qui désigne le champ, entrée ignorée', () => {
    const warn = vi.fn()
    const overrides = parseChampionOverrides(
      {
        Jinx: { threats: { heal: 5 } },
        Lux: { damage: { ad: 0, ap: 0 } },
        Zed: { tags: 'Assassin' },
        Malphite: 'tank',
      },
      warn,
    )
    expect(overrides).toEqual({})
    expect(warn).toHaveBeenCalledTimes(4)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« threats »'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« damage »'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« tags »'))
  })

  it('fichier qui n’est pas un objet : ignoré avec avertissement', () => {
    const warn = vi.fn()
    expect(parseChampionOverrides([], warn)).toEqual({})
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('applyItemOverrides', () => {
  const base = buildCatalog(data, { itemOverrides: {}, warn: silent }).items

  it('ajoute et retire des catégories', () => {
    const overrides = parseItemOverrides(
      { '6694': { addCategories: ['antitank'], removeCategories: ['haste'] } },
      silent,
    )
    const item = applyItemOverrides(base, overrides, silent).find((i) => i.id === '6694')!
    expect(item.categories).toContain('antitank')
    expect(item.categories).not.toContain('haste')
    expect(item.categories).toEqual([...item.categories].sort())
  })

  it('id inconnu ou entrée invalide : avertissement, pas de crash', () => {
    const warn = vi.fn()
    const overrides = parseItemOverrides(
      { '9999': { addCategories: ['antitank'] }, '3065': { addCategories: 'mr' } },
      warn,
    )
    expect(applyItemOverrides(base, overrides, warn)).toHaveLength(base.length)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« 3065 » ignoré'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('« 9999 » inconnu'))
  })
})

describe('buildCatalog', () => {
  it('modifier un override change le champion et l’item, sans toucher au code', () => {
    const catalog = buildCatalog(data, {
      championOverrides: parseChampionOverrides({ Malphite: { threats: { heal: 2 } } }, silent),
      itemOverrides: parseItemOverrides({ '1029': { addCategories: ['antitank'] } }, silent),
      warn: silent,
    })
    expect(catalog.championsById.get('Malphite')?.threats.heal).toBe(2)
    expect(catalog.itemsById.get('1029')?.categories).toContain('antitank')
  })

  it('applique les overrides livrés par défaut', () => {
    const catalog = buildCatalog(data, { warn: silent })
    expect(catalog.championsById.get('Soraka')?.threats.heal).toBe(3)
    expect(catalog.itemsById.get('6694')?.categories).toContain('antitank')
    expect(catalog.version).toBe('16.22.1')
  })
})
