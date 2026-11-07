import roleQuestsJson from '../../data/role-quests.json'
import { parseRoleQuests, type RoleQuests } from '../engine/roleQuests'

/** Quêtes de rôle (data/role-quests.json) ; `null` si le fichier est invalide (avertissement). */
export const ROLE_QUESTS: RoleQuests | null = parseRoleQuests(roleQuestsJson)
