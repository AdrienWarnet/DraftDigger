import { useEffect, useMemo } from 'react'
import { playerChampionId } from '../../engine/draft'
import { metricsFromDraft, type Metrics } from '../../engine/metrics'
import {
  applyForcedBuild,
  recommendBuild,
  recommendFirstItem,
  type BuildRecommendation,
} from '../../engine/recommend'
import type { Recommendation } from '../../engine/types'
import { useBuildsStore } from '../../store/buildsStore'
import { useDraftStore } from '../../store/draftStore'
import { useCatalog } from './gameDataContext'

export type PreGameRecommendation =
  | { status: 'loading' }
  | { status: 'noChampion' }
  | {
      status: 'ready'
      championId: string
      metrics: Metrics
      build: BuildRecommendation
      /** `true` si le build affiché a été choisi à la main (T5.4). */
      forced: boolean
      firstItem: Recommendation<string> | null
    }

/**
 * Recommandation avant la partie : draft + builds du joueur + catalogue → moteur.
 * Aucune règle ici : tout le calcul est dans src/engine (recommend.ts).
 */
export function usePreGameRecommendation(): PreGameRecommendation {
  const catalog = useCatalog()
  const draft = useDraftStore((s) => s.draft)
  const buildsStatus = useBuildsStore((s) => s.status)
  const builds = useBuildsStore((s) => s.list.builds)
  const loadBuilds = useBuildsStore((s) => s.load)
  const forcedBuildId = useDraftStore((s) => s.forcedBuildId)

  useEffect(() => {
    void loadBuilds()
  }, [loadBuilds])

  return useMemo((): PreGameRecommendation => {
    if (buildsStatus === 'idle' || buildsStatus === 'loading') return { status: 'loading' }
    const championId = playerChampionId(draft)
    if (!championId) return { status: 'noChampion' }
    const metrics = metricsFromDraft(draft, catalog.championsById, catalog.positionRates)
    const { forced, ...build } = applyForcedBuild(
      recommendBuild(builds, championId, draft.playerPosition, metrics),
      forcedBuildId,
    )
    const firstItem =
      build.kind === 'ok' ? recommendFirstItem(build.recommendation.choice, metrics, 'even') : null
    return { status: 'ready', championId, metrics, build, forced, firstItem }
  }, [buildsStatus, builds, draft, catalog, forcedBuildId])
}
