import { describe, expect, it } from 'vitest'
import { DEFAULT_SCREEN, DEV_SHOWCASE, hashFor, parseRoute, SCREENS } from './routes'

describe('parseRoute', () => {
  it.each(SCREENS.map((s) => s.id))('reconnaît #/%s', (id) => {
    expect(parseRoute(hashFor(id))).toBe(id)
  })

  it.each(['', '#', '#/', '#/inconnu'])('renvoie l’écran par défaut pour « %s »', (hash) => {
    expect(parseRoute(hash)).toBe(DEFAULT_SCREEN)
  })

  it('accepte un hash sans barre oblique', () => {
    expect(parseRoute('#reco')).toBe('reco')
  })

  it('ignore la suite du chemin et les paramètres', () => {
    expect(parseRoute('#/partie/items?x=1')).toBe('partie')
    expect(parseRoute('#/builds?id=2')).toBe('builds')
  })

  it('n’ouvre la page des composants que si elle est autorisée', () => {
    expect(parseRoute(hashFor(DEV_SHOWCASE))).toBe(DEFAULT_SCREEN)
    expect(parseRoute(hashFor(DEV_SHOWCASE), { allowDevShowcase: true })).toBe(DEV_SHOWCASE)
  })
})
