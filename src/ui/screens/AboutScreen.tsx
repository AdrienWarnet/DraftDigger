import { useEffect } from 'react'
import { POSITION_RATES_PATCH } from '../../data/positionRates'
import { useBuildsStore } from '../../store/buildsStore'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useCatalog } from '../data/gameDataContext'
import { promptInstall, useCanInstall } from '../install'
import styles from './AboutScreen.module.css'

/** Mode d'emploi complet : section « Utiliser l'app » du README. */
const GUIDE_URL = 'https://github.com/AdrienWarnet/DraftDigger#utiliser-lapp'

/** Écran « À propos » (T7.4) : version des données, builds enregistrés, mode d'emploi. */
export function AboutScreen() {
  const catalog = useCatalog()
  const status = useBuildsStore((s) => s.status)
  const buildCount = useBuildsStore((s) => s.list.builds.length)
  const load = useBuildsStore((s) => s.load)
  const canInstall = useCanInstall()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <Card title="DraftDigger">
        <p>
          Tes builds League of Legends, adaptés à chaque partie : le bon build et le premier item
          avant la game, puis quoi acheter ensuite, avec le pourquoi.
        </p>
        <a className={styles.link} href={GUIDE_URL} target="_blank" rel="noreferrer">
          Mode d’emploi complet
        </a>
      </Card>

      {canInstall && (
        <Card title="Installer l’app">
          <p>
            Une icône sur ton téléphone, ouverture instantanée, et l’app marche même sans réseau.
          </p>
          <Button block onClick={() => void promptInstall()}>
            Installer l’app
          </Button>
        </Card>
      )}

      <Card title="Données">
        <dl className={styles.facts}>
          <dt>Patch du jeu (Data Dragon)</dt>
          <dd>{catalog.version}</dd>
          <dt>Postes des ennemis devinés d’après le patch</dt>
          <dd>{POSITION_RATES_PATCH}</dd>
          <dt>Builds enregistrés sur ce téléphone</dt>
          <dd>{status === 'ready' ? buildCount : '…'}</dd>
        </dl>
        <p className="muted">
          Tout reste sur ton téléphone : exporte tes builds depuis l’onglet Builds pour les
          sauvegarder.
        </p>
      </Card>
    </>
  )
}
