import { useState } from 'react'
import { appendBlock, notesFileName } from '../../engine/testNotes'
import { useNotesStore } from '../../store/notesStore'
import { Button } from '../components/Button'
import { ConfirmPanel } from '../components/ConfirmPanel'
import { Sheet } from '../components/Sheet'
import { shareOrDownload } from '../files'
import styles from './NotesSheet.module.css'

type NotesSheetProps = {
  /** Contexte de la partie en cours à insérer, ou `null` si aucune partie. */
  snapshot: () => string | null
  onClose: () => void
}

/**
 * Notes de test (T7.1) : ce qui cloche pendant ou après la partie, gardé sur le téléphone,
 * exportable en fichier texte.
 */
export function NotesSheet({ snapshot, onClose }: NotesSheetProps) {
  const text = useNotesStore((s) => s.text)
  const setText = useNotesStore((s) => s.setText)
  const clear = useNotesStore((s) => s.clear)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    const fileName = notesFileName(new Date())
    const result = await shareOrDownload(fileName, text, 'text/plain')
    if (result === 'cancelled') return
    setMessage(result === 'shared' ? 'Notes partagées.' : `Notes téléchargées : ${fileName}.`)
  }

  function handleSnapshot() {
    const block = snapshot()
    if (block) setText(appendBlock(text, block))
  }

  return (
    <Sheet title="Notes de test" onClose={onClose}>
      <div className={styles.notes}>
        <p className="muted">
          Note ce qui cloche (mauvaise reco, saisie lente…). Les notes restent sur ton téléphone.
        </p>
        <Button variant="secondary" onClick={handleSnapshot}>
          Noter la partie en cours
        </Button>
        <textarea
          className={styles.text}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Tes notes"
          placeholder="Ex : la reco proposait Mercure alors qu'ils étaient surtout AD."
          rows={12}
        />
        <div className={styles.actions}>
          <Button onClick={() => void handleExport()} disabled={!text.trim()}>
            Exporter
          </Button>
          <Button variant="ghost" onClick={() => setConfirmingClear(true)} disabled={!text}>
            Effacer
          </Button>
        </div>
        {confirmingClear && (
          <ConfirmPanel
            message="Effacer toutes tes notes ? Pense à les exporter avant."
            confirmLabel="Effacer"
            onCancel={() => setConfirmingClear(false)}
            onConfirm={() => {
              clear()
              setConfirmingClear(false)
              setMessage(null)
            }}
          />
        )}
        {message && (
          <p className="muted" role="status">
            {message}
          </p>
        )}
      </div>
    </Sheet>
  )
}
