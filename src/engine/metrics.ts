import { METRIC_THRESHOLDS } from './config'
import { laneOpponent, type Draft } from './draft'
import type { PositionRates } from './positions'
import type { Champion, ThreatKey } from './types'

/**
 * Ce que le moteur sait de la compo ennemie (valeurs des `Metric` des conditions, hors `situation`).
 * Avec 0 ennemi connu, tout vaut 0 et le vis-à-vis est inconnu (`null`) : aucune condition
 * sur l'équipe ennemie n'est vraie.
 */
export type Metrics = {
  /** Part moyenne des dégâts physiques de l'équipe ennemie (0 à 1). */
  enemyAdShare: number
  /** Part moyenne des dégâts magiques (0 à 1). */
  enemyApShare: number
  /** Sommes des menaces des ennemis connus. */
  enemyCcCount: number
  enemyHealCount: number
  enemyBurstCount: number
  enemyEngageCount: number
  /** Nombre d'ennemis avec une menace `tank` ≥ 2. */
  enemyTankCount: number
  /** Profil de dégâts du vis-à-vis, `null` s'il est inconnu. */
  laneOpponentDamage: 'ad' | 'ap' | 'mixed' | null
  /** 1 si le vis-à-vis est un tank, 0 sinon, `null` s'il est inconnu. */
  laneOpponentIsTank: 0 | 1 | null
  /** Nombre d'ennemis pris en compte (0 à 5). */
  knownEnemies: number
}

/** Métriques à partir des champions ennemis connus et du vis-à-vis (s'il est connu). */
export function computeMetrics(enemies: readonly Champion[], opponent: Champion | null): Metrics {
  const count = enemies.length
  const sum = (key: ThreatKey) => enemies.reduce((total, c) => total + c.threats[key], 0)
  const average = (part: 'ad' | 'ap') =>
    count === 0 ? 0 : enemies.reduce((total, c) => total + c.damage[part], 0) / count

  return {
    enemyAdShare: average('ad'),
    enemyApShare: average('ap'),
    enemyCcCount: sum('cc'),
    enemyHealCount: sum('heal'),
    enemyBurstCount: sum('burst'),
    enemyEngageCount: sum('engage'),
    enemyTankCount: enemies.filter((c) => c.threats.tank >= METRIC_THRESHOLDS.tankLevel).length,
    laneOpponentDamage: opponent ? damageProfile(opponent) : null,
    laneOpponentIsTank: opponent
      ? opponent.threats.tank >= METRIC_THRESHOLDS.tankLevel
        ? 1
        : 0
      : null,
    knownEnemies: count,
  }
}

/** Type de dégâts dominant d'un champion (AD à égalité) : sert à choisir ses items offensifs. */
export function mainDamage(champion: Champion): 'ad' | 'ap' {
  return champion.damage.ap > champion.damage.ad ? 'ap' : 'ad'
}

/** « ad » si la part AD dépasse le seuil, « ap » de même, sinon « mixed ». */
export function damageProfile(champion: Champion): 'ad' | 'ap' | 'mixed' {
  if (champion.damage.ad >= METRIC_THRESHOLDS.laneDamageShare) return 'ad'
  if (champion.damage.ap >= METRIC_THRESHOLDS.laneDamageShare) return 'ap'
  return 'mixed'
}

/**
 * Métriques d'une draft : ennemis saisis (ceux inconnus dans le patch sont ignorés)
 * et vis-à-vis = ennemi au poste du joueur (postes devinés, T2.3).
 */
export function metricsFromDraft(
  draft: Draft,
  championsById: ReadonlyMap<string, Champion>,
  rates: PositionRates,
): Metrics {
  const enemies = draft.enemies.flatMap((e) => {
    const champion = championsById.get(e.championId)
    return champion ? [champion] : []
  })
  const opponentId = laneOpponent(draft, rates)?.championId
  const opponent = opponentId ? (championsById.get(opponentId) ?? null) : null
  return computeMetrics(enemies, opponent)
}
