import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { navigate } from '../navigation/useRoute'

export function RecommendationScreen() {
  return (
    <EmptyState
      title="Pas encore de recommandation"
      description="Ajoute au moins un ennemi dans la draft pour savoir quel build jouer."
      action={<Button onClick={() => navigate('draft')}>Remplir la draft</Button>}
    />
  )
}
