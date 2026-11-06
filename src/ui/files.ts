/**
 * Donne un fichier au joueur : partage natif (Android : Drive, mail, messagerie…) si le navigateur
 * le permet, sinon téléchargement.
 */
export async function shareOrDownload(
  fileName: string,
  content: string,
  mimeType = 'application/json',
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([content], fileName, { type: mimeType })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // partage impossible : on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
