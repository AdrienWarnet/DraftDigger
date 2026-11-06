import { z } from 'zod'
import { conditionValueError } from './conditionSpecs'
import {
  CONDITION_OPS,
  METRICS,
  POSITIONS,
  type Build,
  type Condition,
  type ConditionPreset,
} from './types'

// Messages d'erreur génériques de Zod en français.
z.config(z.locales.fr())

const id = (what: string) => z.string({ error: `${what} attendu` }).min(1, `${what} vide`)

export const conditionSchema = z
  .object({
    metric: z.enum(METRICS, { error: `métrique inconnue (attendu : ${METRICS.join(', ')})` }),
    op: z.enum(CONDITION_OPS, {
      error: `opérateur inconnu (attendu : ${CONDITION_OPS.join(' ')})`,
    }),
    value: z.union([z.number(), z.string()], { error: 'nombre ou texte attendu' }),
  })
  .superRefine((condition, ctx) => {
    const error = conditionValueError(condition.metric, condition.op, condition.value)
    if (error) ctx.addIssue({ code: 'custom', path: [error.field], message: error.message })
  }) satisfies z.ZodType<Condition>

const explain = z
  .string({ error: 'explication attendue' })
  .trim()
  .min(1, 'explication vide')
  .max(200, 'explication trop longue (200 caractères max)')

export const weightedConditionSchema = z.object({
  condition: conditionSchema,
  weight: z
    .number({ error: 'poids attendu' })
    .positive('le poids doit être positif')
    .max(10, 'poids trop élevé (10 max)'),
  explain,
})

const runesSchema = z
  .object({
    primaryTree: id('arbre principal'),
    keystone: id('rune clé'),
    primarySlots: z.array(id('rune')).length(3, '3 runes attendues dans l’arbre principal'),
    secondaryTree: id('arbre secondaire'),
    secondarySlots: z.array(id('rune')).length(2, '2 runes attendues dans l’arbre secondaire'),
    shards: z.array(id('fragment')).length(3, '3 fragments attendus'),
  })
  .superRefine((runes, ctx) => {
    if (runes.primaryTree === runes.secondaryTree) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondaryTree'],
        message: "l'arbre secondaire doit être différent de l'arbre principal",
      })
    }
  })

const slotSchema = z.object({
  slot: z
    .number({ error: 'numéro de slot attendu' })
    .int('numéro de slot entier attendu')
    .min(1, 'les slots commencent à 1'),
  default: id('item par défaut'),
  alternatives: z
    .array(
      z.object({
        itemId: id('item'),
        when: z.array(conditionSchema).min(1, 'au moins une condition attendue'),
        explain,
      }),
    )
    .max(3, '3 alternatives maximum par slot'),
})

export const buildSchema = z
  .object({
    id: id('identifiant'),
    name: z
      .string({ error: 'nom attendu' })
      .trim()
      .min(1, 'nom vide')
      .max(40, 'nom trop long (40 caractères max)'),
    championId: id('champion'),
    position: z.enum(POSITIONS, { error: `poste inconnu (attendu : ${POSITIONS.join(', ')})` }),
    order: z
      .number({ error: 'ordre attendu' })
      .int('ordre entier attendu')
      .min(0, 'ordre positif attendu'),
    updatedAt: z.iso.datetime({ error: 'date ISO attendue (ex : 2026-11-06T10:00:00.000Z)' }),
    runes: runesSchema,
    summonerSpells: z.tuple([id('sort'), id('sort')], { error: '2 sorts d’invocateur attendus' }),
    useWhen: z.array(weightedConditionSchema),
    firstItemOptions: z
      .array(z.object({ itemId: id('item'), useWhen: z.array(weightedConditionSchema) }))
      .min(1, 'au moins une option de premier item')
      .max(3, '3 options de premier item maximum'),
    itemOrder: z.array(slotSchema).min(1, 'au moins un slot d’item').max(10, '10 slots maximum'),
  })
  .superRefine((build, ctx) => {
    if (build.summonerSpells[0] === build.summonerSpells[1]) {
      ctx.addIssue({
        code: 'custom',
        path: ['summonerSpells', 1],
        message: 'les 2 sorts doivent être différents',
      })
    }
    const seenSlots = new Set<number>()
    build.itemOrder.forEach((slot, i) => {
      if (seenSlots.has(slot.slot)) {
        ctx.addIssue({
          code: 'custom',
          path: ['itemOrder', i, 'slot'],
          message: `slot ${slot.slot} en double`,
        })
      }
      seenSlots.add(slot.slot)
    })
    const seenFirst = new Set<string>()
    build.firstItemOptions.forEach((option, i) => {
      if (seenFirst.has(option.itemId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['firstItemOptions', i, 'itemId'],
          message: 'option en double',
        })
      }
      seenFirst.add(option.itemId)
    })
  }) satisfies z.ZodType<Build>

export const conditionPresetSchema = z.object({
  id: id('identifiant'),
  label: z.string({ error: 'libellé attendu' }).trim().min(1, 'libellé vide'),
  condition: conditionSchema,
  explain,
}) satisfies z.ZodType<ConditionPreset>

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

/**
 * Valide un build (ex : JSON importé, build relu du stockage).
 * Chaque erreur désigne le champ en cause : « runes.primarySlots : 3 runes attendues… ».
 */
export function validateBuild(input: unknown): ValidationResult<Build> {
  return toResult(buildSchema.safeParse(input))
}

export function validateConditionPreset(input: unknown): ValidationResult<ConditionPreset> {
  return toResult(conditionPresetSchema.safeParse(input))
}

/** `['itemOrder', 2, 'alternatives', 0, 'when']` → `itemOrder[2].alternatives[0].when`. */
export function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((part, i) =>
      typeof part === 'number' ? `[${part}]` : `${i === 0 ? '' : '.'}${String(part)}`,
    )
    .join('')
}

function toResult<T>(result: z.ZodSafeParseResult<T>): ValidationResult<T> {
  if (result.success) return { ok: true, value: result.data }
  const errors = result.error.issues.map((issue) => {
    const where = formatPath(issue.path)
    return where ? `${where} : ${issue.message}` : issue.message
  })
  return { ok: false, errors }
}
