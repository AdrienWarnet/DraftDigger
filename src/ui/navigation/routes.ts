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

export type Route = ScreenId | typeof DEV_SHOWCASE

export const DEFAULT_SCREEN: ScreenId = 'draft'

export function hashFor(route: Route): string {
  return `#/${route}`
}

/** Lit l'écran demandé dans l'URL (`#/reco`). Toute valeur inconnue renvoie l'écran par défaut. */
export function parseRoute(hash: string, options: { allowDevShowcase?: boolean } = {}): Route {
  const id = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  if (options.allowDevShowcase && id === DEV_SHOWCASE) return DEV_SHOWCASE
  const screen = SCREENS.find((s) => s.id === id)
  return screen ? screen.id : DEFAULT_SCREEN
}
