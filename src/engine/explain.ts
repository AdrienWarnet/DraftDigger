import { MAX_REASONS, MIN_DEFENSIVE_GAIN_TO_EXPLAIN } from './config'
import type { DefensiveGain } from './defense'
import type { Metrics } from './metrics'

/**
 * Explications affichées sous une recommandation : phrases courtes, en français, 3 au plus.
 * Ordre : tes conditions vraies (déjà triées par poids), puis l'argument défensif chiffré,
 * puis la situation de partie.
 */
export type ExplanationParts = {
  /** Explications des conditions vraies (`explain` du build), de la plus lourde à la plus légère. */
  conditionReasons?: readonly string[]
  /** Gain défensif de l'item recommandé (T4.2), si c'est un item. */
  defensive?: DefensiveGain | null
  /** Métriques de la compo, pour situer le chiffre défensif. */
  metrics?: Pick<Metrics, 'enemyAdShare' | 'enemyApShare'>
  /** Raison liée à la situation (T4.5), ex : « En retard, on privilégie un item abordable. » */
  situationReason?: string | null
}

export function buildReasons(parts: ExplanationParts): string[] {
  const candidates = [
    ...(parts.conditionReasons ?? []),
    parts.defensive && parts.metrics ? defensiveReason(parts.defensive, parts.metrics) : null,
    parts.situationReason ?? null,
  ]
  const seen = new Set<string>()
  const reasons: string[] = []
  for (const candidate of candidates) {
    const sentence = candidate ? toSentence(candidate) : ''
    const key = sentence.toLowerCase()
    if (!sentence || seen.has(key)) continue
    seen.add(key)
    reasons.push(sentence)
    if (reasons.length === MAX_REASONS) break
  }
  return reasons
}

/**
 * Argument défensif chiffré, ex : « Contre leurs dégâts surtout physiques (73 %), cet item
 * réduit les dégâts physiques reçus de 31 %. » `null` si l'item n'aide pas contre cette compo.
 */
export function defensiveReason(
  gain: DefensiveGain,
  metrics: Pick<Metrics, 'enemyAdShare' | 'enemyApShare'>,
): string | null {
  if (gain.gain < MIN_DEFENSIVE_GAIN_TO_EXPLAIN) return null
  const percent = (value: number) => `${Math.round(value * 100)} %`
  const adPart = gain.adGain * metrics.enemyAdShare
  const apPart = gain.apGain * metrics.enemyApShare
  const meaningful = (part: number) => part >= MIN_DEFENSIVE_GAIN_TO_EXPLAIN / 2

  if (meaningful(adPart) && meaningful(apPart)) {
    return `Contre leurs dégâts mixtes, cet item réduit les dégâts reçus de ${percent(gain.adGain)} (physiques) et ${percent(gain.apGain)} (magiques).`
  }
  if (adPart >= apPart) {
    return `Contre leurs dégâts ${metrics.enemyAdShare >= 0.6 ? 'surtout ' : ''}physiques (${percent(metrics.enemyAdShare)}), cet item réduit les dégâts physiques reçus de ${percent(gain.adGain)}.`
  }
  return `Contre leurs dégâts ${metrics.enemyApShare >= 0.6 ? 'surtout ' : ''}magiques (${percent(metrics.enemyApShare)}), cet item réduit les dégâts magiques reçus de ${percent(gain.apGain)}.`
}

/** Majuscule au début, point à la fin, espaces superflus retirés. */
export function toSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  const capitalized = trimmed.charAt(0).toLocaleUpperCase('fr') + trimmed.slice(1)
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

/**
 * Raison affichée quand aucune condition du build choisi n'est vraie :
 * dit pourquoi ce build quand même (seul build, favori, ou par défaut).
 */
export function buildChoiceFallbackReason(candidateCount: number, isFavorite: boolean): string {
  if (candidateCount <= 1) return "C'est ton seul build pour ce champion à ce poste."
  if (isFavorite) return 'Aucune condition ne départage tes builds : voici ton favori.'
  return "Aucune condition de tes builds ne s'applique à cette partie : voici le premier."
}

/**
 * Explication du niveau de confiance (T5.4), ex : « 5/5 ennemis connus, et ce build devance
 * le suivant de 3 points. » `gap` à `null` : une seule option.
 */
export function confidenceExplanation(
  level: 'low' | 'medium' | 'high',
  knownEnemies: number,
  gap: number | null,
  /** `true` si le choix est le favori du joueur (départage une égalité). */
  favorite = false,
): string {
  const enemies =
    knownEnemies === 0
      ? 'Aucun ennemi connu'
      : `${knownEnemies}/5 ennemi${knownEnemies > 1 ? 's' : ''} connu${knownEnemies > 1 ? 's' : ''}`
  const points = (n: number) => `${n} point${n > 1 ? 's' : ''}`
  const lead =
    gap === null
      ? 'un seul choix possible'
      : gap === 0
        ? favorite
          ? 'égalité avec le choix suivant, départagée par ton favori'
          : 'égalité avec le choix suivant'
        : `ce choix devance le suivant de ${points(gap)}`
  const advice =
    level === 'high'
      ? ''
      : level === 'medium'
        ? ' Plus d’ennemis saisis ou un écart plus net rendraient la recommandation plus sûre.'
        : ' Recommandation peu sûre : complète la draft ou compare avec les autres choix.'
  return `${enemies}, ${lead}.${advice}`
}
