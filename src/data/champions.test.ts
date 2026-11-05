import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/champions-16.22.1.json'
import {
  buildChampions,
  championDamage,
  DEFAULT_TAG_THREATS,
  defaultThreats,
  parseTagThreats,
} from './champions'
import type { RawChampion } from './ddragonTypes'

// 5 champions réels du patch 16.22.1 (fr_FR) : tank, mage, tireur, assassin, support.
const data = {
  version: fixture.version,
  champions: fixture.champions as Record<string, RawChampion>,
}
const champions = buildChampions(data)
const byId = Object.fromEntries(champions.map((c) => [c.id, c]))

describe('buildChampions', () => {
  it('transforme tous les champions, triés par nom', () => {
    expect(champions.map((c) => c.id)).toEqual(['Jinx', 'Lux', 'Malphite', 'Soraka', 'Zed'])
  })

  it('construit l’URL de l’image pour le patch', () => {
    expect(byId.Lux?.image).toBe(
      'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion/Lux.png',
    )
  })

  it('les parts de dégâts somment toujours à 1', () => {
    for (const c of champions) {
      expect(c.damage.ad + c.damage.ap + c.damage.true).toBeCloseTo(1, 10)
    }
  })

  // Tank (Malphite : Tank, Mage ; attaque 5, magie 7)
  it('tank : très résistant, CC et engage, dégâts plutôt AP', () => {
    const c = byId.Malphite!
    expect(c.threats).toEqual({ cc: 2, burst: 1, engage: 2, heal: 0, tank: 3 })
    expect(c.damage.ap).toBeCloseTo(7 / 12)
  })

  // Mage (Lux : Mage, Support ; attaque 2, magie 9)
  it('mage : burst et CC, dégâts très majoritairement AP', () => {
    const c = byId.Lux!
    expect(c.threats).toEqual({ cc: 1, burst: 1, engage: 0, heal: 0, tank: 0 })
    expect(c.damage.ap).toBeCloseTo(9 / 11)
  })

  // Tireur (Jinx : Marksman ; attaque 9, magie 4)
  it('tireur : aucune menace de tag, dégâts majoritairement AD', () => {
    const c = byId.Jinx!
    expect(c.threats).toEqual({ cc: 0, burst: 0, engage: 0, heal: 0, tank: 0 })
    expect(c.damage.ad).toBeCloseTo(9 / 13)
  })

  // Assassin (Zed : Assassin ; attaque 9, magie 1)
  it('assassin : burst fort, dégâts quasi entièrement AD', () => {
    const c = byId.Zed!
    expect(c.threats).toEqual({ cc: 0, burst: 2, engage: 1, heal: 0, tank: 0 })
    expect(c.damage.ad).toBeCloseTo(0.9)
  })

  // Support (Soraka : Support, Mage ; attaque 2, magie 7)
  it('support : CC, dégâts majoritairement AP (le soin viendra des overrides)', () => {
    const c = byId.Soraka!
    expect(c.threats).toEqual({ cc: 1, burst: 1, engage: 0, heal: 0, tank: 0 })
    expect(c.damage.ap).toBeCloseTo(7 / 9)
  })
})

describe('championDamage', () => {
  it('sans attaque ni magie : moitié AD, moitié AP', () => {
    expect(championDamage({ attack: 0, defense: 5, magic: 0, difficulty: 1 })).toEqual({
      ad: 0.5,
      ap: 0.5,
      true: 0,
    })
  })
})

describe('defaultThreats', () => {
  it('garde la valeur la plus forte quand plusieurs tags donnent la même menace', () => {
    expect(defaultThreats(['Mage', 'Tank']).cc).toBe(2)
  })

  it('ignore un tag inconnu', () => {
    expect(defaultThreats(['Inconnu'])).toEqual({ cc: 0, burst: 0, engage: 0, heal: 0, tank: 0 })
  })

  it('se règle via le fichier de tags sans toucher au code', () => {
    const custom = parseTagThreats({ Marksman: { burst: 3 } })
    expect(defaultThreats(['Marksman'], custom).burst).toBe(3)
  })
})

describe('parseTagThreats', () => {
  it('le fichier par défaut couvre les 6 tags Data Dragon', () => {
    expect(Object.keys(DEFAULT_TAG_THREATS).sort()).toEqual([
      'Assassin',
      'Fighter',
      'Mage',
      'Marksman',
      'Support',
      'Tank',
    ])
  })

  it('rejette une menace inconnue en désignant le champ', () => {
    expect(() => parseTagThreats({ Tank: { armure: 2 } })).toThrow('« Tank.armure » inconnu')
  })

  it('rejette une valeur hors 0..3 en désignant le champ', () => {
    expect(() => parseTagThreats({ Tank: { tank: 5 } })).toThrow('« Tank.tank » doit valoir')
  })

  it('rejette un fichier qui n’est pas un objet', () => {
    expect(() => parseTagThreats([])).toThrow('un objet')
  })
})
