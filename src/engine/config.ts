/**
 * Réglages du moteur et de l'éditeur, regroupés ici (docs/TICKETS.md : « Tout ce qui est configurable »).
 * Les valeurs de calcul (poids, seuils, modificateurs) arrivent avec l'epic 4.
 */

/**
 * Items d'un nouveau build, pour qu'il soit enregistrable tout de suite ;
 * le joueur les remplace dans l'éditeur d'items (T3.7).
 * TODO(joueur) : changer ces valeurs par défaut si besoin (ids Data Dragon).
 */
export const NEW_BUILD_DEFAULTS = {
  firstItemId: '1055', // Lame de Doran
  firstSlotItemId: '1001', // Bottes
} as const

/** Limites de l'éditeur d'items (un inventaire = 6 emplacements). */
export const BUILD_EDITOR_LIMITS = {
  firstItemOptions: 3,
  slots: 6,
  alternativesPerSlot: 3,
} as const

/**
 * Condition provisoire d'une alternative ajoutée avant d'avoir choisi sa vraie condition
 * (l'éditeur de conditions la remplace). « En retard » : proposée seulement dans ce cas.
 */
export const PROVISIONAL_ALTERNATIVE = {
  when: [{ metric: 'situation', op: '==', value: 'behind' }],
  explain: 'Condition à préciser : pour l’instant, proposé quand tu es en retard.',
} as const

/** Poids proposés pour une condition dans l'éditeur (points ajoutés quand elle est vraie). */
export const WEIGHT_LEVELS = [
  { label: 'Faible', value: 1 },
  { label: 'Moyen', value: 2 },
  { label: 'Fort', value: 3 },
] as const

/** Poids d'une condition qu'on vient de cocher. */
export const DEFAULT_CONDITION_WEIGHT = 2

/** Rappel d'export dans « Mes builds » : jours sans export avant de le proposer. */
export const EXPORT_REMINDER_DAYS = 7

/** Seuils des métriques de la compo ennemie (T4.1). */
export const METRIC_THRESHOLDS = {
  /** Part de dégâts au-delà de laquelle le vis-à-vis est « AD » ou « AP » (sinon « mixte »). */
  laneDamageShare: 0.65,
  /** Niveau de menace `tank` à partir duquel un champion compte comme tank. */
  tankLevel: 2,
} as const

/**
 * Niveau du champion pris pour ses résistances de base dans le calcul défensif (milieu de partie).
 * TODO(joueur) : ajuster si les gains défensifs semblent sur ou sous-estimés.
 */
export const DEFENSE_REFERENCE_LEVEL = 9

/**
 * Confiance d'une recommandation (docs/TICKETS.md section 4) selon l'écart de points entre
 * le 1er et le 2e choix et le nombre d'ennemis connus. Avec une seule option, seul le nombre
 * d'ennemis compte. TODO(joueur) : ajuster après les premières parties (T7.2).
 */
export const CONFIDENCE_THRESHOLDS = {
  high: { minGap: 3, minEnemies: 4 },
  medium: { minGap: 1, minEnemies: 2 },
} as const

/** Nombre maximum de raisons affichées sous une recommandation (T4.4). */
export const MAX_REASONS = 3

/** En dessous de cette part de dégâts reçus en moins (pondérée), un item n'a pas d'argument défensif. */
export const MIN_DEFENSIVE_GAIN_TO_EXPLAIN = 0.05

/**
 * Modificateurs de score selon la situation, en points (T4.5), pour les candidats du prochain item.
 * TODO(joueur) : ajuster après les premières parties (T7.2).
 */
export const SITUATION_MODIFIERS = {
  behind: {
    /** Item défensif (armure, RM ou PV). */
    defensive: 1,
    /** Le moins cher des candidats (s'ils n'ont pas tous le même prix). */
    cheapest: 1,
    /** Le plus cher des candidats. */
    mostExpensive: -1,
    reason: 'En retard, on privilégie un item abordable et défensif.',
  },
  ahead: {
    /** Item offensif (AD ou AP, sans armure, RM ni PV). */
    offensive: 1,
    reason: 'Devant, on accélère avec un item offensif.',
  },
} as const

/** Score du prochain item (docs/TICKETS.md section 4 « Échelle unique des scores »). */
export const NEXT_ITEM_SCORING = {
  /** Points d'une alternative dont les conditions sont vraies (le défaut en a 0). */
  alternativeBonus: 2,
  /** Conversion du gain défensif (0 à 1) en points : 0,3 → 3 points. */
  gainToPoints: 10,
} as const

/** Items de situation proposés quand tous les slots du build sont achetés (T6.3). */
export const SITUATIONAL_ITEMS = {
  /** Total de soin ennemi à partir duquel l'anti-soin est proposé. */
  antihealMinHeal: 2,
  /** Nombre de tanks ennemis à partir duquel l'anti-tank est proposé. */
  antitankMinTanks: 2,
  /** Nombre de propositions retenues (la meilleure et ses alternatives). */
  count: 3,
} as const

/** Inventaire en partie (T6.1). */
export const INVENTORY = {
  // 6 emplacements comme dans le jeu, bottes comprises (validé par le joueur).
  /** Nombre d'items possédés au plus. */
  maxItems: 6,
} as const

/** Raccourcis de saisie (T7.3). */
export const INPUT_SHORTCUTS = {
  /** Nombre de champions récents proposés en tête du sélecteur. */
  recentChampions: 12,
} as const

/** Choix du modèle de build générique (epic 10) : points par critère commun avec le champion. */
export const TEMPLATE_MATCH = {
  /** Par tag Data Dragon commun (Fighter, Mage…) : la classe compte plus que les dégâts seuls. */
  tag: 3,
  /** Même type de dégâts principal (AD / AP) ; retirés si le modèle vise l'autre type. */
  damage: 2,
} as const
