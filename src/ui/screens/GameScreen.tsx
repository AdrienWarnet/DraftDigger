import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { navigate } from '../navigation/useRoute'

export function GameScreen() {
  return (
    <EmptyState
      title="Aucune partie en cours"
      description="Lance la partie depuis la recommandation pour suivre tes achats et savoir quoi acheter ensuite."
      action={
        <Button variant="secondary" onClick={() => navigate('reco')}>
          Voir la recommandation
        </Button>
      }
    />
  )
}
