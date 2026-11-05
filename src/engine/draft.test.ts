import { describe, expect, it } from 'vitest'
import {
  addEnemy,
  emptyDraft,
  enemyLayout,
  hasDraftContent,
  newGame,
  parseDraft,
  MAX_ENEMIES,
  pickedChampionIds,
  playerChampionId,
  removeEnemy,
  replaceEnemy,
  setAlly,
  setPlayerPosition,
} from './draft'

describe('draft', () => {
  it('draft vide : 5 postes alliés vides, aucun ennemi, joueur top par défaut', () => {
    const draft = emptyDraft()
    expect(draft.playerPosition).toBe('top')
    expect(Object.values(draft.allies)).toEqual([null, null, null, null, null])
    expect(draft.enemies).toEqual([])
    expect(playerChampionId(draft)).toBeNull()
  })

  it('le champion du joueur est l’allié de son poste', () => {
    let draft = setAlly(emptyDraft(), 'top', 'Yorick')
    expect(playerChampionId(draft)).toBe('Yorick')
    draft = setPlayerPosition(draft, 'jungle')
    expect(playerChampionId(draft)).toBeNull()
    expect(draft.allies.top).toBe('Yorick') // Yorick reste un allié top
  })

  it('remplit, change et vide un emplacement allié', () => {
    let draft = setAlly(emptyDraft(), 'mid', 'Lux')
    draft = setAlly(draft, 'mid', 'Orianna')
    expect(draft.allies.mid).toBe('Orianna')
    draft = setAlly(draft, 'mid', null)
    expect(draft.allies.mid).toBeNull()
  })

  it('ajoute, remplace et retire des ennemis dans l’ordre de saisie', () => {
    let draft = addEnemy(emptyDraft(), 'Zed')
    draft = addEnemy(draft, 'Lux')
    expect(draft.enemies.map((e) => e.championId)).toEqual(['Zed', 'Lux'])
    expect(draft.enemies[0]?.lockedPosition).toBeNull()

    draft = replaceEnemy(draft, 0, 'Talon')
    expect(draft.enemies.map((e) => e.championId)).toEqual(['Talon', 'Lux'])

    draft = removeEnemy(draft, 0)
    expect(draft.enemies.map((e) => e.championId)).toEqual(['Lux'])
  })

  it('limite l’équipe ennemie à 5 champions', () => {
    let draft = emptyDraft()
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F']) draft = addEnemy(draft, id)
    expect(draft.enemies).toHaveLength(MAX_ENEMIES)
    expect(draft.enemies.map((e) => e.championId)).not.toContain('F')
  })

  it('un champion ne peut être choisi qu’une fois dans toute la draft', () => {
    let draft = setAlly(emptyDraft(), 'top', 'Yorick')
    expect(addEnemy(draft, 'Yorick')).toBe(draft)
    draft = addEnemy(draft, 'Zed')
    expect(setAlly(draft, 'mid', 'Zed')).toBe(draft)
    draft = addEnemy(draft, 'Lux')
    expect(replaceEnemy(draft, 0, 'Lux')).toBe(draft)
    expect(pickedChampionIds(draft)).toEqual(new Set(['Yorick', 'Zed', 'Lux']))
  })

  it('remplacer un ennemi garde son poste fixé', () => {
    let draft = addEnemy(emptyDraft(), 'Zed')
    draft = { ...draft, enemies: [{ championId: 'Zed', lockedPosition: 'mid' }] }
    draft = replaceEnemy(draft, 0, 'Talon')
    expect(draft.enemies[0]).toEqual({ championId: 'Talon', lockedPosition: 'mid' })
  })

  it('ignore les index inexistants et les modifications sans effet', () => {
    const draft = addEnemy(emptyDraft(), 'Zed')
    expect(removeEnemy(draft, 3)).toBe(draft)
    expect(replaceEnemy(draft, 3, 'Lux')).toBe(draft)
    expect(replaceEnemy(draft, 0, 'Zed')).toBe(draft)
    expect(setPlayerPosition(draft, 'top')).toBe(draft)
  })

  it('ajoute un ennemi à un poste fixé ; un autre ennemi fixé au même poste perd son poste', () => {
    let draft = addEnemy(emptyDraft(), 'Lux', 'mid')
    expect(draft.enemies[0]).toEqual({ championId: 'Lux', lockedPosition: 'mid' })
    draft = addEnemy(draft, 'Ahri', 'mid')
    expect(draft.enemies).toEqual([
      { championId: 'Lux', lockedPosition: null },
      { championId: 'Ahri', lockedPosition: 'mid' },
    ])
  })
})

