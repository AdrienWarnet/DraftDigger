import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Génère les icônes PWA depuis public/logo.svg : `npm run generate-icons`.
const background = '#0b0f17'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background } },
    apple: { ...preset.apple, resizeOptions: { background } },
  },
  images: ['public/logo.svg'],
})
