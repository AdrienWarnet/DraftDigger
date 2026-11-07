import { z } from 'zod'
import { formatPath, validateBuild } from './buildSchema'
import { TEMPLATE_MATCH } from './config'
import { mainDamage } from './metrics'
import { validateBuildAgainstData, type PatchIndex, type PatchIssue } from './patchValidation'
import { POSITIONS, type Build, type Champion, type Position } from './types'

/**
 * Modèles de build génériques (epic 10) : proposés quand le joueur n'a aucun build pour le
 * champion joué. Un modèle = un build sans champion + les profils qu'il vise.
 */

/** Profil visé par un modèle. */
export type TemplateMatch = {
  positions: Position[]
  /** Tags Data Dragon : Fighter, Mage, Marksman, Tank, Support, Assassin. */
  tags: string[]
  /** Dégâts principaux du champion (`mainDamage`) ; absent = indifférent. */
  damage?: 'ad' | 'ap'
}

export type BuildTemplate = Pick<
  Build,
  'name' | 'runes' | 'summonerSpells' | 'useWhen' | 'firstItemOptions' | 'itemOrder'
> & {
  id: string
  match: TemplateMatch
}

const matchSchema = z.object({
  positions: z.array(z.enum(POSITIONS)).min(1, 'au moins un poste attendu'),
  tags: z.array(z.string().min(1)),
  damage: z.enum(['ad', 'ap']).optional(),
})

/** Date fixe des builds génériques (ils ne sont pas enregistrés). */
const TEMPLATE_DATE = '2026-01-01T00:00:00.000Z'

/** Applique un modèle à un champion et un poste : un build complet, utilisable par le moteur. */
export function templateToBuild(
  template: BuildTemplate,
  championId: string,
  position: Position,
): Build {
  return {
    id: `generique-${template.id}-${championId}-${position}`,
    name: template.name,
    championId,
    position,
    order: 0,
    updatedAt: TEMPLATE_DATE,
    runes: template.runes,
    summonerSpells: template.summonerSpells,
    useWhen: template.useWhen,
    firstItemOptions: template.firstItemOptions,
    itemOrder: template.itemOrder,
  }
}

/**
 * Lit le fichier des modèles (data/templates/builds.json). Un modèle invalide est ignoré avec un
 * avertissement qui le désigne ; les ids en double aussi.
 */
export function parseTemplates(
  json: unknown,
  warn: (message: string) => void = (m) => console.warn(`[modèles] ${m}`),
): BuildTemplate[] {
  const list =
    typeof json === 'object' &&
    json !== null &&
    'templates' in json &&
    Array.isArray(json.templates)
      ? (json.templates as unknown[])
      : null
  if (!list) {
    warn('builds.json : « templates » manquant.')
    return []
  }
  const templates: BuildTemplate[] = []
  const ids = new Set<string>()
  list.forEach((entry, index) => {
    const label = `modèle ${index + 1}`
    const errors = templateErrors(entry)
    if (errors.length > 0) {
      warn(`builds.json : ${label} ignoré (${errors.slice(0, 3).join(' ; ')}).`)
      return
    }
    const template = entry as BuildTemplate
    if (ids.has(template.id)) {
      warn(`builds.json : id « ${template.id} » en double, ${label} ignoré.`)
      return
    }
    ids.add(template.id)
    templates.push(template)
  })
  return templates
}

/** Erreurs de forme d'un modèle : mêmes règles qu'un build, plus le profil visé. */
function templateErrors(entry: unknown): string[] {
  if (typeof entry !== 'object' || entry === null) return ['objet attendu']
  const record = entry as Record<string, unknown>
  const errors: string[] = []
  if (typeof record.id !== 'string' || !record.id) errors.push('id : identifiant attendu')
  const match = matchSchema.safeParse(record.match)
  if (!match.success) {
    errors.push(
      ...match.error.issues.map(
        (i) => `match${i.path.length ? '.' : ''}${formatPath(i.path)} : ${i.message}`,
      ),
    )
  }
  const asBuild = validateBuild({
    ...record,
    id: 'modele',
    championId: 'modele',
    position: match.success ? match.data.positions[0] : 'top',
    order: 0,
    updatedAt: TEMPLATE_DATE,
  })
  if (!asBuild.ok) errors.push(...asBuild.errors)
  return errors
}

export type TemplateChoice = {
  template: BuildTemplate
  /** Pourquoi ce modèle, ex : « Ahri : mage, assassin, dégâts AP. » */
  reason: string
}

const TAG_LABELS: Record<string, string> = {
  Fighter: 'combattant',
  Mage: 'mage',
  Marksman: 'tireur',
  Tank: 'tank',
  Support: 'support',
  Assassin: 'assassin',
}

/**
 * Choisit le modèle le plus adapté : le poste est obligatoire, puis chaque tag commun et le même
 * type de dégâts rapportent des points (`TEMPLATE_MATCH`). À égalité, l'ordre du fichier.
 * `null` si aucun modèle ne vise ce poste.
 */
export function pickTemplate(
  champion: Champion,
  position: Position,
  templates: readonly BuildTemplate[],
): TemplateChoice | null {
  const damage = mainDamage(champion)
  let best: { template: BuildTemplate; score: number } | null = null
  for (const template of templates) {
    if (!template.match.positions.includes(position)) continue
    const commonTags = template.match.tags.filter((t) => champion.tags.includes(t)).length
    const score =
      commonTags * TEMPLATE_MATCH.tag +
      (template.match.damage === damage ? TEMPLATE_MATCH.damage : 0) -
      (template.match.damage && template.match.damage !== damage ? TEMPLATE_MATCH.damage : 0)
    if (!best || score > best.score) best = { template, score }
  }
  if (!best) return null
  const profile = champion.tags.map((t) => TAG_LABELS[t] ?? t.toLowerCase())
  return {
    template: best.template,
    reason: `${champion.name} : ${[...profile, `dégâts ${damage.toUpperCase()}`].join(', ')}.`,
  }
}

/** Ids du modèle absents du patch courant (item supprimé, rune déplacée…). */
export function templateIssues(template: BuildTemplate, patch: PatchIndex): PatchIssue[] {
  const build = templateToBuild(template, 'modele', template.match.positions[0]!)
  return validateBuildAgainstData(build, patch).filter((issue) => issue.kind !== 'champion')
}
