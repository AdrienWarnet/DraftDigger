import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import { defensiveGain } from './defense'
import { scoreOptions } from './evaluate'
import {
  buildChoiceFallbackReason,
  buildReasons,
  defensiveReason,
  inventoryReason,
  nextItemFallbackReason,
  toSentence,
} from './explain'
import type { Metrics } from './metrics'
import type { Build, Item } from './types'

const build = example as Build
const metrics = (over: Partial<Metrics>): Metrics => ({
  enemyAdShare: 0.5,
  enemyApShare: 0.5,
  enemyCcCount: 0,
  enemyHealCount: 0,
  enemyBurstCount: 0,
  enemyEngageCount: 0,
  enemyTankCount: 0,
  laneOpponentDamage: 'mixed',
  laneOpponentIsTank: 0,
  knownEnemies: 5,
  ...over,
})
const item = (stats: Item['stats']): Item => ({
  id: 'x',
  name: 'x',
  image: '',
  cost: 0,
  stats,
  categories: [],
  buildsFrom: [],
  buildsInto: [],
  aliases: [],
})

describe('cas types (snapshots)', () => {
  it('1. choix du build : raisons des conditions, 3 au plus, sans doublon', () => {
    const reasons = buildReasons({
      conditionReasons: [
        build.useWhen[0]!.explain,
        'leur compo est très AD',
        "Contre un tank en lane, la Poigne de l'immortel et Démolition gagnent l'échange et la tour.",
        'Ils ont peu de contrôles.',
        'Une 5e raison qui ne sera pas affichée.',
      ],
    })
    expect(reasons).toMatchInlineSnapshot(`
      [
        "Contre un tank en lane, la Poigne de l'immortel et Démolition gagnent l'échange et la tour.",
        "Leur compo est très AD.",
        "Ils ont peu de contrôles.",
      ]
    `)
  })

  it('2. premier item : vis-à-vis AP et en retard → Bouclier de Doran', () => {
    const [best] = scoreOptions(
      build.firstItemOptions.map((o) => ({ choice: o.itemId, useWhen: o.useWhen })),
      metrics({ laneOpponentDamage: 'ap' }),
      'behind',
    )
    expect(best?.choice).toBe('1054')
    expect(buildReasons({ conditionReasons: best?.reasons })).toMatchInlineSnapshot(`
      [
        "Contre un vis-à-vis AP, le Bouclier de Doran encaisse mieux le harcèlement.",
        "En difficulté en lane, le Bouclier de Doran aide à tenir.",
      ]
    `)
  })

  it('3. prochain item défensif : condition, chiffre défensif et situation', () => {
    const m = metrics({ enemyAdShare: 0.27, enemyApShare: 0.73 })
    const visage = item({ mr: 50, hp: 400 })
    const reasons = buildReasons({
      conditionReasons: [build.itemOrder[2]!.alternatives[0]!.explain],
      defensive: defensiveGain(visage, { armor: 66, mr: 46 }, m),
      metrics: m,
      situationReason: 'en retard, on privilégie un item abordable et défensif',
    })
    expect(reasons).toMatchInlineSnapshot(`
      [
        "Beaucoup de dégâts magiques : le Visage spirituel protège et renforce les soins.",
        "Contre leurs dégâts surtout magiques (73 %), cet item réduit les dégâts magiques reçus de 26 %.",
        "En retard, on privilégie un item abordable et défensif.",
      ]
    `)
  })
})

describe('defensiveReason', () => {
  it('compo mixte : les deux chiffres', () => {
    const m = metrics({})
    const both = item({ armor: 40, mr: 40 })
    expect(defensiveReason(defensiveGain(both, { armor: 50, mr: 50 }, m), m)).toBe(
      'Contre leurs dégâts mixtes, cet item réduit les dégâts reçus de 21 % (physiques) et 21 % (magiques).',
    )
  })

  it('gain trop faible ou nul : pas d’argument défensif', () => {
    const m = metrics({ enemyAdShare: 0.9, enemyApShare: 0.1 })
    expect(defensiveReason(defensiveGain(item({ mr: 50 }), { armor: 50, mr: 50 }, m), m)).toBeNull()
    expect(defensiveReason(defensiveGain(item({ ad: 40 }), { armor: 50, mr: 50 }, m), m)).toBeNull()
  })
})

describe('toSentence', () => {
  it('majuscule, point final, espaces nettoyés', () => {
    expect(toSentence('  ils se   soignent ')).toBe('Ils se soignent.')
    expect(toSentence('Déjà une phrase !')).toBe('Déjà une phrase !')
    expect(toSentence('  ')).toBe('')
  })
})

describe('buildChoiceFallbackReason', () => {
  it('seul build, favori, ou premier build', () => {
    expect(buildChoiceFallbackReason(1, false)).toBe(
      "C'est ton seul build pour ce champion à ce poste.",
    )
    expect(buildChoiceFallbackReason(2, true)).toBe(
      'Aucune condition ne départage tes builds : voici ton favori.',
    )
    expect(buildChoiceFallbackReason(3, false)).toContain('voici le premier')
  })
})

describe('nextItemFallbackReason', () => {
  it('item du build, sinon item de situation selon sa catégorie', () => {
    expect(nextItemFallbackReason(3, [])).toBe("C'est l'item n° 3 de ton build.")
    expect(nextItemFallbackReason(null, ['antiheal'])).toContain('anti-soin')
    expect(nextItemFallbackReason(null, ['antitank'])).toContain('anti-tank')
    expect(nextItemFallbackReason(null, ['armor', 'mr', 'hp'])).toContain('défensif')
  })
})

describe('toSentence : espaces insécables', () => {
  it('garde l’espace insécable avant « % » (pas de « % » seul en début de ligne)', () => {
    expect(toSentence('réduit les dégâts de 12\u202f%')).toBe('Réduit les dégâts de 12\u202f%.')
    expect(toSentence('  deux   espaces\n')).toBe('Deux espaces.')
  })
})

describe('inventoryReason', () => {
  it('plein, place libérée par la quête, ou rien à dire', () => {
    expect(inventoryReason(0, 0)).toContain('Inventaire plein')
    expect(inventoryReason(1, 0)).toContain('Quête de rôle terminée')
    expect(inventoryReason(2, 1)).toBeNull()
  })
})
