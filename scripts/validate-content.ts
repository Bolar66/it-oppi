/**
 * pnpm validate-content
 * Lukee kaikki content/-kansion JSON-tiedostot ja ajaa niihin Zod-skeemat sekä ristiintarkistukset.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateContent } from '../src/content/validate.ts'
import { checkQuality } from '../src/content/quality.ts'

export const CONTENT_DIR = fileURLToPath(new URL('../content', import.meta.url))

function listJson(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = join(dir, d.name)
    if (d.isDirectory()) return listJson(full)
    return d.name.endsWith('.json') ? [full] : []
  })
}

export function readContentFiles(dir = CONTENT_DIR): { files: Record<string, unknown>; errors: string[] } {
  const files: Record<string, unknown> = {}
  const errors: string[] = []
  for (const full of listJson(dir)) {
    const rel = relative(dir, full).split(sep).join('/')
    try {
      files[rel] = JSON.parse(readFileSync(full, 'utf8'))
    } catch (e) {
      errors.push(`${rel}: virheellinen JSON (${(e as Error).message})`)
    }
  }
  return { files, errors }
}

export function runValidation(dir = CONTENT_DIR) {
  const read = readContentFiles(dir)
  const result = validateContent(read.files)
  return { ...result, errors: [...read.errors, ...result.errors], fileCount: Object.keys(read.files).length }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const { content, errors: schemaErrors, fileCount } = runValidation()
  const quality = schemaErrors.length ? { errors: [], warnings: [] } : checkQuality(content)
  const errors = [...schemaErrors, ...quality.errors]
  if (quality.warnings.length) {
    console.warn(`⚠ ${quality.warnings.length} varoitusta:\n` + quality.warnings.map((w) => `  - ${w}`).join('\n'))
  }
  if (errors.length > 0) {
    console.error(`✗ ${errors.length} virhettä:\n` + errors.map((e) => `  - ${e}`).join('\n'))
    process.exit(1)
  }
  const units = content.paths.reduce((n, p) => n + Object.keys(p.units).length, 0)
  const exercises = content.paths.reduce(
    (n, p) => n + Object.values(p.units).reduce((m, u) => m + u.exercises.length, 0),
    0,
  )
  const terms = content.paths.reduce((n, p) => n + p.terms.length, 0)
  const unverified = content.paths.flatMap((p) =>
    Object.values(p.units).flatMap((u) =>
      u.exercises.filter((e) => e.type === 'code_output' && !e.verified).map((e) => `${u.id}/${e.id}`),
    ),
  )
  console.log(
    `✓ ${fileCount} tiedostoa, ${content.paths.length} polkua, ${units} yksikköä, ${exercises} harjoitusta, ${terms} termiä – kaikki kunnossa.`,
  )
  if (unverified.length) console.log(`  Huom: ${unverified.length} tarkistamatonta code_output-vastausta: ${unverified.join(', ')}`)
}
