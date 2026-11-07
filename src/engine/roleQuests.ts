import { z } from 'zod'
import type { Position } from './types'

/**
 * Quêtes de rôle (epic 8) : récompense de chaque poste une fois la quête terminée.
 * Seuls les effets qui changent les recommandations d'items sont modélisés (`effects`).
 */

const effectsSchema = z
  .object({
    /** Catégorie d'items rangée dans l'emplacement de quête (Bot : les bottes). */
    dedicatedSlot: z.enum(['boots']).optional(),
  })
  .strict()

const questSchema = z.object({
  points: z.number().int().positive(),
  reward: z.string().trim().min(1),
  effects: effectsSchema.default({}),
})

const fileSchema = z.object({
  patch: z.string().regex(/^\d+\.\d+$/, 'format attendu : 26.19'),
  source: z.url(),
  quests: z.object({
    top: questSchema,
    jungle: questSchema,
    mid: questSchema,
    bot: questSchema,
    support: questSchema,
  }),
})

export type RoleQuestEffects = z.infer<typeof effectsSchema>
export type RoleQuest = z.infer<typeof questSchema>
export type RoleQuests = { patch: string; source: string; quests: Record<Position, RoleQuest> }

/** Lit le fichier des quêtes ; `null` (avec avertissement) s'il est invalide. */
export function parseRoleQuests(
  json: unknown,
  warn: (message: string) => void = (m) => console.warn(`[role-quests] ${m}`),
): RoleQuests | null {
  const result = fileSchema.safeParse(json)
  if (result.success) return result.data
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'fichier'} : ${issue.message}`)
    .join(' ; ')
  warn(`role-quests.json ignoré (${details}).`)
  return null
}

/** Effets de la quête du poste joué, ou aucun si la quête n'est pas terminée. */
export function activeQuestEffects(
  quests: RoleQuests | null,
  position: Position,
  completed: boolean,
): RoleQuestEffects {
  return completed && quests ? quests.quests[position].effects : {}
}
