import { describe, expect, it, vi } from 'vitest'
import example from '../../data/builds/example.json'
import presetsJson from '../../data/presets/conditions.json'
import { DEFAULT_PRESETS as presets, parsePresets } from '../data/presets'
import {
  findPreset,
  isProvisionalAlternative,
  setAlternative,
  toggleAlternativePreset,
  toggleWeightedPreset,
  updateWeighted,
} from './buildEditing'
import { METRICS, type Build, type Condition, type ConditionPreset } from './types'

const preset = (id: string) => presets.find((p) => p.id === id) as ConditionPreset

describe('data/presets/conditions.json', () => {
  it('est valide : 17 presets, ids uniques, aucun avertissement', () => {
    const warn = vi.fn()
    expect(parsePresets(presetsJson, warn)).toHaveLength(17)
    expect(warn).not.toHaveBeenCalled()
  })

  it('couvre chaque métrique', () => {
    const covered = new Set(presets.map((p) => p.condition.metric))
    expect([...METRICS].filter((m) => !covered.has(m))).toEqual([])
  })

  it('le build d’exemple est entièrement recréable avec les presets', () => {
    const build = example as Build
    const conditions: Condition[] = [
      ...build.useWhen.map((w) => w.condition),
      ...build.firstItemOptions.flatMap((o) => o.useWhen.map((w) => w.condition)),
      ...build.itemOrder.flatMap((s) => s.alternatives.flatMap((a) => a.when)),
    ]
    expect(conditions.length).toBeGreaterThan(0)
    expect(conditions.filter((c) => !findPreset(presets, c))).toEqual([])
  })

  it('preset invalide ou en double : ignoré avec un avertissement', () => {
    const warn = vi.fn()
    const valid = presetsJson.presets[0]
    const result = parsePresets(
      {
        presets: [
          valid,
          valid,
          {
            id: 'x',
            label: 'X',
            condition: { metric: 'situation', op: '>', value: 'ahead' },
            explain: 'x',
          },
        ],
      },
      warn,
    )
    expect(result).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('conditions pondérées (build, premier item)', () => {
  it('cocher ajoute le preset avec le poids moyen et son texte ; décocher le retire', () => {
    let list = toggleWeightedPreset([], preset('vis-a-vis-ap'))
    expect(list).toEqual([
      {
        condition: { metric: 'laneOpponentDamage', op: '==', value: 'ap' },
        weight: 2,
        explain: 'Ton adversaire de lane fait des dégâts magiques.',
      },
    ])
    list = updateWeighted(list, 0, { weight: 3, explain: 'Contre un AP, Bouclier de Doran.' })
    expect(list[0]).toMatchObject({ weight: 3, explain: 'Contre un AP, Bouclier de Doran.' })
    expect(toggleWeightedPreset(list, preset('vis-a-vis-ap'))).toEqual([])
  })

  it('une condition qui ne correspond à aucun preset est « personnalisée »', () => {
    expect(findPreset(presets, { metric: 'enemyApShare', op: '>=', value: 0.42 })).toBeUndefined()
    expect(findPreset(presets, { metric: 'enemyApShare', op: '>=', value: 0.6 })?.id).toBe(
      'compo-ap',
    )
  })
})

describe('conditions d’une alternative (toutes vraies)', () => {
  const withProvisional = () =>
    setAlternative(example as Build, 4, 'new', '3075').itemOrder[4]!.alternatives[0]!

  it('le premier choix remplace la condition provisoire et son texte', () => {
    const alt = withProvisional()
    expect(isProvisionalAlternative(alt)).toBe(true)
    const next = toggleAlternativePreset(alt, preset('soin'), presets)
    expect(next.when).toEqual([{ metric: 'enemyHealCount', op: '>=', value: 2 }])
    expect(next.explain).toBe("Ils ont du soin : l'anti-soin est utile.")
    expect(isProvisionalAlternative(next)).toBe(false)
  })

  it('plusieurs conditions cumulées ; la dernière ne peut pas être retirée', () => {
    let alt = toggleAlternativePreset(withProvisional(), preset('soin'), presets)
    alt = toggleAlternativePreset(alt, preset('compo-ad'), presets)
    expect(alt.when).toHaveLength(2)
    alt = toggleAlternativePreset(alt, preset('soin'), presets)
    expect(alt.when).toEqual([{ metric: 'enemyAdShare', op: '>=', value: 0.6 }])
    expect(alt.explain).toBe(preset('compo-ad').explain) // texte automatique : suit le preset
    expect(toggleAlternativePreset(alt, preset('compo-ad'), presets)).toBe(alt)
  })

  it('un texte écrit par le joueur est conservé', () => {
    let alt = {
      ...toggleAlternativePreset(withProvisional(), preset('soin'), presets),
      explain: 'Mon texte',
    }
    alt = toggleAlternativePreset(alt, preset('tanks'), presets)
    expect(alt.explain).toBe('Mon texte')
  })
})
