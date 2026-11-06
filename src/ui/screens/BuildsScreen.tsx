import { BuildView } from '../components/BuildView'
import { EmptyState } from '../components/EmptyState'
import { useCatalog } from '../data/gameDataContext'
import { useBuilds } from '../data/useBuilds'

export function BuildsScreen() {
  const catalog = useCatalog()
  const state = useBuilds()

  if (state.status === 'loading') {
    return (
      <p className="muted" role="status">
        Chargement des builds…
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <EmptyState
        title="Builds illisibles"
        description="Le stockage du téléphone est inaccessible. Ferme puis rouvre l'app ; si le problème continue, vérifie l'espace disponible."
      />
    )
  }

  const { builds, invalid } = state.list
  return (
    <>
      {invalid.length > 0 && (
        <p className="muted" role="status">
          {invalid.length} build{invalid.length > 1 ? 's' : ''} illisible
          {invalid.length > 1 ? 's' : ''} :{' '}
          {invalid.map((b) => b.name ?? b.id ?? 'sans nom').join(', ')}.
        </p>
      )}
      {builds.length === 0 ? (
        <EmptyState
          title="Aucun build pour l'instant"
          description="Tu pourras bientôt créer tes builds ici : runes, sorts et ordre des items."
        />
      ) : (
        builds.map((build) => <BuildView key={build.id} build={build} catalog={catalog} />)
      )}
    </>
  )
}
