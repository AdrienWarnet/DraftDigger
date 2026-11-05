import type { ReactNode } from 'react'
import { NavIcon } from '../navigation/NavIcon'
import { hashFor, SCREENS, type Route } from '../navigation/routes'
import styles from './AppShell.module.css'

type AppShellProps = {
  route: Route
  title: string
  children: ReactNode
}

export function AppShell({ route, title, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <main className={styles.main}>{children}</main>
      <nav className={styles.nav} aria-label="Navigation principale">
        {SCREENS.map((screen) => (
          <a
            key={screen.id}
            href={hashFor(screen.id)}
            className={styles.navItem}
            aria-current={route === screen.id ? 'page' : undefined}
          >
            <NavIcon screen={screen.id} />
            <span>{screen.navLabel}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
