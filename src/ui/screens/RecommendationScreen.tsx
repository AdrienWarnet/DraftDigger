import { createBuildId } from '../../data/localBuildRepository'
import { templateIssues } from '../../engine/buildTemplates'
import { buildChoiceFallbackReason, confidenceExplanation } from '../../engine/explain'
import type { Metrics } from '../../engine/metrics'
import type { Position } from '../../engine/types'
import { useBuildsStore } from '../../store/buildsStore'
import { useDraftStore } from '../../store/draftStore'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
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
  const forceBuild = useDraftStore((s) => s.forceBuild)
  const saveBuild = useBuildsStore((s) => s.save)
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

  const { recommendation, tied, fallbackPosition, generic } = result.build
  const build = recommendation.choice
  const firstItem = result.firstItem ? catalog.itemsById.get(result.firstItem.choice) : undefined
  // Build générique (epic 10) : ids absents du patch signalés, copie en un vrai build modifiable.
  const patchIssues = generic ? templateIssues(generic.template, catalog) : []
  async function copyGenericBuild() {
    const saved = await saveBuild({ ...build, id: createBuildId() })
    navigate('builds', 'modifier', saved.id)
  }

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
          {tied.length} builds à égalité : {tied.map((b) => b.name).join(', ')}. Choisis-en un
          ci-dessous, ou marque ton favori dans « Mes builds ».
        </p>
      )}

      <Card
        title={
          generic ? 'Build générique' : result.forced ? 'Build choisi par toi' : 'Build recommandé'
        }
      >
        {result.forced ? (
          <Button variant="ghost" className={styles.reset} onClick={() => forceBuild(null)}>
            Revenir à la recommandation
          </Button>
        ) : (
          <ConfidenceBadge
            level={recommendation.confidence}
            explanation={confidenceExplanation(
              recommendation.confidence,
              result.metrics.knownEnemies,
              recommendation.alternatives[0]
                ? recommendation.score - recommendation.alternatives[0].score
                : null,
              Boolean(build.favorite),
            )}
          />
        )}
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
              {generic ? ', modèle générique' : ''}
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
        {generic ? (
          <>
            {patchIssues.length > 0 && (
              <p className={styles.notice}>
                Ce modèle date d’un autre patch : {patchIssues.map((i) => i.message).join(' ')}
              </p>
            )}
            <Button variant="secondary" onClick={() => void copyGenericBuild()}>
              Copier dans mes builds
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => navigate('builds', 'voir', build.id)}>
            Voir le build complet
          </Button>
        )}
        {recommendation.alternatives.length > 0 && (
          <details className={styles.others}>
            <summary>
              {recommendation.alternatives.length === 1
                ? 'Autre build possible'
                : `${recommendation.alternatives.length} autres builds possibles`}
            </summary>
            <ul className={styles.otherList}>
              {recommendation.alternatives.map((alt) => (
                <li key={alt.choice.id} className={styles.other}>
                  <div className={styles.otherHeader}>
                    <span className={styles.otherName}>{alt.choice.name}</span>
                    <span className={styles.points}>
                      {alt.score} pt{alt.score > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className={styles.otherReasons}>
                    {alt.reasons.length > 0 ? alt.reasons.join(' ') : 'Aucune condition vraie.'}
                  </p>
                  <Button variant="secondary" onClick={() => forceBuild(alt.choice.id)}>
                    Jouer ce build
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
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
