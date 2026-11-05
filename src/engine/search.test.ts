import { describe, expect, it } from 'vitest'
import { createSearch, normalizeSearchText } from './search'

// Noms réels (fr_FR) et ids Data Dragon, dont les cas particuliers.
const champions = [
  ['Mordekaiser', 'Mordekaiser'],
  ['Orianna', 'Orianna'],
  ["Kai'Sa", 'Kaisa'],
  ['Dr. Mundo', 'DrMundo'],
  ['Wukong', 'MonkeyKing'],
  ['Nunu et Willump', 'Nunu'],
  ['Séraphine', 'Seraphine'],
  ['Maître Yi', 'MasterYi'],
  ["K'Santé", 'KSante'],
  ['Zoé', 'Zoe'],
  ['Morgana', 'Morgana'],
  ['Taliyah', 'Taliyah'],
  ['Zed', 'Zed'],
].map(([name, id]) => ({ name: name!, id: id! }))

const search = createSearch(champions, (c) => [c.name, c.id])
const names = (query: string) => search(query).map((c) => c.name)

describe('normalizeSearchText', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normalizeSearchText("Kai'Sa")).toBe('kai sa')
    expect(normalizeSearchText('Maître Yi')).toBe('maitre yi')
    expect(normalizeSearchText('  Dr. Mundo ')).toBe('dr mundo')
    expect(normalizeSearchText('ÉPÉE')).toBe('epee')
  })
})

describe('createSearch', () => {
  it('critères du ticket : « mord » trouve Mordekaiser, « ori » trouve Orianna', () => {
    expect(names('mord')[0]).toBe('Mordekaiser')
    expect(names('ori')[0]).toBe('Orianna')
  })

  it('ignore la casse', () => {
    expect(names('MORD')[0]).toBe('Mordekaiser')
  })

  it('ignore les accents dans les deux sens', () => {
    expect(names('seraph')).toEqual(['Séraphine'])
    expect(names('Zoé')).toEqual(['Zoé'])
    expect(names('maitre')).toEqual(['Maître Yi'])
    expect(names('ksante')).toEqual(["K'Santé"])
  })

  it('ignore apostrophes et points', () => {
    expect(names('kais')).toEqual(["Kai'Sa", 'Mordekaiser']) // Morde-kais-er contient la saisie, classé après
    expect(names("kai'sa")).toEqual(["Kai'Sa"])
    expect(names('drmun')).toEqual(['Dr. Mundo'])
  })

  it('trouve par un mot du nom', () => {
    expect(names('mundo')).toEqual(['Dr. Mundo'])
    expect(names('willump')).toEqual(['Nunu et Willump'])
    expect(names('yi')).toEqual(['Maître Yi'])
  })

  it('trouve par l’id Data Dragon (nom anglais)', () => {
    expect(names('monkey')).toEqual(['Wukong'])
    expect(names('master')).toEqual(['Maître Yi'])
  })

  it('classe le début de nom avant le milieu de nom', () => {
    // « or » : Orianna commence par « or » ; Morgana, Mordekaiser le contiennent seulement.
    expect(names('or')).toEqual(['Orianna', 'Mordekaiser', 'Morgana'])
  })

  it('saisie vide : tous les éléments, par ordre alphabétique', () => {
    const all = names('')
    expect(all).toHaveLength(champions.length)
    expect(all[0]).toBe('Dr. Mundo')
    expect(all.at(-1)).toBe('Zoé')
  })

  it('aucun résultat', () => {
    expect(names('xyz')).toEqual([])
  })
})
