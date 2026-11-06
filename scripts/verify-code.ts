/**
 * pnpm verify-code [--no-cache] [--find-bug]
 *
 * Ajaa jokaisen code_output-harjoituksen koodin ja vertaa tulostetta answer-kenttään.
 * Laatusääntö (CLAUDE.md): kaikki ajettavissa olevat vastaukset tarkistetaan ajamalla.
 *  - verified: true, mutta tuloste ei täsmää (tai koodi kaatuu)     → virhe
 *  - verified: false, vaikka kielen voi ajaa tässä ympäristössä     → virhe
 *  - verified: true, mutta kieltä ei voi ajaa tässä ympäristössä    → virhe
 * --find-bug: ajaa myös find_bug-koodit ja listaa ne, jotka eivät kaadu (tarkistettava käsin).
 *
 * Ajoympäristöt: python3, g++ ja bash WSL:ssä (tai suoraan Linuxissa), JavaScript ja
 * TypeScript Nodella (tsx), SQL Pythonin sqlite3-moduulilla, pandas/numpy-koodi
 * venvillä ~/.venvs/it-oppi.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeOutput } from '../src/exercises/grade.ts'
import type { ContentTree } from '../src/content/validate.ts'
import type { Language } from '../src/schemas/content.ts'
import { runValidation } from './validate-content.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CACHE_FILE = join(ROOT, 'node_modules', '.cache', 'it-oppi', 'verify-code.json')
/** Kasvata, jos ajotapa muuttuu (mitätöi välimuistin). */
const RUNNER_VERSION = 1
const TIMEOUT_MS = 30_000
const CONCURRENCY = 4
const WIN = process.platform === 'win32'

export type RuntimeId = 'python' | 'python-data' | 'cpp' | 'bash' | 'javascript' | 'typescript' | 'sql' | 'kotlin'

export interface CodeItem {
  file: string
  exerciseId: string
  type: 'code_output' | 'find_bug'
  language: Language
  code: string
  answer?: string
  verified?: boolean
}

export interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
}

export function collectItems(content: ContentTree, includeFindBug = false): CodeItem[] {
  return content.paths.flatMap((p) =>
    Object.values(p.units).flatMap((u) =>
      u.exercises.flatMap((e): CodeItem[] => {
        const file = `${p.id}/units/${u.id}.json`
        if (e.type === 'code_output') {
          return [{ file, exerciseId: e.id, type: e.type, language: e.language, code: e.code, answer: e.answer, verified: e.verified }]
        }
        if (e.type === 'find_bug' && includeFindBug) {
          return [{ file, exerciseId: e.id, type: e.type, language: e.language, code: e.code }]
        }
        return []
      }),
    ),
  )
}

/** Millä ajoympäristöllä koodi ajetaan; null = kieltä ei voi ajaa (esim. html, postgresql). */
export function runtimeFor(language: Language, code: string): RuntimeId | null {
  switch (language) {
    case 'python':
      return /^\s*(import|from)\s+(pandas|numpy)\b/m.test(code) ? 'python-data' : 'python'
    case 'cpp':
    case 'bash':
    case 'javascript':
    case 'typescript':
    case 'sql':
    case 'kotlin':
      return language
    default:
      return null
  }
}

export type Verdict = { level: 'ok' | 'error' | 'info'; message: string }

