import { useId, useState } from 'react'
import type { Confidence } from '../../engine/types'
import styles from './ConfidenceBadge.module.css'

const LABELS: Record<Confidence, string> = {
  high: 'Confiance élevée',
  medium: 'Confiance moyenne',
  low: 'Confiance faible',
}

/** Badge de confiance ; un tap affiche l'explication (pas d'info-bulle au doigt). */
export function ConfidenceBadge({
  level,
  explanation,
}: {
  level: Confidence
  explanation: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.badge}
        data-level={level}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.dot} aria-hidden="true" />
        {LABELS[level]}
      </button>
      {open && (
        <p id={id} className={styles.explanation}>
          {explanation}
        </p>
      )}
    </div>
  )
}
