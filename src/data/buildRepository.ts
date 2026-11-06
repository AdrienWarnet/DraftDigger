import type { Build, Position } from '../engine/types'

/**
 * Accès aux builds du joueur. Toute l'app passe par cette interface (jamais directement
 * par le stockage) : un backend pourra remplacer l'implémentation locale sans rien changer ailleurs.
 * Asynchrone pour la même raison.
 */
export interface BuildRepository {
  /** Tous les builds valides, triés par champion, poste, favori puis ordre ; et les builds illisibles. */
  list(): Promise<BuildList>
  /** Builds d'un champion (et d'un poste si précisé), triés par ordre. */
  listByChampion(championId: string, position?: Position): Promise<Build[]>
  get(id: string): Promise<Build | null>
  /**
   * Crée ou met à jour un build (validé ; `updatedAt` mis à jour).
   * Un nouveau build est placé à la fin de son champion et de son poste.
   * S'il est favori, les autres builds du même champion à ce poste ne le sont plus.
   * Lève `BuildValidationError` si le build est invalide.
   */
  save(build: Build, options?: SaveOptions): Promise<Build>
  delete(id: string): Promise<void>
}

export type SaveOptions = {
  /** Garde `updatedAt` tel quel (import d'un fichier : ce n'est pas une modification). */
  keepUpdatedAt?: boolean
}

export type InvalidBuild = {
  /** Identifiant du build s'il est lisible. */
  id: string | null
  name: string | null
  errors: string[]
}

export type BuildList = {
  builds: Build[]
  /** Builds enregistrés mais invalides : signalés, jamais supprimés automatiquement. */
  invalid: InvalidBuild[]
}

export class BuildValidationError extends Error {
  override name = 'BuildValidationError'
  readonly errors: string[]
  constructor(errors: string[]) {
    super(`Build invalide : ${errors.join(' ; ')}`)
    this.errors = errors
  }
}

export class BuildStorageError extends Error {
  override name = 'BuildStorageError'
}
