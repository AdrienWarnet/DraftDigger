import { useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ExplanationBanner } from '../components/ExplanationBanner'
import { Tabs } from '../components/Tabs'

type Situation = 'ahead' | 'even' | 'behind'

/** Page de développement (#/composants) : tous les composants de base, pour vérifier le thème. */
export function ComponentsShowcase() {
  const [situation, setSituation] = useState<Situation>('even')
  return (
    <>
      <Tabs<Situation>
        label="Situation"
        value={situation}
        onChange={setSituation}
        options={[
          { value: 'ahead', label: 'Devant', tone: 'ahead' },
          { value: 'even', label: 'Égalité' },
          { value: 'behind', label: 'En retard', tone: 'behind' },
        ]}
      />
      <Card title="Prochain item">
        <ExplanationBanner
          reasons={[
            // Espace fine insécable (U+202F) avant « % » : typographie française, pas de « % » orphelin.
            'Contre leurs 3 sources de dégâts AP, cet item réduit les dégâts reçus de 31 %.',
            'En retard, on privilégie un item abordable et défensif.',
          ]}
        />
        <Button block>Acheté</Button>
      </Card>
      <Card title="Ton équipe" side="ally">
        <p className="muted">Bord bleu : alliés.</p>
      </Card>
      <Card title="Équipe ennemie" side="enemy">
        <p className="muted">Bord rouge : ennemis.</p>
      </Card>
      <Button variant="secondary">Bouton secondaire</Button>
      <Button variant="ghost">Bouton discret</Button>
      <Button disabled>Bouton désactivé</Button>
      <EmptyState title="État vide" description="Explique quoi faire pour remplir l'écran." />
    </>
  )
}
