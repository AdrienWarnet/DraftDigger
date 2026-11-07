import { DEFENSE_REFERENCE_LEVEL } from './config'
import type { Metrics } from './metrics'
import type { BaseStats, Item } from './types'

/**
 * Calculs défensifs (docs/TICKETS.md section 4).
 * Dégâts reçus = dégâts × 100 / (100 + résistance) : 100 d'armure divise les dégâts physiques par 2.
 */

/** Part des dégâts bloquée par une résistance : `résistance / (100 + résistance)` (100 → 50 %). */
export function damageReduction(resist: number): number {
  const r = Math.max(0, resist)
  return r / (100 + r)
}

/**
 * Valeur d'une statistique au niveau `level` (1 à 18), avec la courbe de progression du jeu :
 * base + gain × (niveau − 1) × (0,7025 + 0,0175 × (niveau − 1)).
 */
export function statAtLevel(base: number, perLevel: number, level: number): number {
  const n = Math.min(18, Math.max(1, Math.round(level))) - 1
  return base + perLevel * n * (0.7025 + 0.0175 * n)
}

export type Resistances = { armor: number; mr: number }

/** Résistances du champion au niveau donné, items possédés compris. */
export function resistances(
  base: BaseStats,
  ownedItems: readonly Item[] = [],
  level: number = DEFENSE_REFERENCE_LEVEL,
): Resistances {
  const fromItems = (key: 'armor' | 'mr') =>
    ownedItems.reduce((total, item) => total + (item.stats[key] ?? 0), 0)
  return {
    armor: statAtLevel(base.armor, base.armorPerLevel, level) + fromItems('armor'),
    mr: statAtLevel(base.mr, base.mrPerLevel, level) + fromItems('mr'),
  }
}

/**
 * Part des dégâts reçus en moins grâce à une résistance supplémentaire :
 * passer de `before` à `after` réduit les dégâts reçus de `(after − before) / (100 + after)`.
 * Ex : de 50 à 100 d'armure, les dégâts physiques reçus baissent de 25 %.
 */
export function damageTakenReduction(before: number, after: number): number {
  const b = Math.max(0, before)
  const a = Math.max(0, after)
  return a <= b ? 0 : (a - b) / (100 + a)
}

export type DefensiveGain = {
  /** Gain pondéré par la compo ennemie (0 à 1) : `partAD × gainAD + partAP × gainAP`. */
  gain: number
  /** Dégâts physiques reçus en moins (0 à 1). */
  adGain: number
  /** Dégâts magiques reçus en moins (0 à 1). */
  apGain: number
  /** Phrase prête à afficher, ou `null` si l'item n'apporte rien contre cette compo. */
  text: string | null
}

/**
 * Ce qu'un item défensif apporte face à la compo ennemie, par rapport aux résistances actuelles.
 */
export function defensiveGain(
  item: Item,
  current: Resistances,
  metrics: Pick<Metrics, 'enemyAdShare' | 'enemyApShare'>,
): DefensiveGain {
  const adGain = damageTakenReduction(current.armor, current.armor + (item.stats.armor ?? 0))
  const apGain = damageTakenReduction(current.mr, current.mr + (item.stats.mr ?? 0))
  const gain = metrics.enemyAdShare * adGain + metrics.enemyApShare * apGain
  return { gain, adGain, apGain, text: defensiveText(adGain, apGain, metrics) }
}

/** Ex : « −18 % de dégâts reçus face à leurs dégâts AD ». Espace fine insécable avant « % ». */
function defensiveText(
  adGain: number,
  apGain: number,
  metrics: Pick<Metrics, 'enemyAdShare' | 'enemyApShare'>,
): string | null {
  const percent = (value: number) => `${Math.round(value * 100)} %`
  const ad = adGain > 0 && metrics.enemyAdShare > 0 && Math.round(adGain * 100) > 0
  const ap = apGain > 0 && metrics.enemyApShare > 0 && Math.round(apGain * 100) > 0
  if (ad && ap) {
    return `−${percent(adGain)} de dégâts physiques et −${percent(apGain)} de dégâts magiques reçus`
  }
  if (ad) return `−${percent(adGain)} de dégâts reçus face à leurs dégâts AD`
  if (ap) return `−${percent(apGain)} de dégâts reçus face à leurs dégâts AP`
  return null
}
