// Tipos y utilidades sobre el JSON público generado por el ETL (etl/app/indicators.py)

/** [hombres, mujeres] */
export type Par = [number | null, number | null]
/** [nH, nM, mediaH, mediaM] o null si la celda se suprimió */
export type Celda = [number, number, number | null, number | null] | null

export interface Combo {
  emp: number
  n: [number, number]
  media: Par
  mediana: Par
  aj: number | null
  q: (number | null)[] | null
  edad?: Celda[]
  antig?: Celda[]
  prov?: Celda[]
}

export interface Sector {
  id: string
  nombre: string
  descripcion: string
}

export interface Dashboard {
  meta: {
    titulo: string
    generado: string
    fuente: string
    registros: number
    empresas: number
    sbu: Record<string, number>
    min_empresas: number
    min_personas: number
    calidad: { pct_tamano_scvs: number; pct_nivel_por_cargo: number }
  }
  dims: {
    anios: number[]
    sectores: Sector[]
    tamanos: string[]
    niveles: string[]
    edad: string[]
    antig: string[]
    prov: string[]
  }
  datos: Record<string, Combo>
}

export const TODOS = '*'
export type Medida = 'mediana' | 'media'

export interface Filtros {
  anio: number
  sector: string
  tamano: string
  nivel: string
  medida: Medida
}

export const DATA_URL: string = import.meta.env.VITE_DATA_URL || './dashboard.json'

export async function cargarDashboard(): Promise<Dashboard> {
  const r = await fetch(DATA_URL)
  if (!r.ok) throw new Error(`No se pudo cargar los datos (${r.status})`)
  return r.json()
}

export function clave(anio: number, sector: string, tamano: string, nivel: string) {
  return `${anio}|${sector}|${tamano}|${nivel}`
}

export function combo(d: Dashboard, f: Pick<Filtros, 'anio' | 'sector' | 'tamano' | 'nivel'>): Combo | undefined {
  return d.datos[clave(f.anio, f.sector, f.tamano, f.nivel)]
}

/** Cuánto gana una mujer por cada 100 que gana un hombre */
export function por100(par: Par | undefined): number | null {
  if (!par) return null
  const [h, m] = par
  if (h == null || m == null || h === 0) return null
  return (m / h) * 100
}

export function pctMujeres(c: Combo | undefined): number | null {
  if (!c) return null
  const t = c.n[0] + c.n[1]
  return t ? (c.n[1] / t) * 100 : null
}

export function pctCelda(cel: Celda): number | null {
  if (!cel) return null
  const t = cel[0] + cel[1]
  return t ? (cel[1] / t) * 100 : null
}

export function por100Celda(cel: Celda): number | null {
  if (!cel || cel[2] == null || cel[3] == null || cel[2] === 0) return null
  return (cel[3] / cel[2]) * 100
}

const nf0 = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const usd = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const fmt = {
  n: (v: number | null | undefined) => (v == null ? '—' : nf0.format(v)),
  pct: (v: number | null | undefined) => (v == null ? '—' : `${nf1.format(v)} %`),
  usd: (v: number | null | undefined) => (v == null ? '—' : usd.format(v)),
  p100: (v: number | null | undefined) => (v == null ? '—' : `$${nf0.format(v)}`),
  compacto: (v: number) =>
    v >= 1_000_000 ? `${nf1.format(v / 1_000_000)} M` : v >= 10_000 ? `${nf0.format(v / 1000)} mil` : nf0.format(v),
}

/** Texto de brecha para lectores no técnicos: "3 % menos", "2 % más", "igual" */
export function textoBrecha(p: number | null): string {
  if (p == null) return 'sin datos suficientes'
  const d = Math.round(100 - p)
  if (d === 0) return 'prácticamente lo mismo'
  return d > 0 ? `${d} % menos` : `${-d} % más`
}
