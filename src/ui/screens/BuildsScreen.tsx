import { EmptyState } from '../components/EmptyState'

export function BuildsScreen() {
  return (
    <EmptyState
      title="Aucun build pour l'instant"
      description="Tu pourras bientôt créer tes builds ici : runes, sorts et ordre des items."
    />
  )
}
