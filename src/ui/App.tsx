import { GameDataGate } from './data/GameDataGate'
import { GameDataProvider } from './data/GameDataProvider'
import { AppShell } from './layout/AppShell'
import { DEV_SHOWCASE, SCREENS, type Route } from './navigation/routes'
import { useRoute } from './navigation/useRoute'
import { BuildsScreen } from './screens/BuildsScreen'
import { ComponentsShowcase } from './screens/ComponentsShowcase'
import { DraftScreen } from './screens/DraftScreen'
import { GameScreen } from './screens/GameScreen'
import { RecommendationScreen } from './screens/RecommendationScreen'

function titleFor(route: Route): string {
  if (route === DEV_SHOWCASE) return 'Composants'
  return SCREENS.find((s) => s.id === route)?.title ?? ''
}

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'draft':
      return <DraftScreen />
    case 'reco':
      return <RecommendationScreen />
    case 'partie':
      return <GameScreen />
    case 'builds':
      return <BuildsScreen />
    case DEV_SHOWCASE:
      return <ComponentsShowcase />
  }
}

function App() {
  const route = useRoute()
  return (
    <GameDataProvider>
      <AppShell route={route} title={titleFor(route)}>
        <GameDataGate>
          <Screen route={route} />
        </GameDataGate>
      </AppShell>
    </GameDataProvider>
  )
}

export default App