/** Arvioi yhden harjoituksen tuloksen laatusääntöjä vasten. */
export function judge(item: CodeItem, runtime: RuntimeId | null, available: boolean, result?: RunResult): Verdict {
  if (item.type === 'find_bug') {
    if (!runtime || !available || !result) return { level: 'ok', message: 'ei ajettu' }
    return result.ok
      ? { level: 'info', message: 'koodi ei kaadu – varmista käsin, että bugirivi tuottaa väärän tuloksen' }
      : { level: 'ok', message: 'kaatuu' }
  }
  const runnable = runtime !== null && available
  if (!runnable) {
    return item.verified
      ? { level: 'error', message: `verified: true, mutta kieltä ${item.language} ei voi ajaa tässä ympäristössä` }
      : { level: 'ok', message: 'ei ajettavissa (verified: false)' }
  }
  if (!result) return { level: 'error', message: 'ei tulosta' }
  if (!result.ok) {
    return { level: 'error', message: `koodi kaatui: ${result.stderr.trim().split('\n').slice(-3).join(' | ')}` }
  }
  const got = normalizeOutput(result.stdout)
  const want = normalizeOutput(item.answer ?? '')
  if (got !== want) return { level: 'error', message: `odotettu ${JSON.stringify(want)}, saatiin ${JSON.stringify(got)}` }
  if (!item.verified) return { level: 'error', message: 'tuloste täsmää, mutta verified: false – merkitse verified: true' }
  return { level: 'ok', message: 'ok' }
}

// --- Ajo ---

function run(cmd: string, args: string[], stdin: string, cwd = ROOT): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      stderr += `\n(aikakatkaisu ${TIMEOUT_MS / 1000} s)`
    }, TIMEOUT_MS)
    child.stdout.setEncoding('utf8').on('data', (d: string) => (stdout += d))
    child.stderr.setEncoding('utf8').on('data', (d: string) => (stderr += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ ok: false, stdout, stderr: String(e) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, stdout, stderr })
    })
    child.stdin.on('error', () => {})
    child.stdin.end(stdin, 'utf8')
  })
}

/** Linux-komento: Windowsissa WSL:n kautta, Linuxissa suoraan. */
/**
 * Linux-komento (yksinkertaiset sanat, esim. ['python3', '-']): Windowsissa WSL:n kautta, Linuxissa suoraan.
 * wsl.exe muuntaa stdinissä merkkiparin \n rivinvaihdoksi, joten syöte välitetään base64-koodattuna.
 */
const linux = (args: string[], stdin: string) =>
  WIN
    ? run('wsl.exe', ['--', 'bash', '-c', `base64 -d | ${args.join(' ')}`], Buffer.from(stdin, 'utf8').toString('base64'))
    : run(args[0]!, args.slice(1), stdin)

/** Bash-skripti, joka kirjoittaa koodin väliaikaiskansioon (heredoc) ja ajaa komennon siellä. */
function inTempDir(fileName: string, code: string, command: string): string {
  const eof = 'IT_OPPI_EOF_' + createHash('sha1').update(code).digest('hex').slice(0, 8)
  return [
    'set -e',
    'd=$(mktemp -d)',
    'trap \'rm -rf "$d"\' EXIT',
    'cd "$d"',
    `cat > ${fileName} <<'${eof}'`,
    code,
    eof,
    'set +e',
    command,
  ].join('\n')
}

const SQLITE_RUNNER = `
import sqlite3
con = sqlite3.connect(':memory:')
buf = ''
for line in SQL.splitlines(keepends=True):
    buf += line
    if sqlite3.complete_statement(buf):
        cur = con.execute(buf)
        if cur.description:
            for row in cur.fetchall():
                print('|'.join('' if v is None else str(v) for v in row))
        buf = ''
if buf.strip():
    raise SystemExit('keskeneräinen SQL-lause: ' + buf.strip())
`

const VENV_PYTHON = WIN ? join(homedir(), '.venvs', 'it-oppi', 'Scripts', 'python.exe') : join(homedir(), '.venvs', 'it-oppi', 'bin', 'python')

