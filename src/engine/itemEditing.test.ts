import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import {
  moveSlot,
  removeAlternative,
  removeFirstItemOption,
  removeSlot,
  setAlternative,
  setFirstItemOption,
  setSlotItem,
} from './buildEditing'
import { validateBuild } from './buildSchema'
import { filterItems, isCompletedItem } from './itemFilters'
import type { Build, Item } from './types'

const base = () => structuredClone(example) as Build
const slotsOf = (b: Build) => b.itemOrder.map((s) => [s.slot, s.default])

describe('premier item', () => {
  it('ajoute jusqu’à 3 options, remplace, refuse les doublons', () => {
    let b = base() // 2 options : 1055, 1054
    b = setFirstItemOption(b, 'new', '1056')
    expect(b.firstItemOptions.map((o) => o.itemId)).toEqual(['1055', '1054', '1056'])
    expect(setFirstItemOption(b, 'new', '1083')).toBe(b) // 4e option refusée
    expect(setFirstItemOption(b, 0, '1054')).toBe(b) // déjà proposée
    b = setFirstItemOption(b, 0, '1083')
    expect(b.firstItemOptions[0]?.itemId).toBe('1083')
  })

  it('retire une option, jamais la dernière', () => {
    let b = removeFirstItemOption(base(), 0)
    expect(b.firstItemOptions.map((o) => o.itemId)).toEqual(['1054'])
    expect(removeFirstItemOption(b, 0)).toBe(b)
  })
})

describe('ordre des items', () => {
  it('ajoute un slot (6 max) numéroté à la suite', () => {
    let b = removeSlot(base(), 5) // 5 slots
    b = setSlotItem(b, 'new', '3075')
    expect(slotsOf(b).at(-1)).toEqual([6, '3075'])
    expect(setSlotItem(b, 'new', '3065')).toBe(b) // 7e refusé
  })

  it('remplacer l’item par défaut le retire des alternatives du slot', () => {
    const b = setSlotItem(base(), 1, '3111') // slot 2 : Sandales de Mercure était l'alternative
    expect(b.itemOrder[1]?.default).toBe('3111')
    expect(b.itemOrder[1]?.alternatives).toEqual([])
  })

  it('retire et décale des slots en renumérotant', () => {
    let b = removeSlot(base(), 0)
    expect(slotsOf(b)[0]).toEqual([1, '3047'])
    b = moveSlot(b, 0, 1)
    expect(slotsOf(b).slice(0, 2)).toEqual([
      [1, '3071'],
      [2, '3047'],
    ])
    expect(moveSlot(b, 0, -1)).toBe(b) // déjà en tête
  })

  it('il reste toujours au moins un slot', () => {
    let b = base()
    while (b.itemOrder.length > 1) b = removeSlot(b, 0)
    expect(removeSlot(b, 0)).toBe(b)
  })
})

describe('alternatives', () => {
  it('ajout avec condition provisoire valide, 3 max, sans doublon ni item par défaut', () => {
    let b = setAlternative(base(), 4, 'new', '3075') // slot 5 (Danse de la mort) n'en avait pas
    const alt = b.itemOrder[4]!.alternatives[0]!
    expect(alt.itemId).toBe('3075')
    expect(alt.when).toEqual([{ metric: 'situation', op: '==', value: 'behind' }])
    expect(setAlternative(b, 4, 'new', '3075')).toBe(b) // doublon
    expect(setAlternative(b, 4, 'new', '6333')).toBe(b) // item par défaut du slot
    b = setAlternative(b, 4, 'new', '3065')
    b = setAlternative(b, 4, 'new', '3742')
    expect(setAlternative(b, 4, 'new', '3053')).toBe(b) // 4e refusée
    expect(validateBuild(b).ok).toBe(true)
  })

  it('remplace l’item d’une alternative en gardant sa condition, puis la retire', () => {
    let b = setAlternative(base(), 2, 0, '4401')
    expect(b.itemOrder[2]!.alternatives[0]).toMatchObject({
      itemId: '4401',
      when: [{ metric: 'enemyApShare', op: '>=', value: 0.6 }],
    })
    b = removeAlternative(b, 2, 0)
    expect(b.itemOrder[2]!.alternatives).toEqual([])
  })
})

describe('items complets', () => {
  const item = (over: Partial<Item>): Item => ({
    id: 'x',
    name: 'x',
    image: '',
    cost: 0,
    stats: {},
    categories: [],
    buildsFrom: [],
    buildsInto: [],
    aliases: [],
    ...over,
  })

  it('item final, item de départ, bottes : oui ; composant, consommable, balise : non', () => {
    expect(isCompletedItem(item({ id: '3071' }))).toBe(true)
    expect(isCompletedItem(item({ id: '1055', categories: ['ad', 'hp'] }))).toBe(true)
    expect(isCompletedItem(item({ id: '3047', categories: ['boots'], buildsInto: ['3174'] }))).toBe(
      true,
    )
    expect(isCompletedItem(item({ id: '1029', categories: ['armor'], buildsInto: ['3075'] }))).toBe(
      false,
    )
    expect(isCompletedItem(item({ id: '2003', categories: ['consumable'] }))).toBe(false)
    expect(isCompletedItem(item({ id: '3340', categories: ['trinket'] }))).toBe(false)
  })

  it('filtre par catégorie, avec ou sans les composants', () => {
    const items = [
      item({ id: 'cotte', categories: ['armor', 'antiheal'] }),
      item({ id: 'etoffe', categories: ['armor'], buildsInto: ['cotte'] }),
      item({ id: 'morello', categories: ['ap', 'antiheal'] }),
    ]
    expect(filterItems(items, { completedOnly: true, category: 'armor' }).map((i) => i.id)).toEqual(
      ['cotte'],
    )
    expect(
      filterItems(items, { completedOnly: false, category: 'armor' }).map((i) => i.id),
    ).toEqual(['cotte', 'etoffe'])
    expect(filterItems(items, { completedOnly: true, category: 'antiheal' })).toHaveLength(2)
  })
})
