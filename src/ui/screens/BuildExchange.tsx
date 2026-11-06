import { useRef, useState } from 'react'
import { getLastExportAt } from '../../data/exportReminder'
import { createBuildId } from '../../data/localBuildRepository'
import {
  findConflicts,
  parseBuildImport,
  prepareImport,
  shouldRemindExport,
  type ConflictChoice,
  type ParsedImport,
} from '../../engine/buildExchange'
import { useBuildsStore } from '../../store/buildsStore'
import { Button } from '../components/Button'
import { Tabs } from '../components/Tabs'
import { exportBuilds } from '../exportBuilds'
import styles from './BuildExchange.module.css'

/** Id du build d'exemple livré avec l'app : il ne déclenche pas le rappel d'export. */
const EXAMPLE_BUILD_ID = 'exemple-yorick-top'

/** Exporter / Importer, aperçu d'import, rappel d'export : en tête de « Mes builds ». */
export function BuildExchangeBar() {
  const builds = useBuildsStore((s) => s.list.builds)
  const importBuilds = useBuildsStore((s) => s.importBuilds)
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [choice, setChoice] = useState<ConflictChoice>('keepBoth')
  const [message, setMessage] = useState<string | null>(null)
  const [lastExportAt, setLastExportAt] = useState(getLastExportAt)

  const [openedAt] = useState(() => new Date())
  const remind = shouldRemindExport(builds, lastExportAt, openedAt, [EXAMPLE_BUILD_ID])

  async function handleExport() {
    const result = await exportBuilds(builds)
    if (result) {
      setMessage(result)
      setLastExportAt(getLastExportAt())
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setMessage(null)
    setChoice('keepBoth') // choix le plus sûr par défaut, à chaque nouveau fichier
    setParsed(parseBuildImport(await file.text()))
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    if (!parsed?.ok) return
    const count = await importBuilds(prepareImport(builds, parsed.builds, choice, createBuildId))
    setParsed(null)
    setMessage(count === 1 ? '1 build importé.' : `${count} builds importés.`)
  }

  const conflicts = parsed?.ok ? findConflicts(builds, parsed.builds) : []

  return (
    <div className={styles.bar}>
      {remind && !parsed && (
        <div className={styles.reminder} role="status">
          <p>
            Tes builds ne sont enregistrés que sur ce téléphone. Exporte-les pour ne pas les perdre.
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => void handleExport()}
          disabled={builds.length === 0}
        >
          Exporter
        </Button>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Importer
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className={styles.fileInput}
          onChange={(e) => void handleFile(e.target.files?.[0])}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      {parsed && (
        <section className={styles.panel} aria-labelledby="import-titre">
          <h2 id="import-titre" className={styles.panelTitle}>
            Importer des builds
          </h2>
          {!parsed.ok ? (
            <>
              <p className={styles.error} role="alert">
                {parsed.error}
              </p>
              <Button variant="secondary" onClick={() => setParsed(null)}>
                Fermer
              </Button>
            </>
          ) : (
            <>
              <p>
                {parsed.builds.length === 0
                  ? 'Aucun build valide dans ce fichier.'
                  : `${parsed.builds.length} build${parsed.builds.length > 1 ? 's' : ''} : ${parsed.builds.map((b) => b.name).join(', ')}.`}
              </p>
              {parsed.invalid.length > 0 && (
                <details className={styles.invalid}>
                  <summary>
                    {parsed.invalid.length} build{parsed.invalid.length > 1 ? 's' : ''} invalide
                    {parsed.invalid.length > 1 ? 's' : ''} ignoré
                    {parsed.invalid.length > 1 ? 's' : ''}
                  </summary>
                  <ul>
                    {parsed.invalid.map((b) => (
                      <li key={b.index}>
                        {b.name || `Build n° ${b.index + 1}`} : {b.errors.slice(0, 3).join(' ; ')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {conflicts.length > 0 && (
                <div className={styles.conflicts}>
                  <p>
                    {conflicts.length === 1
                      ? `« ${conflicts[0]!.name} » existe déjà.`
                      : `${conflicts.length} builds existent déjà.`}
                  </p>
                  <Tabs<ConflictChoice>
                    label="Builds déjà présents"
                    value={choice}
                    onChange={setChoice}
                    options={[
                      { value: 'keepBoth', label: 'Garder les deux' },
                      { value: 'replace', label: 'Remplacer' },
                    ]}
                  />
                </div>
              )}
              <div className={styles.panelActions}>
                <Button variant="secondary" onClick={() => setParsed(null)}>
                  Annuler
                </Button>
                <Button onClick={() => void handleImport()} disabled={parsed.builds.length === 0}>
                  {parsed.builds.length > 1
                    ? `Importer ${parsed.builds.length} builds`
                    : 'Importer'}
                </Button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
