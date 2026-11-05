import { useSyncExternalStore } from 'react'
import { hashFor, parseRoute, type Route } from './routes'

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

export function navigate(route: Route) {
  window.location.hash = hashFor(route)
}
