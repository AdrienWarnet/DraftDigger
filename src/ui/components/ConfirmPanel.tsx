import { useId } from 'react'
import { Button } from './Button'
import styles from './ConfirmPanel.module.css'

type ConfirmPanelProps = {
  /** Question posée, ex : « Effacer cette draft ? ». */
  message: string
  /** Libellé de l'action confirmée (même verbe que le bouton qui a ouvert le panneau). */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation en ligne avant une action destructive. */
export function ConfirmPanel({ message, confirmLabel, onConfirm, onCancel }: ConfirmPanelProps) {
  const id = useId()
  return (
    <div className={styles.confirm} role="group" aria-labelledby={id}>
      <p id={id}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  )
}
