import { describe, expect, it, vi } from 'vitest'
import file from '../../data/role-quests.json'
import { activeQuestEffects, parseRoleQuests } from './roleQuests'

describe('parseRoleQuests', () => {
  it('lit le fichier livré : 5 postes, patch de référence, effet Bot', () => {
    const quests = parseRoleQuests(file)
    expect(quests?.patch).toMatch(/^\d+\.\d+$/)
    expect(Object.keys(quests?.quests ?? {})).toEqual(['top', 'jungle', 'mid', 'bot', 'support'])
    expect(quests?.quests.bot.effects).toEqual({ dedicatedSlot: 'boots' })
    expect(quests?.quests.top.effects).toEqual({})
  })

  it('modifier le fichier change les données lues', () => {
    const edited = structuredClone(file)
    edited.quests.mid.effects = { dedicatedSlot: 'boots' } as never
    edited.quests.mid.points = 1500
    const quests = parseRoleQuests(edited)
    expect(quests?.quests.mid).toMatchObject({ points: 1500, effects: { dedicatedSlot: 'boots' } })
  })

  it('effets absents : aucun effet', () => {
    const edited = structuredClone(file) as { quests: { top: { effects?: unknown } } }
    delete edited.quests.top.effects
    expect(parseRoleQuests(edited)?.quests.top.effects).toEqual({})
  })

  it('fichier invalide : ignoré avec un avertissement qui désigne le champ', () => {
    const warn = vi.fn()
    const edited = structuredClone(file)
    edited.quests.bot.effects = { dedicatedSlot: 'wards' } as never
    expect(parseRoleQuests(edited, warn)).toBeNull()
    expect(warn.mock.calls[0]?.[0]).toContain('quests.bot.effects.dedicatedSlot')
    expect(parseRoleQuests({ ...file, patch: 'v26' }, warn)).toBeNull()
  })
})

describe('activeQuestEffects', () => {
  const quests = parseRoleQuests(file)
  it('effets du poste joué seulement si la quête est terminée', () => {
    expect(activeQuestEffects(quests, 'bot', true)).toEqual({ dedicatedSlot: 'boots' })
    expect(activeQuestEffects(quests, 'bot', false)).toEqual({})
    expect(activeQuestEffects(quests, 'top', true)).toEqual({})
    expect(activeQuestEffects(null, 'bot', true)).toEqual({})
  })
})
