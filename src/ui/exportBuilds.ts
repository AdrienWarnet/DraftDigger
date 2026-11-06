import { markExported } from '../data/exportReminder'
import { createBuildExport, exportFileName } from '../engine/buildExchange'
import type { Build } from '../engine/types'
import { shareOrDownload } from './files'

/** Exporte des builds en fichier ; renvoie un message à afficher (ou `null` si annulé). */
export async function exportBuilds(builds: readonly Build[]): Promise<string | null> {
  const fileName = exportFileName(builds)
  const result = await shareOrDownload(fileName, JSON.stringify(createBuildExport(builds), null, 2))
  if (result === 'cancelled') return null
  markExported()
  const what = builds.length === 1 ? '1 build exporté' : `${builds.length} builds exportés`
  return result === 'shared' ? `${what}.` : `${what} : fichier ${fileName} téléchargé.`
}
