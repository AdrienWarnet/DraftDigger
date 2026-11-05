import { describe, expect, it } from 'vitest'
import {
  encodePickerTarget,
  parsePickerTarget,
  PICKER_PARAM,
  type PickerTarget,
} from './draftPickerTarget'

describe('cible du sélecteur dans l’URL', () => {
  const targets: PickerTarget[] = [
    { team: 'ally', position: 'jungle' },
    { team: 'enemy', position: 'support' },
    { team: 'enemy', position: 'new' },
  ]

  it.each(targets)('aller-retour : %o', (target) => {
    expect(parsePickerTarget([PICKER_PARAM, encodePickerTarget(target)])).toEqual(target)
  })

  it.each([
    [[]],
    [['choisir']],
    [['autre', 'allie-top']],
    [['choisir', 'allie-milieu']],
    [['choisir', 'allie-nouveau']],
    [['choisir', 'ennemi-2']],
  ])('cible absente ou invalide : %o', (params) => {
    expect(parsePickerTarget(params)).toBeNull()
  })
})
