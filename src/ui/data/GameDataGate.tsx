import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { POSITION_RATES_PATCH } from '../../data/positionRates'
import { useGameDataState } from './gameDataContext'
import styles from './GameDataGate.module.css'

/** Affiche le chargement ou l'erreur tant que les données du patch ne sont pas prêtes. */
export function GameDataGate({ children }: { children: ReactNode }) {
  const { state, retry } = useGameDataState()

  if (state.status === 'loading') {
    return (
      <p className={styles.loading} role="status">
        Chargement des données du patch…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        title="Données du jeu indisponibles"
        description="Au premier lancement, l'app doit télécharger les données du patch. Vérifie ta connexion internet puis réessaie."
        action={<Button onClick={retry}>Réessayer</Button>}
      />
    )
  }

  return (
    <>
      {state.result.stale && (
        <p className={styles.notice} role="status">
          Pas de connexion : l'app utilise les données du patch {state.result.data.version} en
          mémoire.
        </p>
      )}
      {children}
      <p className={styles.version}>
        Données du jeu : patch {state.result.data.version} (postes des ennemis : patch{' '}
        {POSITION_RATES_PATCH})
      </p>
    </>
  )
}
