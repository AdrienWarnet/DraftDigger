import type { InvalidBuild } from '../../data/buildRepository'
import type { GameCatalog } from '../../data/catalog'
import type { BuildAlert } from '../../engine/patchValidation'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { GameIcon } from '../components/GameIcon'
import { POSITION_LABELS } from '../labels'
import { goBack, navigate } from '../navigation/useRoute'
import styles from './DataAlerts.module.css'

type DataAlertsProps = {
  catalog: GameCatalog
  alerts: BuildAlert[]
  invalid: InvalidBuild[]
}

/** Écran « Alertes de données » : les builds touchés par un changement de patch, à corriger. */
export function DataAlerts({ catalog, alerts, invalid }: DataAlertsProps) {
  return (
    <>
      <Button variant="ghost" className={styles.back} onClick={() => goBack('builds')}>
        Retour à mes builds
      </Button>
      <h2 className={styles.title}>Alertes de données</h2>

      {alerts.length === 0 && invalid.length === 0 ? (
        <EmptyState
          title="Aucune alerte"
          description={`Tous tes builds sont à jour pour le patch ${catalog.version}.`}
        />
      ) : (
        <p className="muted">
          Le patch {catalog.version} a supprimé ou déplacé des éléments utilisés dans ces builds.
          Modifie-les pour choisir un remplaçant.
        </p>
      )}

      {alerts.map(({ build, issues }) => {
        const champion = catalog.championsById.get(build.championId) ?? null
        return (
          <section key={build.id} className={styles.alert} aria-label={build.name}>
            <header className={styles.header}>
              <GameIcon
                entry={champion && { name: champion.name, icon: champion.image }}
                fallbackId={build.championId}
                size={40}
                label=""
              />
              <div className={styles.titles}>
                <h3 className={styles.name}>{build.name}</h3>
                <p className="muted">
                  {champion?.name ?? build.championId}, {POSITION_LABELS[build.position]}
                </p>
              </div>
            </header>
            <ul className={styles.issues}>
              {issues.map((issue) => (
                <li key={issue.path}>{issue.message}</li>
              ))}
            </ul>
            <Button block onClick={() => navigate('builds', 'modifier', build.id)}>
              Modifier ce build
            </Button>
          </section>
        )
      })}

      {invalid.length > 0 && (
        <section className={styles.alert} aria-labelledby="builds-illisibles">
          <h3 id="builds-illisibles" className={styles.name}>
            {invalid.length === 1 ? 'Build illisible' : `${invalid.length} builds illisibles`}
          </h3>
          <p className="muted">
            {invalid.length === 1
              ? 'Conservé tel quel dans le stockage, mais inutilisable : recrée-le ou réimporte une sauvegarde.'
              : 'Conservés tels quels dans le stockage, mais inutilisables : recrée-les ou réimporte une sauvegarde.'}
          </p>
          <ul className={styles.issues}>
            {invalid.map((b, i) => (
              <li key={b.id ?? i}>
                <strong>{b.name ?? b.id ?? 'Sans nom'}</strong> : {b.errors.slice(0, 3).join(' ; ')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