describe('enemyLayout', () => {
  it('sans ennemi : tous les postes vides', () => {
    expect(Object.values(enemyLayout(emptyDraft()))).toEqual([null, null, null, null, null])
  })

  it('postes fixés respectés, les autres remplissent les postes libres dans l’ordre de saisie', () => {
    let draft = addEnemy(emptyDraft(), 'Darius') // index 0, sans poste
    draft = addEnemy(draft, 'Lux', 'top') // index 1, fixé top
    draft = addEnemy(draft, 'Nami') // index 2, sans poste
    expect(enemyLayout(draft)).toEqual({ top: 1, jungle: 0, mid: 2, bot: null, support: null })
  })
})

describe('newGame', () => {
  it('vide la draft mais garde le poste et le champion du joueur', () => {
    let draft = setPlayerPosition(emptyDraft(), 'jungle')
    draft = setAlly(draft, 'jungle', 'LeeSin')
    draft = setAlly(draft, 'mid', 'Ahri')
    draft = addEnemy(draft, 'Zed', 'mid')
    const next = newGame(draft)
    expect(next.playerPosition).toBe('jungle')
    expect(next.allies).toEqual({
      top: null,
      jungle: 'LeeSin',
      mid: null,
      bot: null,
      support: null,
    })
    expect(next.enemies).toEqual([])
    expect(hasDraftContent(next)).toBe(false)
    expect(hasDraftContent(draft)).toBe(true)
  })
})

describe('parseDraft', () => {
  it('relit une draft sauvegardée à l’identique', () => {
    let draft = setPlayerPosition(emptyDraft(), 'mid')
    draft = setAlly(draft, 'mid', 'Ahri')
    draft = addEnemy(draft, 'Zed', 'mid')
    draft = addEnemy(draft, 'Lux')
    expect(parseDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft)
  })

  it.each([
    null,
    'texte',
    [],
    { playerPosition: 'milieu', allies: {}, enemies: [] },
    { playerPosition: 'top' },
  ])('sauvegarde illisible : null (%o)', (value) => {
    expect(parseDraft(value)).toBeNull()
  })

  it('écarte les doublons, les ennemis en trop et les valeurs invalides', () => {
    const draft = parseDraft({
      playerPosition: 'top',
      allies: { top: 'Yorick', jungle: 42, mid: 'Yorick' },
      enemies: [
        { championId: 'Zed', lockedPosition: 'mid' },
        { championId: 'Zed' },
        { championId: 'Yorick' },
        'Lux',
        { championId: 'A', lockedPosition: 'milieu' },
        { championId: 'B' },
        { championId: 'C' },
        { championId: 'D' },
        { championId: 'E' },
      ],
    })
    expect(draft?.allies).toEqual({
      top: 'Yorick',
      jungle: null,
      mid: null,
      bot: null,
      support: null,
    })
    expect(draft?.enemies).toEqual([
      { championId: 'Zed', lockedPosition: 'mid' },
      { championId: 'A', lockedPosition: null },
      { championId: 'B', lockedPosition: null },
      { championId: 'C', lockedPosition: null },
      { championId: 'D', lockedPosition: null },
    ])
  })
})
