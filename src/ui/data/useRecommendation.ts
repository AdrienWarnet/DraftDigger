import { useEffect, useMemo } from 'react'
import { playerChampionId } from '../../engine/draft'
import { mainDamage, metricsFromDraft, type Metrics } from '../../engine/metrics'
import {
  applyForcedBuild,
  recommendBuild,
  recommendFirstItem,
  recommendNextItem,
  situationalCategories,
  type BuildRecommendation,
  type NextItemRecommendation,
} from '../../engine/recommend'
import type { Recommendation, Situation } from '../../engine/types'
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

export type GameRecommendation = NextItemRecommendation & {
  /** Catégories visées quand le build est terminé (pour expliquer l'item de situation). */
  categories: string[]
}

/**
 * Prochain item à acheter (T6.3) : build de la recommandation + items achetés + situation.
 * `null` tant qu'il n'y a pas de build pour le champion joué.
 */
export function useGameRecommendation(
  pre: PreGameRecommendation,
  ownedItemIds: readonly string[],
  situation: Situation,
): GameRecommendation | null {
  const catalog = useCatalog()
  return useMemo(() => {
    if (pre.status !== 'ready' || pre.build.kind !== 'ok') return null
    const champion = catalog.championsById.get(pre.championId)
    if (!champion) return null
    const build = pre.build.recommendation.choice
    const next = recommendNextItem(build, ownedItemIds, pre.metrics, situation, {
      itemsById: catalog.itemsById,
      baseStats: champion.baseStats,
      playerDamage: mainDamage(champion),
    })
    return { ...next, categories: situationalCategories(pre.metrics) }
  }, [pre, ownedItemIds, situation, catalog])
}
