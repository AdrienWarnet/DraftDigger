import { describe, expect, it } from 'vitest'
import { BRUISER, champion, championsById, itemsById } from './__fixtures__/compos'
import { addEnemy, emptyDraft, setAlly, type Draft } from './draft'
import { removeItem } from './inventory'
import { mainDamage, metricsFromDraft } from './metrics'
import { recommendNextItem } from './recommend'

/** Mise à jour en cours de partie (T6.4) : la reco suit la draft et les items. */
const context = {
  itemsById,
  baseStats: champion('Yorick').baseStats,
  playerDamage: mainDamage(champion('Yorick')),
}

function draftWith(enemies: readonly string[]): Draft {
  return enemies.reduce((d, id) => addEnemy(d, id), setAlly(emptyDraft('top'), 'top', 'Yorick'))
}

const nextItem = (draft: Draft, owned: readonly string[]) =>
  recommendNextItem(BRUISER, owned, metricsFromDraft(draft, championsById, {}), 'even', context)
    .recommendation?.choice.name

describe('mise à jour en cours de partie', () => {
  it('ajouter un ennemi AP fait passer la compo à 60 % AP : Mercure remplace les Coques', () => {
    const draft = draftWith(['Mordekaiser', 'Syndra', 'Graves', 'Jinx']) // 57 % AP
    expect(nextItem(draft, ['1055', '6610'])).toBe('Coques en acier')
    expect(nextItem(addEnemy(draft, 'Lux'), ['1055', '6610'])).toBe('Sandales de Mercure') // 62 %
  })

  it('un item vendu redevient le prochain item', () => {
    const owned = ['1055', '6610', '3047']
    const draft = draftWith(['Darius'])
    expect(nextItem(draft, owned)).toBe('Couperet noir')
    expect(nextItem(draft, removeItem(owned, 1))).toBe('Ciel éventré')
  })
})
