import { describe, expect, it } from 'vitest'
import example from '../../data/builds/example.json'
import { formatPath, validateBuild, validateConditionPreset } from './buildSchema'
import type { Build } from './types'

/** Copie modifiable du build d'exemple. */
function exampleCopy(): Build {
  return structuredClone(example) as Build
}

function errorsOf(input: unknown): string[] {
  const result = validateBuild(input)
  return result.ok ? [] : result.errors
}

describe('validateBuild', () => {
  it('data/builds/example.json est valide', () => {
    const result = validateBuild(example)
    expect(result.ok ? [] : result.errors).toEqual([])
    expect(result.ok && result.value.championId).toBe('Yorick')
  })

  it('le message désigne le champ en cause (chemin complet)', () => {
    const build = exampleCopy()
    build.runes.primarySlots = ['8446', '8444']
    expect(errorsOf(build)).toEqual([
      'runes.primarySlots : 3 runes attendues dans l’arbre principal',
    ])
  })

  it('erreur dans une condition imbriquée', () => {
    const build = exampleCopy()
    build.itemOrder[2]!.alternatives[0]!.when[0]!.value = 1.5
    expect(errorsOf(build)).toEqual([
      'itemOrder[2].alternatives[0].when[0].value : valeur entre 0 et 1 attendue pour « enemyApShare »',
    ])
  })

  it('valeur de choix invalide et opérateur interdit', () => {
    const build = exampleCopy()
    build.firstItemOptions[1]!.useWhen[0]!.condition = {
      metric: 'laneOpponentDamage',
      op: '>=',
      value: 'ap',
    }
    build.useWhen[0]!.condition.value = 'oui'
    expect(errorsOf(build)).toEqual([
      'useWhen[0].condition.value : valeur attendue pour « laneOpponentIsTank » : 0, 1',
      'firstItemOptions[1].useWhen[0].condition.op : « laneOpponentDamage » se compare uniquement avec ==',
    ])
  })

  it('métrique et poste inconnus', () => {
    const build = { ...exampleCopy(), position: 'milieu' } as unknown as Build
    build.useWhen[0]!.condition.metric = 'enemyCount' as Build['useWhen'][0]['condition']['metric']
    const errors = errorsOf(build)
    expect(errors).toContainEqual(expect.stringMatching(/^position : poste inconnu/))
    expect(errors).toContainEqual(
      expect.stringMatching(/^useWhen\[0\]\.condition\.metric : métrique inconnue/),
    )
  })

  it('règles entre champs : arbres identiques, sorts en double, slots et options en double', () => {
    const build = exampleCopy()
    build.runes.secondaryTree = build.runes.primaryTree
    build.summonerSpells = ['SummonerFlash', 'SummonerFlash']
    build.itemOrder[1]!.slot = 1
    build.firstItemOptions[1]!.itemId = '1055'
    expect(errorsOf(build)).toEqual([
      "runes.secondaryTree : l'arbre secondaire doit être différent de l'arbre principal",
      'summonerSpells[1] : les 2 sorts doivent être différents',
      'itemOrder[1].slot : slot 1 en double',
      'firstItemOptions[1].itemId : option en double',
    ])
  })

  it('champs manquants ou de mauvais type', () => {
    const { name: _name, ...withoutName } = exampleCopy()
    expect(errorsOf(withoutName)).toEqual(['name : nom attendu'])
    expect(errorsOf({ ...exampleCopy(), order: 'premier' })).toEqual(['order : ordre attendu'])
    expect(errorsOf({ ...exampleCopy(), updatedAt: 'hier' })).toEqual([
      'updatedAt : date ISO attendue (ex : 2026-11-06T10:00:00.000Z)',
    ])
  })

  it('limites : explication vide, poids négatif, trop d’options', () => {
    const build = exampleCopy()
    build.useWhen[0]!.explain = '  '
    build.useWhen[0]!.weight = -1
    build.firstItemOptions = [
      ...build.firstItemOptions,
      { itemId: '2003', useWhen: [] },
      { itemId: '1029', useWhen: [] },
    ]
    expect(errorsOf(build)).toEqual([
      'useWhen[0].weight : le poids doit être positif',
      'useWhen[0].explain : explication vide',
      'firstItemOptions : 3 options de premier item maximum',
    ])
  })

  it('n’importe quelle valeur qui n’est pas un objet est rejetée', () => {
    expect(errorsOf(null).length).toBeGreaterThan(0)
    expect(errorsOf('build').length).toBeGreaterThan(0)
  })
})

describe('validateConditionPreset', () => {
  it('accepte un preset valide et rejette une condition invalide', () => {
    const preset = {
      id: 'vs-ap-lane',
      label: 'Vis-à-vis AP',
      condition: { metric: 'laneOpponentDamage', op: '==', value: 'ap' },
      explain: 'Contre un vis-à-vis AP.',
    }
    expect(validateConditionPreset(preset).ok).toBe(true)
    const invalid = validateConditionPreset({
      ...preset,
      condition: { ...preset.condition, value: 'xx' },
    })
    expect(invalid.ok ? [] : invalid.errors).toEqual([
      'condition.value : valeur attendue pour « laneOpponentDamage » : ad, ap, mixed',
    ])
  })
})

describe('formatPath', () => {
  it('formate les chemins', () => {
    expect(formatPath(['itemOrder', 2, 'alternatives', 0, 'when'])).toBe(
      'itemOrder[2].alternatives[0].when',
    )
    expect(formatPath([])).toBe('')
  })
})
