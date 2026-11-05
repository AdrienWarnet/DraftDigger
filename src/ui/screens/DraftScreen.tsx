import { Card } from '../components/Card'

export function DraftScreen() {
  return (
    <>
      <Card title="Ton équipe" side="ally">
        <p className="muted">Aucun champion pour l'instant.</p>
      </Card>
      <Card title="Équipe ennemie" side="enemy">
        <p className="muted">Aucun champion pour l'instant.</p>
      </Card>
    </>
  )
}