export const runners: Record<RuntimeId, (code: string) => Promise<RunResult>> = {
  python: (code) => linux(['python3', '-'], code),
  'python-data': (code) => run(VENV_PYTHON, ['-X', 'utf8', '-'], code),
  cpp: (code) => linux(['bash', '-s'], inTempDir('main.cpp', code, 'g++ -std=c++20 -O0 -o main main.cpp && ./main')),
  bash: (code) => linux(['bash', '-s'], inTempDir('script.sh', code, 'bash script.sh')),
  kotlin: (code) =>
    linux(['bash', '-s'], inTempDir('main.kt', code, 'kotlinc main.kt -include-runtime -d main.jar 2>/dev/null && java -jar main.jar')),
  javascript: (code) => run(process.execPath, ['-'], code),
  typescript: (code) => {
    const dir = mkdtempSync(join(tmpdir(), 'it-oppi-ts-'))
    const file = join(dir, 'main.ts')
    writeFileSync(file, code)
    return run(process.execPath, ['--import', 'tsx', file], '').finally(() => rmSync(dir, { recursive: true, force: true }))
  },
  sql: (code) => linux(['python3', '-'], `SQL = ${JSON.stringify(code)}\n${SQLITE_RUNNER}`),
}

/** Tarkistaa, mitkä ajoympäristöt ovat saatavilla. */
export async function detectRuntimes(): Promise<Set<RuntimeId>> {
  const has = async (cmd: string) => (await linux(['bash', '-s'], `command -v ${cmd}`)).ok
  const [py, gpp, bash, kotlinc] = await Promise.all([has('python3'), has('g++'), has('bash'), has('kotlinc')])
  const set = new Set<RuntimeId>(['javascript', 'typescript'])
  if (py) set.add('python').add('sql')
  if (gpp) set.add('cpp')
  if (bash) set.add('bash')
  if (kotlinc) set.add('kotlin')
  if (existsSync(VENV_PYTHON)) set.add('python-data')
  return set
}

type Cache = Record<string, RunResult>

function loadCache(): Cache {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Cache
  } catch {
    return {}
  }
}

const cacheKey = (runtime: RuntimeId, code: string) =>
  createHash('sha256').update(`${RUNNER_VERSION}\0${runtime}\0${code}`).digest('hex')

async function main() {
  const useCache = !process.argv.includes('--no-cache')
  const findBug = process.argv.includes('--find-bug')
  const { content, errors } = runValidation()
  if (errors.length) {
    console.error('Sisältö ei läpäise validointia – aja ensin pnpm validate-content.')
    process.exit(1)
  }

  const available = await detectRuntimes()
  const items = collectItems(content, findBug)
  const cache = useCache ? loadCache() : {}
  const results = new Map<CodeItem, RunResult>()

  const queue = items.filter((i) => {
    const rt = runtimeFor(i.language, i.code)
    return rt && available.has(rt)
  })
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < queue.length) {
        const item = queue[next++]!
        const rt = runtimeFor(item.language, item.code)!
        const key = cacheKey(rt, item.code)
        const res = cache[key] ?? (await runners[rt](item.code))
        cache[key] = res
        results.set(item, res)
      }
    }),
  )

  if (useCache) {
    mkdirSync(join(CACHE_FILE, '..'), { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(cache))
  }

  let errorCount = 0
  const byLanguage = new Map<string, number>()
  for (const item of items) {
    const rt = runtimeFor(item.language, item.code)
    const v = judge(item, rt, rt !== null && available.has(rt), results.get(item))
    if (results.has(item)) byLanguage.set(item.language, (byLanguage.get(item.language) ?? 0) + 1)
    if (v.level === 'ok') continue
    if (v.level === 'error') errorCount++
    console.log(`${v.level === 'error' ? '✗' : 'ℹ'} ${item.file} ${item.exerciseId} (${item.language}): ${v.message}`)
  }

  const ran = [...byLanguage.entries()].map(([l, n]) => `${l} ${n}`).join(', ') || '–'
  const missing = (['python', 'python-data', 'cpp', 'bash', 'sql', 'kotlin'] as RuntimeId[]).filter((r) => !available.has(r))
  console.log(`\nAjettu: ${ran}. Ei saatavilla: ${missing.join(', ') || '–'}.`)
  if (errorCount) {
    console.error(`✗ ${errorCount} virhettä.`)
    process.exit(1)
  }
  console.log(`✓ ${items.filter((i) => i.type === 'code_output').length} code_output-harjoitusta kunnossa.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main()
}
