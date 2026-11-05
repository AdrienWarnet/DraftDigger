import styles from './ExplanationBanner.module.css'

type ExplanationBannerProps = {
  /** Raisons prêtes à afficher (sortie `reasons` du moteur), 3 maximum. */
  reasons: string[]
  title?: string
}

/** Le « pourquoi » d'une recommandation : la pièce maîtresse de l'app. */
export function ExplanationBanner({ reasons, title = 'Pourquoi' }: ExplanationBannerProps) {
  if (reasons.length === 0) return null
  return (
    <aside className={styles.banner}>
      <h3 className={styles.title}>{title}</h3>
      {reasons.length === 1 ? (
        <p className={styles.single}>{reasons[0]}</p>
      ) : (
        <ul className={styles.list}>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </aside>
  )
}
