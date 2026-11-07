import { useSyncExternalStore } from 'react'
import { hashFor, parseRoute, parseRouteParams, type Route } from './routes'

// Navigation par hash (#/reco) : pas de configuration serveur sur GitHub Pages,
// et le bouton retour d'Android fonctionne.
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = () => window.location.hash

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseRoute(hash, { allowDevShowcase: import.meta.env.DEV })
}

/** Paramètres de l'écran courant (ex : sélecteur ouvert dans la draft). */
export function useRouteParams(): string[] {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseRouteParams(hash)
}

/** Ouvre un écran (nouvelle entrée d'historique : le bouton retour y revient). */
export function navigate(route: Route, ...params: string[]) {
  window.location.hash = hashFor(route, ...params)
}

/** Change d'écran sans nouvelle entrée d'historique (ex : saisie enchaînée dans un sélecteur). */
export function replaceRoute(route: Route, ...params: string[]) {
  window.location.replace(hashFor(route, ...params))
}

/**
 * Revient à l'entrée précédente (ex : fermer le sélecteur).
 * Si l'historique ne contient que cette page (app rouverte directement dessus), remplace par `fallback`.
 */
export function goBack(fallback: Route) {
  if (window.history.length > 1) window.history.back()
  else window.location.replace(hashFor(fallback))
}
