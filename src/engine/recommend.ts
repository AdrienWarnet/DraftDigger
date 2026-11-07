import { compareInGroup } from './buildList'
import { NEXT_ITEM_SCORING, SITUATIONAL_ITEMS } from './config'
import { defensiveGain, resistances } from './defense'
import {
  confidence,
  evaluateCondition,
  scoreOptions,
  toRecommendation,
  type ScoredOption,
} from './evaluate'
import { buildReasons } from './explain'
import { isCompletedItem } from './itemFilters'
import type { Metrics } from './metrics'
import { withSituation } from './situation'
import type { BaseStats, Build, Item, Position, Recommendation, Situation } from './types'

// --- Choix du build (T5.1) ---------------------------------------------------------

export type BuildRecommendation =
  | { kind: 'noBuild' }
  | {
      kind: 'ok'
      recommendation: Recommendation<Build>
      /**
       * Builds non favoris à égalité en tête : tous proposés (vide si un seul gagnant, ou si le
       * favori fait partie des premiers).
       */
      tied: Build[]
      /** Poste des builds proposés quand aucun build n'existe pour le poste joué, sinon `null`. */
      fallbackPosition: Position | null
    }

/**
 * Choisit parmi les builds du champion et du poste joués (section 4, T5.1) :
 * - plus haut score (somme des poids des conditions vraies) ;
 * - égalité en tête : le favori l'emporte s'il en fait partie, sinon les ex aequo sont proposés ;
 * - sans build pour ce poste : ceux du champion à d'autres postes, en confiance faible.
 */
export function recommendBuild(
  builds: readonly Build[],
  championId: string,
  position: Position,
  metrics: Metrics,
): BuildRecommendation {
  const ofChampion = builds.filter((b) => b.championId === championId)
  const forPosition = ofChampion.filter((b) => b.position === position)
  const candidates = (forPosition.length > 0 ? forPosition : ofChampion)
    .slice()
    .sort(compareInGroup)
  if (candidates.length === 0) return { kind: 'noBuild' }

  // Favori placé en premier : à égalité il garde la tête (tri stable).
  const scored = scoreOptions(
    candidates.map((b) => ({ choice: b, useWhen: b.useWhen })),
    metrics,
    'even',
  ).map((s) => ({ ...s, reasons: buildReasons({ conditionReasons: s.reasons }) }))
  const recommendation = toRecommendation(scored, metrics.knownEnemies)!
  const topScore = scored[0]!.score
  const leaders = scored.filter((s) => s.score === topScore).map((s) => s.choice)
  const tied = leaders.length > 1 && !leaders.some((b) => b.favorite) ? leaders : []
  const fallback = forPosition.length === 0
  return {
    kind: 'ok',
    recommendation: fallback ? { ...recommendation, confidence: 'low' } : recommendation,
    tied,
    fallbackPosition: fallback ? candidates[0]!.position : null,
  }
}

// --- Premier item (T5.2) ------------------------------------------------------------

/** Départage les options de premier item du build ; à égalité, la première option du build. */
export function recommendFirstItem(
  build: Build,
  metrics: Metrics,
  situation: Situation = 'even',
): Recommendation<string> | null {
  const scored = scoreOptions(
    build.firstItemOptions.map((o) => ({ choice: o.itemId, useWhen: o.useWhen })),
    metrics,
    situation,
  ).map((s) => ({ ...s, reasons: buildReasons({ conditionReasons: s.reasons }) }))
  return toRecommendation(scored, metrics.knownEnemies)
}

// --- Prochain item (T6.3) -----------------------------------------------------------

export type NextItemContext = {
  itemsById: ReadonlyMap<string, Item>
  /** Statistiques de base du champion joué, pour ses résistances actuelles. */
  baseStats: BaseStats
  /**
   * Dégâts principaux du champion joué (`mainDamage`) : les items de situation offensifs de
   * l'autre type sont écartés (pas de Bâton du vide pour un champion AD). Absent : aucun filtre.
   */
  playerDamage?: 'ad' | 'ap'
}

export type NextItemRecommendation = {
  /** Numéro du slot du build recommandé, ou `null` pour un item de situation (build terminé). */
  slot: number | null
  recommendation: Recommendation<Item> | null
  /** Composants déjà possédés de l'item recommandé (progression). */
  componentsOwned: string[]
}

/**
 * Prochain item à acheter (T6.3, section 4) :
 * 1. premier slot non couvert (item par défaut ou une de ses alternatives possédé) ;
 * 2. candidats : le défaut + les alternatives dont toutes les conditions sont vraies ;
 * 3. score = bonus d'alternative + gain défensif × 10 + situation ; égalité : le défaut.
 * Tous les slots achetés : item de situation (anti-soin, anti-tank ou défensif).
 */
