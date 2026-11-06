import { describe, expect, it } from 'vitest'
import { encodeEditorSheet, parseEditorSheet, type EditorSheet } from './editorSheet'

describe('panneau de l’éditeur dans l’URL', () => {
  const sheets: EditorSheet[] = [
    { kind: 'champion' },
    { kind: 'firstItem', target: 'new' },
    { kind: 'firstItem', target: 2 },
    { kind: 'slot', target: 'new' },
    { kind: 'slot', target: 5 },
    { kind: 'alternative', slot: 3, target: 'new' },
    { kind: 'alternative', slot: 0, target: 1 },
  ]

  it.each(sheets)('aller-retour : %o', (sheet) => {
    expect(parseEditorSheet(encodeEditorSheet(sheet))).toEqual(sheet)
  })

  it.each([
    [[]],
    [['item']],
    [['item', 'slot-x']],
    [['item', 'alt-1']],
    [['item', 'autre-1']],
    [['runes']],
  ])('absent ou invalide : %o', (params) => {
    expect(parseEditorSheet(params)).toBeNull()
  })
})
