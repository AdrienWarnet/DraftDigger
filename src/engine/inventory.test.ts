import { describe, expect, it } from 'vitest'
import { BRUISER, itemsById } from './__fixtures__/compos'
import {
  buildSuggestions,
  buyItem,
  componentTarget,
  isInRecipe,
  freeSlots,
  parseOwnedItems,
  questSlotItemIndex,
  removeItem,
  replaceItem,
} from './inventory'

// Ids du patch 16.22.1 : 1055 Lame de Doran, 1036 Épée longue, 1028 Cristal de rubis,
// 2021 Foreuse (1036 + 1028), 3133 Marteau de Caulfield (1036 + 2022 + 1036),
// 6610 Ciel éventré (2021 + 3133), 2022 Poussière luisante, 1029 Armure d'étoffe, 3047 Coques en acier.

describe('buyItem', () => {
  it('ajoute un item en fin de liste', () => {
    expect(buyItem(['1055'], '1036', itemsById)).toEqual(['1055', '1036'])
  })

  it('consomme les composants possédés, comme en jeu', () => {
    expect(buyItem(['1055', '1036', '1028'], '2021', itemsById)).toEqual(['1055', '2021'])
  })

  it('consomme aussi les composants de composants manquants', () => {
    // Ciel éventré : Foreuse possédée, Marteau manquant → ses 2 Épées longues sont consommées.
    expect(buyItem(['1055', '2021', '1036', '1036', '1028'], '6610', itemsById)).toEqual([
      '1055',
      '1028',
      '6610',
    ])
  })

  it('refuse un achat quand les 6 emplacements sont pris', () => {
    const full = ['1055', '1054', '1001', '2022', '1029', '1038']
    expect(buyItem(full, '1036', itemsById)).toEqual(full)
  })

  it("accepte un achat avec inventaire plein s'il libère des composants", () => {
    const full = ['1055', '1036', '1028', '1001', '2022', '1029']
    expect(buyItem(full, '2021', itemsById)).toEqual(['1055', '1001', '2022', '1029', '2021'])
  })
})

describe('removeItem et replaceItem', () => {
  it('retire et corrige un item à sa place', () => {
    expect(removeItem(['1055', '1036', '1028'], 1)).toEqual(['1055', '1028'])
    expect(replaceItem(['1055', '1036'], 0, '1054')).toEqual(['1054', '1036'])
  })

  it('ignore une place inexistante', () => {
    expect(replaceItem(['1055'], 3, '1054')).toEqual(['1055'])
    expect(removeItem(['1055'], 3)).toEqual(['1055'])
  })
})

describe('isInRecipe', () => {
  it('cherche à toutes les profondeurs de la recette', () => {
    expect(isInRecipe('2021', '6610', itemsById)).toBe(true)
    expect(isInRecipe('1028', '6610', itemsById)).toBe(true)
    expect(isInRecipe('1029', '6610', itemsById)).toBe(false)
    expect(isInRecipe('1036', 'inconnu', itemsById)).toBe(false)
  })
})

describe('componentTarget', () => {
  it('un composant progresse vers le premier item du build qui le contient', () => {
    expect(componentTarget('1036', BRUISER, ['1036'], itemsById)).toBe('6610')
    expect(componentTarget('2022', BRUISER, [], itemsById)).toBe('6610')
    // Armure d'étoffe : pas dans le Ciel éventré ni la Force de la trinité → Coques en acier.
    expect(componentTarget('1029', BRUISER, ['1029'], itemsById)).toBe('3047')
  })

  it('ignore les slots déjà couverts', () => {
    expect(componentTarget('1029', BRUISER, ['3047', '1029'], itemsById)).not.toBe('3047')
  })

  it("renvoie null pour un item qui n'entre dans aucun item du build", () => {
    expect(componentTarget('inconnu', BRUISER, [], itemsById)).toBeNull()
  })
})

describe('buildSuggestions', () => {
  it('début de partie : premiers items, composants du prochain item, puis les slots', () => {
    expect(buildSuggestions(BRUISER, [], itemsById).slice(0, 11)).toEqual([
      '1055',
      '1054',
      '2021',
      '3133',
      '1036',
      '1028',
      '2022',
      '6610',
      '3078',
      '3047',
      '3111',
    ])
  })

  it('premier item acheté : plus proposé, on passe aux composants', () => {
    expect(buildSuggestions(BRUISER, ['1055'], itemsById).slice(0, 6)).toEqual([
      '2021',
      '3133',
      '1036',
      '1028',
      '2022',
      '6610',
    ])
  })

  it('un composant possédé masque sa recette', () => {
    expect(buildSuggestions(BRUISER, ['1055', '2021'], itemsById).slice(0, 4)).toEqual([
      '3133',
      '1036',
      '2022',
      '6610',
    ])
  })

  it('premier slot acheté : composants du slot suivant', () => {
    const ids = buildSuggestions(BRUISER, ['1055', '6610'], itemsById)
    expect(ids.slice(0, 3)).toEqual(['1001', '1029', '3047'])
    expect(ids).not.toContain('6610')
    expect(ids).not.toContain('3078')
  })
})

describe('parseOwnedItems', () => {
  it('garde les ids lisibles, 6 au plus', () => {
    expect(parseOwnedItems(['1055', 3, '', '1036'])).toEqual(['1055', '1036'])
    expect(parseOwnedItems('x')).toEqual([])
    expect(parseOwnedItems(['1', '2', '3', '4', '5', '6', '7', '8'])).toHaveLength(7)
  })
})

describe('emplacement de quête (quête Bot terminée : les bottes à part)', () => {
  const bot = { dedicatedSlot: 'boots' } as const
  // 3047 Coques en acier (bottes), 1001 Bottes, 3111 Sandales de Mercure.
  const sixWithBoots = ['1055', '6610', '3047', '3071', '3053', '6333']

  it('sans quête : 6 items bottes comprises, inventaire plein', () => {
    expect(freeSlots(sixWithBoots, itemsById)).toBe(0)
    expect(buyItem(sixWithBoots, '6694', itemsById)).toEqual(sixWithBoots)
  })

  it('quête terminée : les bottes ne comptent plus, un emplacement se libère', () => {
    expect(questSlotItemIndex(sixWithBoots, itemsById, bot)).toBe(2)
    expect(freeSlots(sixWithBoots, itemsById, bot)).toBe(1)
    expect(buyItem(sixWithBoots, '6694', itemsById, bot)).toEqual([...sixWithBoots, '6694'])
  })

  it('6 items sans bottes : les bottes vont dans l’emplacement de quête', () => {
    const six = ['1055', '6610', '3071', '3053', '6333', '6694']
    expect(buyItem(six, '1001', itemsById)).toEqual(six)
    expect(buyItem(six, '1001', itemsById, bot)).toEqual([...six, '1001'])
    // Améliorer les bottes : elles restent dans l'emplacement de quête.
    expect(buyItem([...six, '1001'], '3111', itemsById, bot)).toEqual([...six, '3111'])
    // Une 2e paire de bottes n'a plus de place.
    expect(buyItem([...six, '1001'], '1001', itemsById, bot)).toEqual([...six, '1001'])
  })
})
