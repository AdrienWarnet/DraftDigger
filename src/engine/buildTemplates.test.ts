import { describe, expect, it, vi } from 'vitest'
import { BRUISER, champion } from './__fixtures__/compos'
import {
  parseTemplates,
  pickTemplate,
  templateToBuild,
  type BuildTemplate,
  type TemplateMatch,
} from './buildTemplates'
import { validateBuild } from './buildSchema'

/** Modèles de TEST (jamais ceux du fichier livré), construits sur le build Bruiser de test. */
function template(id: string, match: TemplateMatch): BuildTemplate {
  const { runes, summonerSpells, useWhen, firstItemOptions, itemOrder } = BRUISER
  return { id, name: id, match, runes, summonerSpells, useWhen, firstItemOptions, itemOrder }
}

const TEMPLATES = [
  template('combattant-ad', { positions: ['top', 'jungle'], tags: ['Fighter'], damage: 'ad' }),
  template('tank', { positions: ['top', 'support'], tags: ['Tank'] }),
  template('mage-ap', { positions: ['mid'], tags: ['Mage'], damage: 'ap' }),
  template('assassin-ad', { positions: ['mid'], tags: ['Assassin'], damage: 'ad' }),
  template('tireur', { positions: ['bot'], tags: ['Marksman'], damage: 'ad' }),
  template('enchanteur', { positions: ['support'], tags: ['Support', 'Mage'] }),
]

const pick = (id: string, position: Parameters<typeof pickTemplate>[1]) =>
  pickTemplate(champion(id), position, TEMPLATES)

describe('pickTemplate : 5 profils de champions', () => {
  it('combattant AD : Darius top → combattant AD (plutôt que tank)', () => {
    expect(pick('Darius', 'top')?.template.id).toBe('combattant-ad')
  })

  it('mage AP : Ahri mid → mage AP, avec la raison', () => {
    const choice = pick('Ahri', 'mid')
    expect(choice?.template.id).toBe('mage-ap')
    expect(choice?.reason).toBe('Ahri : mage, assassin, dégâts AP.')
  })

  it('tireur : Jinx bot → tireur', () => {
    expect(pick('Jinx', 'bot')?.template.id).toBe('tireur')
  })

  it('tank : Leona support → tank (égalité avec enchanteur : ordre du fichier)', () => {
    expect(pick('Leona', 'support')?.template.id).toBe('tank')
  })

  it('enchanteur : Soraka support → enchanteur (2 tags communs)', () => {
    expect(pick('Soraka', 'support')?.template.id).toBe('enchanteur')
  })

  it('le type de dégâts départage : Zed mid → assassin AD, pas mage AP', () => {
    expect(pick('Zed', 'mid')?.template.id).toBe('assassin-ad')
  })

  it('aucun modèle pour ce poste : null', () => {
    expect(pickTemplate(champion('Jinx'), 'jungle', TEMPLATES.slice(2))).toBeNull()
  })

  it('modifier les modèles change le choix', () => {
    const edited = [
      template('tank-top', { positions: ['top'], tags: ['Fighter', 'Tank'] }),
      ...TEMPLATES,
    ]
    expect(pickTemplate(champion('Darius'), 'top', edited)?.template.id).toBe('combattant-ad')
    const heavier = [
      template('tank-top', { positions: ['top'], tags: ['Fighter', 'Tank'], damage: 'ad' }),
      ...TEMPLATES,
    ]
    expect(pickTemplate(champion('Darius'), 'top', heavier)?.template.id).toBe('tank-top')
  })
})

describe('templateToBuild', () => {
  it('donne un build complet et valide pour le champion et le poste', () => {
    const build = templateToBuild(TEMPLATES[2]!, 'Ahri', 'mid')
    expect(build).toMatchObject({ championId: 'Ahri', position: 'mid', name: 'mage-ap' })
    expect(build.id).toBe('generique-mage-ap-Ahri-mid')
    expect(validateBuild(build).ok).toBe(true)
  })
})

describe('parseTemplates', () => {
  it('garde les modèles valides', () => {
    expect(parseTemplates({ templates: TEMPLATES })).toHaveLength(TEMPLATES.length)
  })

  it('ignore un modèle invalide ou en double, avec un avertissement qui le désigne', () => {
    const warn = vi.fn()
    const broken = { ...TEMPLATES[0]!, id: 'casse', summonerSpells: ['SummonerFlash'] }
    const noMatch = { ...TEMPLATES[1]!, id: 'sans-poste', match: { positions: [], tags: [] } }
    const result = parseTemplates(
      { templates: [TEMPLATES[0], broken, noMatch, TEMPLATES[0]] },
      warn,
    )
    expect(result.map((t) => t.id)).toEqual(['combattant-ad'])
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      expect.stringContaining('modèle 2 ignoré (summonerSpells'),
      expect.stringContaining('modèle 3 ignoré (match.positions'),
      expect.stringContaining('« combattant-ad » en double'),
    ])
  })

  it('fichier sans liste : aucun modèle', () => {
    const warn = vi.fn()
    expect(parseTemplates({}, warn)).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
