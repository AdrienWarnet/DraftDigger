import { describe, expect, it } from 'vitest'
import file from '../../data/role-quests.json'
import { BRUISER, champion, COMPOS, itemsById } from './__fixtures__/compos'
import { computeMetrics, mainDamage } from './metrics'
import { recommendNextItem } from './recommend'
import { activeQuestEffects, parseRoleQuests } from './roleQuests'

/** Effets des quêtes en partie (T8.2), avec le vrai fichier data/role-quests.json. */
const metrics = computeMetrics(COMPOS.fullAd.map(champion), champion('Darius'))
const fullBuild = ['6610', '3047', '3071', '3053', '6333', '6694'] // 6 items, bottes comprises

function next(owned: readonly string[], json: unknown, completed: boolean) {
  const effects = activeQuestEffects(parseRoleQuests(json), 'bot', completed)
  return recommendNextItem(BRUISER, owned, metrics, 'even', {
    itemsById,
    baseStats: champion('Yorick').baseStats,
    playerDamage: mainDamage(champion('Yorick')),
    questEffects: effects,
  }).recommendation
}

describe('quête Bot terminée : les bottes dans l’emplacement de quête', () => {
  it('build terminé sans quête : inventaire plein, item de situation à la place d’un autre', () => {
    const reco = next(fullBuild, file, false)
    expect(reco?.choice.name).toBe('Cœur gelé')
    expect(reco?.reasons.at(-1)).toContain('Inventaire plein')
  })

  it('quête terminée : une place reste libre, expliqué par la quête', () => {
    const reasons = next(fullBuild, file, true)?.reasons ?? []
    expect(reasons.at(-1)).toContain('Quête de rôle terminée')
    expect(reasons.join(' ')).not.toContain('Inventaire plein')
  })

  it('modifier l’effet dans le JSON change la recommandation', () => {
    const edited = structuredClone(file) as { quests: { bot: { effects: object } } }
    edited.quests.bot.effects = {}
    expect(next(fullBuild, edited, true)?.reasons.at(-1)).toContain('Inventaire plein')
  })

  it('build en cours : la quête ne change rien', () => {
    const owned = ['1055', '6610']
    expect(next(owned, file, true)).toEqual(next(owned, file, false))
  })

  it('item de situation : la catégorie est toujours expliquée en premier', () => {
    const tanks = computeMetrics(COMPOS.mixte.map(champion), champion('Malphite'))
    const reco = recommendNextItem(BRUISER, fullBuild, tanks, 'even', {
      itemsById,
      baseStats: champion('Yorick').baseStats,
      playerDamage: 'ad',
    }).recommendation
    expect(reco?.reasons[0]).toContain('anti-tank')
    expect(reco?.reasons.at(-1)).toContain('Inventaire plein')
  })
})
