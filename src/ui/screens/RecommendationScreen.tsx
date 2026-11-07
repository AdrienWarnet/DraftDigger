import { buildChoiceFallbackReason } from '../../engine/explain'
import type { Metrics } from '../../engine/metrics'
import type { Position } from '../../engine/types'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ExplanationBanner } from '../components/ExplanationBanner'
import { GameIcon } from '../components/GameIcon'
import { useCatalog } from '../data/gameDataContext'
import { usePreGameRecommendation } from '../data/useRecommendation'
import { POSITION_LABELS } from '../labels'
import { navigate } from '../navigation/useRoute'
import styles from './RecommendationScreen.module.css'

export function RecommendationScreen() {
  const catalog = useCatalog()
  const playerPosition = useDraftStore((s) => s.draft.playerPosition)
  const result = usePreGameRecommendation()

  if (result.status === 'loading') {
    return (
      <p className="muted" role="status">
        Chargement de tes builds…
      </p>
    )
  }

  if (result.status === 'noChampion') {
    return (
      <EmptyState
        title="Choisis ton champion"
        description="Indique ton poste et ton champion dans la draft : la recommandation s'adapte ensuite aux ennemis saisis."
        action={<Button onClick={() => navigate('draft')}>Remplir la draft</Button>}
      />
    )
  }

  const champion = catalog.championsById.get(result.championId)
  const championName = champion?.name ?? result.championId

  if (result.build.kind === 'noBuild') {
    return (
      <EmptyState
        title={`Aucun build pour ${championName}`}
        description={`Crée un build pour ${championName} au poste ${POSITION_LABELS[playerPosition]} : runes, sorts, items et conditions.`}
        action={<Button onClick={() => navigate('builds', 'nouveau')}>Créer un build</Button>}
      />
    )
  }

  const { recommendation, tied, fallbackPosition } = result.build
  const build = recommendation.choice
  const firstItem = result.firstItem ? catalog.itemsById.get(result.firstItem.choice) : undefined

  return (
    <>
      <p className={styles.basis} role="status">
        {basisText(result.metrics, Boolean(build.favorite))}
      </p>

      {fallbackPosition && (
        <p className={styles.notice}>
          Aucun build {championName} au poste {POSITION_LABELS[playerPosition]} : voici celui prévu
          pour le poste {POSITION_LABELS[fallbackPosition as Position]}.
        </p>
      )}
      {tied.length > 1 && (
        <p className={styles.notice}>
          {tied.length} builds à égalité : {tied.map((b) => b.name).join(', ')}. Choisis ton favori
          dans « Mes builds » pour trancher.
        </p>
      )}

      <Card title="Build recommandé">
        <div className={styles.buildTitle}>
          <GameIcon
            entry={champion ? { name: champion.name, icon: champion.image } : null}
            fallbackId={result.championId}
            size={48}
            label=""
          />
          <div>
            <p className={styles.buildName}>{build.name}</p>
            <p className="muted">
              {championName}, {POSITION_LABELS[build.position]}
              {build.favorite ? ', favori' : ''}
            </p>
          </div>
        </div>
        <div className={styles.loadout}>
          <span className={styles.keystone}>
            <GameIcon
              entry={catalog.runesById.get(build.runes.keystone) ?? null}
              fallbackId={build.runes.keystone}
              size={44}
              shape="round"
              label=""
            />
            <span className={styles.secondaryTree}>
              <GameIcon
                entry={catalog.treesById.get(build.runes.secondaryTree) ?? null}
                fallbackId={build.runes.secondaryTree}
                size={18}
                shape="round"
                label=""
              />
            </span>
          </span>
          {build.summonerSpells.map((id) => (
            <GameIcon
              key={id}
              entry={catalog.summonerSpellsById.get(id) ?? null}
              fallbackId={id}
              size={36}
              label=""
            />
          ))}
          <p className={styles.loadoutText}>
            {[
              catalog.runesById.get(build.runes.keystone)?.name,
              catalog.treesById.get(build.runes.secondaryTree)?.name,
              ...build.summonerSpells.map((id) => catalog.summonerSpellsById.get(id)?.name),
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
        <ExplanationBanner
          reasons={
            recommendation.reasons.length > 0
              ? recommendation.reasons
              : [
                  buildChoiceFallbackReason(
                    recommendation.alternatives.length + 1,
                    Boolean(build.favorite),
                  ),
                ]
          }
        />
        <Button variant="ghost" onClick={() => navigate('builds', 'voir', build.id)}>
          Voir le build complet
        </Button>
      </Card>

      {result.firstItem && (
        <Card title="Premier item">
          <div className={styles.firstItem}>
            <GameIcon
              entry={firstItem ? { name: firstItem.name, icon: firstItem.image } : null}
              fallbackId={result.firstItem.choice}
              size={56}
              label=""
            />
            <p className={styles.firstItemName}>{firstItem?.name ?? result.firstItem.choice}</p>
          </div>
          <ExplanationBanner reasons={result.firstItem.reasons} />
        </Card>
      )}

      <Button block onClick={() => navigate('partie')}>
        Lancer la partie
      </Button>
    </>
  )
}

/** « Recommandation basée sur 3/5 ennemis », vis-à-vis compris ou non. */
function basisText(metrics: Metrics, favorite: boolean): string {
  if (metrics.knownEnemies === 0) {
    return `Aucun ennemi saisi : voici ton build ${favorite ? 'favori' : 'par défaut'}. Ajoute les ennemis dans la draft pour l’adapter.`
  }
  const enemies = `Recommandation basée sur ${metrics.knownEnemies}/5 ennemis`
  return metrics.laneOpponentDamage === null ? `${enemies}, vis-à-vis inconnu.` : `${enemies}.`
}
