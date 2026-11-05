import { describe, expect, it } from 'vitest'
import { DEFAULT_POSITION_RATES as rates } from '../data/positionRates'
import {
  addEnemy,
  emptyDraft,
  enemyLayout,
  laneOpponent,
  moveEnemy,
  setPlayerPosition,
  unlockEnemy,
  type Draft,
} from './draft'
import { guessEnemyPositions } from './positions'

// Taux de jeu réels (data/defaults/champion-positions.json).

function draftWith(ids: string[]): Draft {
  return ids.reduce((draft, id) => addEnemy(draft, id), emptyDraft())
}

function named(draft: Draft) {
  const layout = enemyLayout(draft, rates)
  return Object.fromEntries(
    Object.entries(layout).map(([p, i]) => [p, i === null ? null : draft.enemies[i]!.championId]),
  )
}

describe('guessEnemyPositions (données réelles)', () => {
  it('Lux + Nami : Lux mid, Nami support (répartition globale, pas champion par champion)', () => {
    // Lux seule irait support (son poste le plus joué), mais Nami ne joue que support.
    expect(named(draftWith(['Lux']))).toMatchObject({ support: 'Lux' })
    expect(named(draftWith(['Lux', 'Nami']))).toMatchObject({ mid: 'Lux', support: 'Nami' })
  })

  it('compo complète saisie dans le désordre', () => {
    expect(named(draftWith(['Nami', 'Kaisa', 'Lux', 'Darius', 'Vi']))).toEqual({
      top: 'Darius',
      jungle: 'Vi',
      mid: 'Lux',
      bot: 'Kaisa',
      support: 'Nami',
    })
  })

  it('un poste fixé par le joueur est respecté, les autres s’adaptent', () => {
    let draft = draftWith(['Nami', 'Darius'])
    draft = addEnemy(draft, 'Lux', 'support') // le joueur sait que Lux est support
    const layout = named(draft)
    expect(layout.support).toBe('Lux')
    expect(layout.top).toBe('Darius')
    expect(Object.values(layout)).toContain('Nami') // placée sur un poste restant
  })

  it('champion sans données (ex : nouveau champion) : placé sur un poste libre', () => {
    const layout = named(draftWith(['Darius', 'ChampionInconnu']))
    expect(layout.top).toBe('Darius')
    expect(Object.values(layout)).toContain('ChampionInconnu')
  })

  it('sans taux de jeu : ordre de saisie sur les postes libres', () => {
    const layout = guessEnemyPositions(
      [
        { championId: 'A', lockedPosition: null },
        { championId: 'B', lockedPosition: 'top' },
      ],
      {},
    )
    expect(layout).toEqual({ top: 1, jungle: 0, mid: null, bot: null, support: null })
  })

  it('deux ennemis fixés au même poste : le second est deviné', () => {
    const layout = guessEnemyPositions(
      [
        { championId: 'Lux', lockedPosition: 'mid' },
        { championId: 'Ahri', lockedPosition: 'mid' },
      ],
      rates,
    )
    expect(layout.mid).toBe(0)
    expect(Object.values(layout)).toContain(1)
  })
})

describe('moveEnemy et unlockEnemy', () => {
  it('corriger un poste échange les deux ennemis et fixe leurs postes', () => {
    let draft = draftWith(['Lux', 'Nami']) // Lux mid, Nami support
    draft = moveEnemy(draft, 'mid', 'support', rates)
    expect(named(draft)).toMatchObject({ support: 'Lux', mid: 'Nami' })
    expect(draft.enemies.map((e) => e.lockedPosition)).toEqual(['support', 'mid'])
  })

  it('déplacer vers un poste vide fixe seulement l’ennemi déplacé', () => {
    let draft = draftWith(['Darius', 'Vi']) // Darius top, Vi jungle
    draft = moveEnemy(draft, 'top', 'mid', rates)
    expect(named(draft)).toMatchObject({ mid: 'Darius', jungle: 'Vi' })
    expect(draft.enemies[1]?.lockedPosition).toBeNull()
  })

  it('déplacement sans effet : même poste ou poste vide au départ', () => {
    const draft = draftWith(['Darius'])
    expect(moveEnemy(draft, 'top', 'top', rates)).toBe(draft)
    expect(moveEnemy(draft, 'mid', 'top', rates)).toBe(draft)
  })

  it('laisser l’app deviner à nouveau', () => {
    let draft = addEnemy(emptyDraft(), 'Lux', 'top')
    draft = unlockEnemy(draft, 0)
    expect(draft.enemies[0]?.lockedPosition).toBeNull()
    expect(named(draft).support).toBe('Lux')
    expect(unlockEnemy(draft, 0)).toBe(draft)
  })
})

describe('laneOpponent', () => {
  it('l’ennemi au poste du joueur, et il suit le poste du joueur', () => {
    let draft = draftWith(['Nami', 'Kaisa', 'Lux', 'Darius', 'Vi'])
    expect(laneOpponent(draft, rates)?.championId).toBe('Darius') // joueur top par défaut
    draft = setPlayerPosition(draft, 'mid')
    expect(laneOpponent(draft, rates)?.championId).toBe('Lux')
  })

  it('suit les corrections de poste', () => {
    let draft = draftWith(['Lux', 'Nami'])
    draft = setPlayerPosition(draft, 'support')
    expect(laneOpponent(draft, rates)?.championId).toBe('Nami')
    draft = moveEnemy(draft, 'mid', 'support', rates)
    expect(laneOpponent(draft, rates)?.championId).toBe('Lux')
  })

  it('aucun vis-à-vis si personne n’est à ce poste', () => {
    const draft = setPlayerPosition(draftWith(['Darius']), 'bot')
    expect(laneOpponent(draft, rates)).toBeNull()
  })
})
