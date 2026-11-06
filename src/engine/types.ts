/**
 * Types du domaine (contrats entre les couches, voir docs/TICKETS.md section 3).
 * Aucune dépendance : ce fichier est importable partout.
 */

export const POSITIONS = ['top', 'jungle', 'mid', 'bot', 'support'] as const
export type Position = (typeof POSITIONS)[number]

/** Intensité d'une menace : 0 = aucune, 3 = très forte. */
export type ThreatLevel = 0 | 1 | 2 | 3

export const THREAT_KEYS = ['cc', 'burst', 'engage', 'heal', 'tank'] as const
export type ThreatKey = (typeof THREAT_KEYS)[number]
export type Threats = Record<ThreatKey, ThreatLevel>

export type Champion = {
  id: string // "Yorick"
  name: string
  image: string // URL
  tags: string[] // tags Data Dragon : Fighter, Tank, Mage...
  /** Répartition des dégâts infligés ; la somme vaut 1. */
  damage: { ad: number; ap: number; true: number }
  threats: Threats
}

export type ItemStats = { armor?: number; mr?: number; hp?: number; ad?: number; ap?: number }

export type Item = {
  id: string
  name: string
  image: string // URL
  cost: number // gold.total
  stats: ItemStats
  /** "armor", "mr", "hp", "ad", "ap", "antiheal", "antitank", "mobility", "boots"... */
  categories: string[]
  buildsFrom: string[] // ids des composants
}

// --- Conditions (docs/TICKETS.md, section 3) ------------------------------------

export type Situation = 'ahead' | 'even' | 'behind'

export const METRICS = [
  'enemyAdShare',
  'enemyApShare',
  'enemyCcCount',
  'enemyHealCount',
  'enemyTankCount',
  'enemyBurstCount',
  'enemyEngageCount',
  'laneOpponentDamage',
  'laneOpponentIsTank',
  'situation',
] as const
export type Metric = (typeof METRICS)[number]

export const CONDITION_OPS = ['>=', '<=', '>', '<', '=='] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]

export type Condition = {
  metric: Metric
  op: ConditionOp
  value: number | string
}

/** Une condition qui ajoute `weight` points quand elle est vraie, avec son explication. */
export type WeightedCondition = {
  condition: Condition
  weight: number
  explain: string
}

// --- Build (le format central) ----------------------------------------------------

export type BuildRunes = {
  primaryTree: string // id de l'arbre principal (ex : "8400" Volonté)
  keystone: string // id de la rune clé (ex : "8437")
  primarySlots: string[] // 3 runes
  secondaryTree: string
  secondarySlots: string[] // 2 runes
  shards: string[] // 3 fragments
}

export type FirstItemOption = {
  itemId: string
  useWhen: WeightedCondition[]
}

export type ItemAlternative = {
  itemId: string
  /** Toutes les conditions doivent être vraies pour que l'alternative soit proposée. */
  when: Condition[]
  explain: string
}

export type ItemSlot = {
  slot: number // 1, 2, 3...
  default: string // itemId
  alternatives: ItemAlternative[]
}

export type Build = {
  id: string
  name: string
  championId: string
  /** Un build est propre à un champion ET un poste. */
  position: Position
  /** Ordre d'affichage, sert aussi au départage. */
  order: number
  /** Date ISO de dernière modification. */
  updatedAt: string
  runes: BuildRunes
  summonerSpells: [string, string]
  useWhen: WeightedCondition[]
  firstItemOptions: FirstItemOption[]
  itemOrder: ItemSlot[]
}

/** Condition prête à l'emploi proposée par l'éditeur de builds. */
export type ConditionPreset = {
  id: string
  label: string
  condition: Condition
  explain: string
}

// --- Sortie du moteur -------------------------------------------------------------

export type Confidence = 'low' | 'medium' | 'high'

export type Recommendation<T> = {
  choice: T
  score: number
  reasons: string[]
  alternatives: { choice: T; score: number; reasons: string[] }[]
  confidence: Confidence
}
