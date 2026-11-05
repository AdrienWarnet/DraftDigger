import type { ReactNode } from 'react'
import styles from './Card.module.css'

type CardProps = {
  title?: string
  /** Équipe représentée : colore le bord gauche (bleu allié, rouge ennemi). */
  side?: 'ally' | 'enemy'
  children: ReactNode
}

export function Card({ title, side, children }: CardProps) {
  const classes = [styles.card, side ? styles[side] : ''].filter(Boolean).join(' ')
  return (
    <section className={classes}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  )
}
