import { describe, expect, it } from 'vitest'
import { appendBlock, gameSnapshotText, notesFileName } from './testNotes'

const now = new Date(2026, 10, 7, 16, 5)

describe('gameSnapshotText', () => {
  it('résume la partie en cours sur quelques lignes', () => {
    expect(
      gameSnapshotText({
        now,
        player: 'Yorick (Top)',
        situation: 'Égalité',
        enemies: ['Top Mordekaiser', 'Mid Syndra'],
        items: ['Lame de Doran', 'Ciel éventré'],
        nextItem: 'Sandales de Mercure',
        alternative: 'Coques en acier',
      }),
    ).toBe(
      [
        '[07/11 16:05] Yorick (Top), Égalité',
        'Ennemis : Top Mordekaiser, Mid Syndra',
        'Items : Lame de Doran, Ciel éventré',
        'Reco : Sandales de Mercure (ou Coques en acier)',
        'Note : ',
      ].join('\n'),
    )
  })

  it('partie vide : « aucun » plutôt que des listes vides', () => {
    const text = gameSnapshotText({
      now,
      player: 'Yorick (Top)',
      situation: 'Devant',
      enemies: [],
      items: [],
      nextItem: null,
      alternative: null,
    })
    expect(text).toContain('Ennemis : aucun')
    expect(text).toContain('Items : aucun')
    expect(text).toContain('Reco : aucune')
  })
})

describe('appendBlock', () => {
  it('sépare les blocs par une ligne vide, sans espaces en trop', () => {
    expect(appendBlock('', 'B')).toBe('B')
    expect(appendBlock('A\n\n  ', 'B')).toBe('A\n\nB')
  })
})

describe('notesFileName', () => {
  it('date locale du jour', () => {
    expect(notesFileName(now)).toBe('draftdigger-notes-2026-11-07.txt')
  })
})
