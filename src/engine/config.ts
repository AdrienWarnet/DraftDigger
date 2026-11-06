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
