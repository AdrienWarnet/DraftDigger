/** Écrans de l'app, dans l'ordre de la barre de navigation. */
export const SCREENS = [
  { id: 'draft', navLabel: 'Draft', title: 'Draft' },
  { id: 'reco', navLabel: 'Reco', title: 'Recommandation' },
  { id: 'partie', navLabel: 'Partie', title: 'Partie' },
  { id: 'builds', navLabel: 'Builds', title: 'Mes builds' },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']

/** Page de démonstration des composants, accessible en développement uniquement. */
export const DEV_SHOWCASE = 'composants'

/** Écran « À propos » (T7.4) : hors barre de navigation, ouvert depuis le pied de page. */
export const ABOUT = 'a-propos'

export type Route = ScreenId | typeof DEV_SHOWCASE | typeof ABOUT

export const DEFAULT_SCREEN: ScreenId = 'draft'

/** `hashFor('draft', 'choisir', 'allie-top')` → `#/draft/choisir/allie-top`. */
export function hashFor(route: Route, ...params: string[]): string {
  return ['#', route, ...params.map(encodeURIComponent)].join('/')
}

/** Segments après l'écran : `#/draft/choisir/allie-top` → `['choisir', 'allie-top']`. */
export function parseRouteParams(hash: string): string[] {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  return path.split('/').slice(1).filter(Boolean).map(decodeURIComponent)
}

/** Lit l'écran demandé dans l'URL (`#/reco`). Toute valeur inconnue renvoie l'écran par défaut. */
export function parseRoute(hash: string, options: { allowDevShowcase?: boolean } = {}): Route {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  if (options.allowDevShowcase && id === DEV_SHOWCASE) return DEV_SHOWCASE
  if (id === ABOUT) return ABOUT
  const screen = SCREENS.find((s) => s.id === id)
  return screen ? screen.id : DEFAULT_SCREEN
}
