import type { CSSProperties } from 'react'
import {
  Atom,
  Box,
  Braces,
  Brain,
  Code,
  Container,
  Cpu,
  Database,
  FileCode2,
  Globe,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Smartphone,
  SquareTerminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Polun tunnistettava ilme: OKLCH-sävy ja kuvake. Värit johdetaan sävystä CSS:ssä (.path-tone). */
const STYLES: Record<string, { hue: number; icon: LucideIcon }> = {
  'computer-basics': { hue: 250, icon: Cpu },
  networks: { hue: 200, icon: Network },
  linux: { hue: 150, icon: SquareTerminal },
  'programming-basics': { hue: 290, icon: Braces },
  cpp: { hue: 230, icon: FileCode2 },
  python: { hue: 85, icon: Code },
  javascript: { hue: 65, icon: Box },
  react: { hue: 210, icon: Atom },
  kotlin: { hue: 310, icon: Smartphone },
  web: { hue: 30, icon: Globe },
  backend: { hue: 170, icon: Server },
  databases: { hue: 270, icon: Database },
  devops: { hue: 15, icon: Container },
  'dev-tools': { hue: 240, icon: Wrench },
  ai: { hue: 335, icon: Brain },
  iot: { hue: 120, icon: Radio },
  security: { hue: 0, icon: ShieldCheck },
}

const FALLBACK = { hue: 262, icon: Code }

export function pathStyle(pathId: string) {
  return STYLES[pathId] ?? FALLBACK
}

/** Inline-tyyli, joka asettaa polun sävyn; käytä yhdessä luokan path-tone kanssa. */
export function pathTone(pathId: string): CSSProperties {
  return { '--h': pathStyle(pathId).hue } as CSSProperties
}
