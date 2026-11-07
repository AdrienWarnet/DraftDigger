import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/items-16.22.1.json'
import type { RawItem } from './ddragonTypes'
import {
  buildItems,
  DEFAULT_ITEM_CATEGORY_RULES,
  isSummonersRiftItem,
  itemCategories,
  parseItemCategoryRules,
} from './items'

// Items réels du patch 16.22.1 (fr_FR), dont des cas à exclure.
const raw = fixture.items as Record<string, RawItem>
const items = buildItems({ version: fixture.version, items: raw })
const byId = Object.fromEntries(items.map((i) => [i.id, i]))

describe('buildItems : filtrage', () => {
  it('garde uniquement les items achetables sur la Faille', () => {
    expect(items.map((i) => i.id).sort()).toEqual(
      ['1028', '1029', '3065', '3075', '3123', '3165', '6694'].sort(),
    )
  })

  it('exclut un item hors Faille, non achetable ou réservé à un champion', () => {
    expect(byId['1040']).toBeUndefined() // Lame d'obsidienne : hors Faille
    expect(byId['1501']).toBeUndefined() // Fortification : non achetable
    expect(byId['3330']).toBeUndefined() // Effigie d'épouvantail : réservé à Fiddlesticks
  })

  it('exclut les ids de plus de 4 chiffres (variantes de modes ou d’événements)', () => {
    expect(isSummonersRiftItem('663056', { ...raw['3075']! })).toBe(false)
    expect(isSummonersRiftItem('3075', raw['3075']!)).toBe(true)
  })

  it('élimine la variante d’un autre mode qui porte le même nom', () => {
    expect(byId['323075']).toBeUndefined()
    expect(items.filter((i) => i.name === 'Cotte épineuse')).toHaveLength(1)
  })
})

describe('buildItems : 5 items représentatifs', () => {
  it('armure : Armure d’étoffe', () => {
    expect(byId['1029']).toMatchObject({
      name: "Armure d'étoffe",
      cost: 300,
      stats: { armor: 15 },
      categories: ['armor'],
      buildsFrom: [],
    })
  })

  it('RM + PV : Visage spirituel', () => {
    const item = byId['3065']!
    expect(item.stats).toEqual({ mr: 50, hp: 400 })
    expect(item.categories).toEqual(expect.arrayContaining(['mr', 'hp']))
    expect(item.categories).not.toContain('antiheal')
    expect(item.buildsFrom).toEqual(['3211', '3067'])
    expect(item.cost).toBe(2700)
  })

  it('PV : Cristal de rubis', () => {
    expect(byId['1028']?.stats).toEqual({ hp: 150 })
    expect(byId['1028']?.categories).toEqual(['hp'])
  })

  it('anti-soin : Morellonomicon (« Hémorragie » dans la description)', () => {
    const item = byId['3165']!
    expect(item.categories).toEqual(expect.arrayContaining(['antiheal', 'ap', 'hp']))
  })

  it('armure + anti-soin : Cotte épineuse', () => {
    expect(byId['3075']?.categories).toEqual(expect.arrayContaining(['armor', 'hp', 'antiheal']))
  })

  it('sans stat défensive : Rancune de Serylda', () => {
    const item = byId['6694']!
    expect(item.stats).toEqual({ ad: 45 })
    expect(item.categories).toEqual(expect.arrayContaining(['ad', 'armorpen']))
    for (const defensive of ['armor', 'mr', 'hp']) expect(item.categories).not.toContain(defensive)
  })

  it('construit l’URL de l’image pour le patch', () => {
    expect(byId['3065']?.image).toBe(
      'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/item/3065.png',
    )
  })
})

describe('itemCategories', () => {
  it('se règle via le fichier de catégories sans toucher au code', () => {
    const rules = parseItemCategoryRules({
      fromTags: {},
      fromDescription: { antitank: ['PV max'] },
    })
    const item = { ...raw['3123']!, description: 'Dégâts selon les PV max de la cible' }
    expect(itemCategories(item, rules)).toContain('antitank')
  })

  it('le fichier par défaut détecte l’anti-soin par « Hémorragie »', () => {
    expect(DEFAULT_ITEM_CATEGORY_RULES.fromDescription.antiheal).toContain('Hémorragie')
  })
})

describe('parseItemCategoryRules', () => {
  it('rejette un tag sans catégorie en désignant le champ', () => {
    expect(() => parseItemCategoryRules({ fromTags: { Armor: 3 }, fromDescription: {} })).toThrow(
      '« fromTags.Armor »',
    )
  })

  it('rejette des mots-clés qui ne sont pas une liste', () => {
    expect(() =>
      parseItemCategoryRules({ fromTags: {}, fromDescription: { antiheal: 'Hémorragie' } }),
    ).toThrow('« fromDescription.antiheal »')
  })

  it('rejette un fichier sans « fromTags »', () => {
    expect(() => parseItemCategoryRules({ fromDescription: {} })).toThrow('« fromTags »')
  })
})

describe('buildItems : noms anglais', () => {
  it('ajoute le nom et les surnoms anglais aux alias, sans doublon', () => {
    const withEn = buildItems({
      version: fixture.version,
      items: raw,
      itemNamesEn: { '3065': { name: 'Spirit Visage', colloq: 'sv;Spirit Visage' } },
    })
    expect(withEn.find((i) => i.id === '3065')?.aliases).toEqual(['Spirit Visage', 'sv'])
  })

  it('sans noms anglais, les alias restent ceux du français', () => {
    expect(byId['3065']?.aliases).not.toContain('Spirit Visage')
  })
})
