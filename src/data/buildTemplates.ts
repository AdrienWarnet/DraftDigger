import templatesJson from '../../data/templates/builds.json'
import { parseTemplates, type BuildTemplate } from '../engine/buildTemplates'

/** Modèles de build génériques (data/templates/builds.json), validés au chargement. */
export const BUILD_TEMPLATES: BuildTemplate[] = parseTemplates(templatesJson)