export function recommendNextItem(
  build: Build,
  ownedItemIds: readonly string[],
  metrics: Metrics,
  situation: Situation,
  context: NextItemContext,
): NextItemRecommendation {
  const owned = new Set(ownedItemIds)
  const ownedItems = ownedItemIds.flatMap((id) => context.itemsById.get(id) ?? [])
  const current = resistances(context.baseStats, ownedItems)

  const slot = [...build.itemOrder]
    .sort((a, b) => a.slot - b.slot)
    .find((s) => !owned.has(s.default) && !s.alternatives.some((a) => owned.has(a.itemId)))

  const scoreItem = (item: Item, base: number, conditionReasons: string[]): ScoredOption<Item> => {
    const defense = defensiveGain(item, current, metrics)
    return {
      choice: item,
      score: base + defense.gain * NEXT_ITEM_SCORING.gainToPoints,
      reasons: buildReasons({ conditionReasons, defensive: defense, metrics }),
    }
  }

  let candidates: ScoredOption<Item>[]
  if (slot) {
    const defaultItem = context.itemsById.get(slot.default)
    candidates = [
      ...(defaultItem ? [scoreItem(defaultItem, 0, [])] : []),
      ...slot.alternatives.flatMap((alt) => {
        const item = context.itemsById.get(alt.itemId)
        const valid = alt.when.every((c) => evaluateCondition(c, metrics, situation))
        return item && valid
          ? [scoreItem(item, NEXT_ITEM_SCORING.alternativeBonus, [alt.explain])]
          : []
      }),
    ]
  } else {
    const wanted = situationalCategories(metrics)
    candidates = [...context.itemsById.values()]
      .filter((i) => !owned.has(i.id) && isCompletedItem(i))
      .filter((i) => wanted.some((c) => i.categories.includes(c)))
      .filter((i) => suitsDamage(i, context.playerDamage))
      .map((i) => scoreItem(i, 0, []))
  }

  const ranked = withSituation(
    candidates.sort((a, b) => b.score - a.score),
    situation,
  ).map((s) => ({ ...s, reasons: buildReasons({ conditionReasons: s.reasons }) }))
  const kept = slot ? ranked : ranked.slice(0, SITUATIONAL_ITEMS.count)
  const recommendation = toRecommendation(kept, metrics.knownEnemies)
  const choice = recommendation?.choice
  return {
    slot: slot?.slot ?? null,
    recommendation:
      recommendation && kept.length === 1
        ? { ...recommendation, confidence: confidence(null, metrics.knownEnemies) }
        : recommendation,
    componentsOwned: choice ? choice.buildsFrom.filter((id) => owned.has(id)) : [],
  }
}

/** `false` pour un item d'AP pur quand on joue AD, et inversement. */
function suitsDamage(item: Item, damage: NextItemContext['playerDamage']): boolean {
  if (!damage) return true
  const other = damage === 'ad' ? 'ap' : 'ad'
  return !item.categories.includes(other) || item.categories.includes(damage)
}

/** Catégories d'items de situation selon la compo (section 4, T6.3). */
export function situationalCategories(metrics: Metrics): string[] {
  if (metrics.enemyHealCount >= SITUATIONAL_ITEMS.antihealMinHeal) return ['antiheal']
  if (metrics.enemyTankCount >= SITUATIONAL_ITEMS.antitankMinTanks) return ['antitank']
  return ['armor', 'mr', 'hp']
}

/**
 * Applique un build choisi à la main par le joueur (T5.4) : il devient le choix, les autres
 * (dont la recommandation du moteur) passent en alternatives. Sans effet si ce build ne fait pas
 * partie des candidats (ex : autre champion) ; `forced` indique si le choix manuel s'applique.
 */
export function applyForcedBuild(
  result: BuildRecommendation,
  forcedBuildId: string | null,
): BuildRecommendation & { forced: boolean } {
  if (result.kind !== 'ok' || !forcedBuildId) return { ...result, forced: false }
  const { recommendation } = result
  if (recommendation.choice.id === forcedBuildId) return { ...result, forced: true }
  const forced = recommendation.alternatives.find((a) => a.choice.id === forcedBuildId)
  if (!forced) return { ...result, forced: false }
  return {
    ...result,
    forced: true,
    tied: [],
    recommendation: {
      ...recommendation,
      choice: forced.choice,
      score: forced.score,
      reasons: forced.reasons,
      alternatives: [
        {
          choice: recommendation.choice,
          score: recommendation.score,
          reasons: recommendation.reasons,
        },
        ...recommendation.alternatives.filter((a) => a.choice.id !== forcedBuildId),
      ],
    },
  }
}
