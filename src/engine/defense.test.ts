import { describe, expect, it } from 'vitest'
import {
  damageReduction,
  damageTakenReduction,
  defensiveGain,
  resistances,
  statAtLevel,
} from './defense'
import type { BaseStats, Item } from './types'

// Statistiques réelles de Yorick (Data Dragon 16.22.1).
const yorick: BaseStats = {
  hp: 650,
  hpPerLevel: 114,
  armor: 36,
  armorPerLevel: 4.5,
  mr: 32,
  mrPerLevel: 2.05,
}

function item(id: string, stats: Item['stats']): Item {
  return {
    id,
    name: id,
    image: '',
    cost: 0,
    stats,
    categories: [],
    buildsFrom: [],
    buildsInto: [],
    aliases: [],
  }
}
const thornmail = item('3075', { armor: 75, hp: 150 }) // Cotte épineuse
const visage = item('3065', { mr: 50, hp: 400 }) // Visage spirituel
const sword = item('1036', { ad: 10 })

describe('damageReduction', () => {
  it('valeurs de référence : 100 → 50 %, 0 → 0 %, 50 → 33 %', () => {
    expect(damageReduction(100)).toBe(0.5)
    expect(damageReduction(0)).toBe(0)
    expect(damageReduction(50)).toBeCloseTo(1 / 3)
    expect(damageReduction(-20)).toBe(0)
  })
})

describe('statAtLevel', () => {
  it('niveau 1 = base ; niveau 18 = base + 17 × gain', () => {
    expect(statAtLevel(36, 4.5, 1)).toBe(36)
    expect(statAtLevel(36, 4.5, 18)).toBeCloseTo(36 + 4.5 * 17)
  })

  it('niveau 9 suit la courbe du jeu (pas une simple progression linéaire)', () => {
    expect(statAtLevel(36, 4.5, 9)).toBeCloseTo(36 + 4.5 * 8 * (0.7025 + 0.0175 * 8))
  })
})

describe('resistances', () => {
  it('niveau 9 par défaut, items possédés ajoutés', () => {
    const base = resistances(yorick)
    expect(base.armor).toBeCloseTo(66.3, 1)
    expect(base.mr).toBeCloseTo(45.8, 1)
    const withItems = resistances(yorick, [thornmail, sword])
    expect(withItems.armor).toBeCloseTo(base.armor + 75)
    expect(withItems.mr).toBeCloseTo(base.mr)
  })
})

describe('damageTakenReduction', () => {
  it('de 50 à 100 d’armure : 25 % de dégâts reçus en moins', () => {
    expect(damageTakenReduction(50, 100)).toBeCloseTo(0.25)
    expect(damageTakenReduction(0, 100)).toBe(0.5)
    expect(damageTakenReduction(100, 100)).toBe(0)
  })
})

describe('defensiveGain', () => {
  const current = { armor: 50, mr: 50 }

  it('compo full AD : Cotte épineuse rapporte, Visage spirituel presque rien', () => {
    const fullAd = { enemyAdShare: 0.9, enemyApShare: 0.1 }
    const cotte = defensiveGain(thornmail, current, fullAd)
    expect(cotte.adGain).toBeCloseTo(75 / 225) // de 50 à 125 d'armure
    expect(cotte.gain).toBeCloseTo(0.9 * (75 / 225))
    expect(cotte.text).toBe('−33 % de dégâts reçus face à leurs dégâts AD')
    expect(defensiveGain(visage, current, fullAd).gain).toBeLessThan(cotte.gain / 5)
  })

  it('compo full AP : le Visage spirituel l’emporte', () => {
    const fullAp = { enemyAdShare: 0.1, enemyApShare: 0.9 }
    expect(defensiveGain(visage, current, fullAp).gain).toBeGreaterThan(
      defensiveGain(thornmail, current, fullAp).gain,
    )
    expect(defensiveGain(visage, current, fullAp).text).toBe(
      '−25 % de dégâts reçus face à leurs dégâts AP',
    )
  })

  it('les deux résistances : texte combiné', () => {
    const both = item('x', { armor: 40, mr: 40 })
    expect(defensiveGain(both, current, { enemyAdShare: 0.5, enemyApShare: 0.5 }).text).toBe(
      '−21 % de dégâts physiques et −21 % de dégâts magiques reçus',
    )
  })

  it('item sans résistance ou compo vide : gain nul, pas de texte', () => {
    expect(defensiveGain(sword, current, { enemyAdShare: 0.9, enemyApShare: 0.1 })).toEqual({
      gain: 0,
      adGain: 0,
      apGain: 0,
      text: null,
    })
    expect(defensiveGain(thornmail, current, { enemyAdShare: 0, enemyApShare: 0 }).text).toBeNull()
  })

  it('l’effet diminue avec les résistances déjà acquises', () => {
    const fullAd = { enemyAdShare: 1, enemyApShare: 0 }
    const early = defensiveGain(thornmail, { armor: 40, mr: 40 }, fullAd).gain
    const late = defensiveGain(thornmail, { armor: 200, mr: 40 }, fullAd).gain
    expect(late).toBeLessThan(early)
  })
})
