// Vérifie si les quêtes de rôle ont changé depuis le patch noté dans data/role-quests.json.
// Source : historique des patchs de la page « Role Quests » du wiki officiel.
// Usage : npm run check-role-quests (code de sortie 1 si une mise à jour est à faire).
import { readFile } from 'node:fs/promises'

const FILE = new URL('../data/role-quests.json', import.meta.url)
const RAW_URL = 'https://wiki.leagueoflegends.com/en-us/Role_Quests?action=raw'

const toNumbers = (patch) => patch.split('.').map(Number)
const isNewer = (a, b) => {
  const [aMajor, aMinor] = toNumbers(a)
  const [bMajor, bMinor] = toNumbers(b)
  return aMajor !== bMajor ? aMajor > bMajor : aMinor > bMinor
}

const data = JSON.parse(await readFile(FILE, 'utf8'))
// Pas de process.exit() après une requête réseau (plantage de Node sous Windows) : exitCode.
const wiki = await fetch(RAW_URL, { headers: { 'User-Agent': 'DraftDigger-check' } })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.text()
  })
  .catch((error) => {
    console.error(`Wiki injoignable (${error.message}) : réessaie plus tard.`)
    process.exitCode = 2
    return null
  })
if (wiki !== null) report(wiki)

function report(wiki) {
  // Les changements sont notés « V26.19 » dans l'historique de la page.
  const patches = [...wiki.matchAll(/\bV(\d+\.\d+)\b/g)].map((m) => m[1])
  if (patches.length === 0) {
    console.error('Aucun patch trouvé sur la page du wiki : son format a peut-être changé.')
    process.exitCode = 2
    return
  }
  const latest = patches.reduce((max, p) => (isNewer(p, max) ? p : max))
  const newer = [...new Set(patches.filter((p) => isNewer(p, data.patch)))].sort((a, b) =>
    isNewer(a, b) ? 1 : -1,
  )

  if (newer.length === 0) {
    console.log(
      `Quêtes de rôle à jour : dernier changement sur le wiki au patch ${latest}, fichier au patch ${data.patch}.`,
    )
  } else {
    console.log(
      `Mise à jour à faire : le wiki liste des changements au(x) patch(s) ${newer.join(', ')} (fichier au patch ${data.patch}).`,
    )
    console.log(
      `Voir ${data.source}, puis mettre à jour data/role-quests.json (récompenses, effets, champ « patch »).`,
    )
    process.exitCode = 1
  }
}
