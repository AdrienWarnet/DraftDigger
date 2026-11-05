import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Sheet.module.css'

type SheetProps = {
  title: string
  onClose: () => void
  /** Action secondaire dans l'en-tête (ex : « Retirer »). */
  action?: ReactNode
  children: ReactNode
}

/**
 * Panneau plein écran au-dessus de l'app (ex : sélecteur de champion).
 * Se ferme avec le bouton « Fermer » ou la touche Échap ; le bouton retour d'Android
 * est géré par l'appelant via l'URL.
 */
export function Sheet({ title, onClose, action, children }: SheetProps) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {action}
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
