import { describe, expect, it } from 'vitest'
import { addEnemy, emptyDraft, setPlayerPosition } from './draft'
import { computeMetrics, damageProfile, metricsFromDraft } from './metrics'
import type { Champion, Threats } from './types'

/** Champion de test : dégâts et menaces explicites (les valeurs réelles viennent du catalogue). */
function champ(id: string, ad: number, threats: Partial<Threats> = {}): Champion {
  return {
    id,
    name: id,
    image: '',
    tags: [],
    damage: { ad, ap: 1 - ad, true: 0 },
    threats: { cc: 0, burst: 0, engage: 0, heal: 0, tank: 0, ...threats },
    baseStats: { hp: 600, hpPerLevel: 100, armor: 30, armorPerLevel: 4, mr: 30, mrPerLevel: 2 },
  }
}

const darius = champ('Darius', 0.9, { tank: 1, heal: 1, engage: 1 })
const zed = champ('Zed', 0.9, { burst: 2, engage: 1 })
const jinx = champ('Jinx', 0.8)
const leona = champ('Leona', 0.4, { cc: 3, engage: 3, tank: 3 })
const lux = champ('Lux', 0.15, { cc: 1, burst: 1 })
const syndra = champ('Syndra', 0.1, { cc: 2, burst: 2 })
const malphite = champ('Malphite', 0.3, { cc: 2, engage: 2, tank: 3 })
const soraka = champ('Soraka', 0.2, { cc: 1, heal: 3 })
const ahri = champ('Ahri', 0.2, { cc: 1, burst: 2 })

describe('computeMetrics', () => {
  it('compo full AD', () => {
    const m = computeMetrics([darius, zed, jinx, champ('Draven', 0.9), champ('Talon', 0.9)], darius)
    expect(m.enemyAdShare).toBeCloseTo(0.88)
    expect(m.enemyApShare).toBeCloseTo(0.12)
    expect(m.laneOpponentDamage).toBe('ad')
    expect(m.laneOpponentIsTank).toBe(0)
    expect(m.knownEnemies).toBe(5)
  })

  it('compo full AP : sommes des menaces et nombre de tanks', () => {
    const m = computeMetrics([lux, syndra, malphite, soraka, ahri], syndra)
    expect(m.enemyApShare).toBeCloseTo(0.81)
    expect(m).toMatchObject({
      enemyCcCount: 7,
      enemyBurstCount: 5,
      enemyEngageCount: 2,
      enemyHealCount: 3,
      enemyTankCount: 1,
      laneOpponentDamage: 'ap',
      laneOpponentIsTank: 0,
    })
  })

  it('compo mixte, vis-à-vis tank', () => {
    const m = computeMetrics([darius, leona, lux, jinx, malphite], malphite)
    expect(m.enemyAdShare).toBeCloseTo(0.51)
    expect(m.enemyTankCount).toBe(2) // Leona et Malphite (tank ≥ 2), pas Darius (1)
    expect(m.laneOpponentDamage).toBe('ap') // Malphite : 70 % AP
    expect(m.laneOpponentIsTank).toBe(1)
  })

  it('compo partielle : moyenne sur les ennemis connus seulement, vis-à-vis inconnu', () => {
    const m = computeMetrics([zed, lux], null)
    expect(m.knownEnemies).toBe(2)
    expect(m.enemyAdShare).toBeCloseTo(0.525)
    expect(m.laneOpponentDamage).toBeNull()
    expect(m.laneOpponentIsTank).toBeNull()
  })

  it('compo vide : pas de plantage, tout à 0, vis-à-vis inconnu', () => {
    expect(computeMetrics([], null)).toEqual({
      enemyAdShare: 0,
      enemyApShare: 0,
      enemyCcCount: 0,
      enemyHealCount: 0,
      enemyBurstCount: 0,
      enemyEngageCount: 0,
      enemyTankCount: 0,
      laneOpponentDamage: null,
      laneOpponentIsTank: null,
      knownEnemies: 0,
    })
  })
})

describe('damageProfile', () => {
  it('ad ≥ 65 %, ap ≥ 65 %, sinon mixte', () => {
    expect(damageProfile(champ('a', 0.65))).toBe('ad')
    expect(damageProfile(champ('b', 0.35))).toBe('ap')
    expect(damageProfile(champ('c', 0.5))).toBe('mixed')
  })
})

describe('metricsFromDraft', () => {
  const byId = new Map([darius, zed, lux, soraka].map((c) => [c.id, c]))
  const rates = {
    Darius: { top: 3 },
    Zed: { mid: 3 },
    Lux: { support: 3, mid: 2 },
    Soraka: { support: 3 },
  }

  it('ennemis de la draft et vis-à-vis au poste du joueur', () => {
    let draft = ['Darius', 'Zed', 'Lux', 'Soraka'].reduce((d, id) => addEnemy(d, id), emptyDraft())
    expect(metricsFromDraft(draft, byId, rates).laneOpponentDamage).toBe('ad') // top : Darius
    draft = setPlayerPosition(draft, 'support')
    const m = metricsFromDraft(draft, byId, rates)
    expect(m.laneOpponentDamage).toBe('ap') // support : Soraka
    expect(m.enemyHealCount).toBe(4)
    expect(m.knownEnemies).toBe(4)
  })

  it('un ennemi inconnu dans le patch est ignoré, sans plantage', () => {
    const draft = addEnemy(addEnemy(emptyDraft(), 'Darius'), 'ChampionSupprime')
    const m = metricsFromDraft(draft, byId, rates)
    expect(m.knownEnemies).toBe(1)
  })
})
