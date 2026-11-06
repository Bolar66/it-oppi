import { normalize } from 'node:path'
import type { Plugin } from 'vite'
import { CONTENT_DIR, runValidation } from './scripts/validate-content.ts'
import { toIndex } from './src/content/contentIndex.ts'

const ID = 'virtual:content-index'
const RESOLVED = '\0' + ID

/**
 * Tuottaa moduulin `virtual:content-index`: kevyt sisältöindeksi (polut, tasot, kokeet, termit,
 * yksiköiden otsikot). Koko content/-kansio validoidaan Zodilla samalla – virhe kaataa buildin
 * ja näkyy kehityspalvelimen virheikkunassa. Yksiköiden sisältö ladataan erikseen (loader.ts).
 */
export function contentIndexPlugin(): Plugin {
  return {
    name: 'it-oppi-content-index',
    resolveId(id) {
      return id === ID ? RESOLVED : undefined
    },
    load(id) {
      if (id !== RESOLVED) return undefined
      const { content, errors } = runValidation()
      if (errors.length > 0) this.error(`Sisällön validointi epäonnistui:\n${errors.join('\n')}`)
      return `export default ${JSON.stringify(toIndex(content))}`
    },
    configureServer(server) {
      const dir = normalize(CONTENT_DIR).toLowerCase()
      server.watcher.add(CONTENT_DIR)
      server.watcher.on('all', (_event, file) => {
        if (!normalize(file).toLowerCase().startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
