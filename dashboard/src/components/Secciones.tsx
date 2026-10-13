import type { ReactNode } from 'react'
import {
  combo,
  fmt,
  pctCelda,
  pctMujeres,
  por100,
  por100Celda,
  TODOS,
  type Celda,
  type Dashboard,
  type Filtros,
} from '../data'
import { Ayuda, ChartCard, Leyenda, Vacio } from './ChartCard'
import { C, Columnas, Lineas, Piramide } from './charts'
import { Filas, type FilaDato } from './Filas'

interface P {
  d: Dashboard
  f: Filtros
  setF: (p: Partial<Filtros>) => void
}

// ─── Utilidades de lenguaje ─────────────────────────────────────────────────────
const nombreSueldo = (f: Filtros) => (f.medida === 'mediana' ? 'sueldo típico' : 'sueldo promedio')
const de100 = (pct: number | null) => (pct == null ? '—' : `${Math.round(pct)} de cada 100`)
const B = ({ children }: { children: ReactNode }) => <strong>{children}</strong>

/** Contexto de los filtros activos en lenguaje natural ("en Comercio, en empresas grandes") */
function contexto(d: Dashboard, f: Filtros, sin: ('sector' | 'tamano' | 'nivel')[] = []) {
  const partes: string[] = []
  if (f.sector !== TODOS && !sin.includes('sector')) partes.push(`en ${d.dims.sectores.find((s) => s.id === f.sector)?.nombre ?? f.sector}`)
  if (f.tamano !== TODOS && !sin.includes('tamano')) partes.push(`en ${f.tamano === 'Microempresa' ? 'microempresas' : `empresas ${f.tamano.toLowerCase()}s`}`)
  if (f.nivel !== TODOS && !sin.includes('nivel')) partes.push(`en cargos de nivel ${f.nivel.toLowerCase()}`)
  return partes.length ? ` ${partes.join(', ')}` : ''
}

function frasePor100(p: number | null) {
  if (p == null) return 'no hay datos suficientes'
  const d = Math.round(100 - p)
  if (d === 0) return 'ganan prácticamente lo mismo que los hombres'
  return d > 0 ? `ganan ${d} % menos que los hombres` : `ganan ${-d} % más que los hombres`
}

function extremos<T>(arr: T[], val: (x: T) => number | null) {
  const v = arr.filter((x) => val(x) != null)
  if (!v.length) return null
  const ord = [...v].sort((a, b) => val(a)! - val(b)!)
  return { min: ord[0], max: ord[ord.length - 1] }
}

const ANTIG_TXT: Record<string, string> = {
  'Menos de 1': 'menos de un año',
  '1 a 4': 'entre 1 y 4 años',
  '5 a 9': 'entre 5 y 9 años',
  '10 a 14': 'entre 10 y 14 años',
  '15 a 24': 'entre 15 y 24 años',
  '25 o más': '25 años o más',
}
const antigTxt = (r: string) => ANTIG_TXT[r] ?? r

const NIVEL_TXT: Record<string, string> = {
  Operativo: 'operativos (asistentes, técnicos, operarios)',
  Táctico: 'de mando medio (jefaturas, supervisión)',
  Estratégico: 'de dirección (gerencias)',
}

// ─── Titular ──────────────────────────────────────────────────────────────────
export function Titular({ d, f }: P) {
  const c = combo(d, f)
  if (!c)
    return (
      <div className="card" style={{ marginTop: 24 }}>
        <Vacio />
      </div>
    )
  const p = por100(c[f.medida])
  const aj = c.aj != null ? c.aj * 100 : null
  const pm = pctMujeres(c)
  const pmAnt = pctMujeres(combo(d, { ...f, anio: f.anio - 1 }))
  const pmEstr = pctMujeres(combo(d, { ...f, nivel: 'Estratégico' }))

  return (
    <div className="titular">
      <div className="card headline" id="tour-cifra">
        <p className="eyebrow">
          En {f.anio}
          {contexto(d, f)}, por cada $100 que gana un hombre, una mujer gana
        </p>
        <div className="cifra">
          <span className="valor">{fmt.p100(p)}</span>
          <ComparaBarras p={p} />
        </div>
        <p className="detalle">
          Es decir, las mujeres <B>{frasePor100(p)}</B> (comparando el {nombreSueldo(f)}).
        </p>
        <p className="detalle">
          Y si comparamos <B>puestos similares</B>
          <Ayuda titulo="Puestos similares">
            Comparamos a mujeres y hombres del mismo sector, tamaño de empresa, nivel de cargo y edad. Así vemos la
            diferencia que queda cuando ambos hacen un trabajo parecido.
          </Ayuda>
          : la mujer gana <B>{fmt.p100(aj)}</B> por cada $100.
        </p>
      </div>
      <div className="kpis">
        <Kpi
          label="Mujeres en el trabajo"
          valor={de100(pm)}
          detalle={
            pm != null && pmAnt != null
              ? Math.abs(pm - pmAnt) < 0.5
                ? `igual que en ${f.anio - 1}`
                : `${pm > pmAnt ? 'más' : 'menos'} que en ${f.anio - 1} (${de100(pmAnt)})`
              : 'personas trabajadoras'
          }
        />
        <Kpi label="Mujeres en gerencias" valor={de100(pmEstr)} detalle="cargos de dirección" />
        <Kpi label="Personas analizadas" valor={fmt.compacto(c.n[0] + c.n[1])} detalle={`${fmt.n(c.n[1])} mujeres y ${fmt.n(c.n[0])} hombres`} />
        <Kpi label="Empresas" valor={fmt.n(c.emp)} detalle={`del sector formal en ${f.anio}`} />
      </div>
    </div>
  )
}

function Kpi({ label, valor, detalle }: { label: string; valor: string; detalle: string }) {
  return (
    <div className="card kpi">
      <p className="label">{label}</p>
      <p className="value">{valor}</p>
      <p className="delta">{detalle}</p>
    </div>
  )
}

/** Mini comparación visual $100 vs $X para que la cifra se entienda sin leer */
function ComparaBarras({ p }: { p: number | null }) {
  if (p == null) return null
  const max = Math.max(100, p)
  return (
    <div className="compara" aria-hidden="true">
      <div className="compara-fila">
        <span>Hombre</span>
        <i style={{ width: `${(100 / max) * 100}%`, background: C.hombre }} />
        <b>$100</b>
      </div>
      <div className="compara-fila">
        <span>Mujer</span>
        <i style={{ width: `${(p / max) * 100}%`, background: C.mujer }} />
        <b>{fmt.p100(p)}</b>
      </div>
    </div>
  )
}

// ─── Evolución ────────────────────────────────────────────────────────────────
export function Evolucion({ d, f }: P) {
  const filas = d.dims.anios.map((anio) => {
    const c = combo(d, { ...f, anio })
    return {
      anio: String(anio),
      participacion: c ? round1(pctMujeres(c)) : null,
      simple: c ? round1(por100(c[f.medida])) : null,
      ajustada: c?.aj != null ? round1(c.aj * 100) : null,
    }
  })
  const serieBrecha = [
    { key: 'simple', nombre: 'Todas las personas', color: C.accent },
    { key: 'ajustada', nombre: 'Puestos similares', color: C.neutral },
  ]
  const valores = filas.flatMap((r) => [r.simple, r.ajustada]).filter((v): v is number => v != null)
  const lo = Math.floor(Math.min(90, ...valores) / 5) * 5
  const hi = Math.ceil(Math.max(105, ...valores) / 5) * 5

  const conDatos = filas.filter((r) => r.participacion != null)
  const primero = conDatos[0]
  const actual = filas.find((r) => r.anio === String(f.anio))
  const cambio = primero && actual?.participacion != null ? actual.participacion - primero.participacion! : null
  const lecturaPart =
    actual?.participacion != null && primero ? (
      <>
        En {f.anio}, <B>{de100(actual.participacion)}</B> personas trabajadoras{contexto(d, f)} son mujeres.{' '}
        {cambio == null || Math.abs(cambio) < 1 ? (
          <>Casi no ha cambiado desde {primero.anio}.</>
        ) : (
          <>
            Desde {primero.anio} {cambio > 0 ? 'subió' : 'bajó'} <B>{Math.abs(Math.round(cambio))} puntos</B>.
          </>
        )}{' '}
        Para llegar a la paridad debería ser 50 de cada 100.
      </>
    ) : null

  const brechaEx = extremos(filas, (r) => r.simple)
  const lecturaBrecha =
    actual?.simple != null && brechaEx ? (
      <>
        En {f.anio} las mujeres <B>{frasePor100(actual.simple)}</B>. El año más cercano a la igualdad fue{' '}
        <B>{[...filas].filter((r) => r.simple != null).sort((a, b) => Math.abs(a.simple! - 100) - Math.abs(b.simple! - 100))[0].anio}</B>{' '}
        y el de mayor diferencia, <B>{[...filas].filter((r) => r.simple != null).sort((a, b) => Math.abs(b.simple! - 100) - Math.abs(a.simple! - 100))[0].anio}</B>.
      </>
    ) : null

  return (
    <section className="seccion" id="tour-explora">
      <h2>¿Ha mejorado con los años?</h2>
      <div className="grid2">
        <ChartCard
          titulo="Cuántas mujeres trabajan"
          sub="De cada 100 personas trabajadoras, cuántas son mujeres"
          lectura={lecturaPart}
          ayuda="Cada punto es un año. La línea de 50 marca la paridad: la mitad mujeres y la mitad hombres."
          tabla={{ columnas: ['Año', '% mujeres'], filas: filas.map((r) => [r.anio, fmt.pct(r.participacion)]) }}
        >
          <Lineas
            datos={filas}
            x="anio"
            series={[{ key: 'participacion', nombre: 'Mujeres', color: C.mujer }]}
            formato={(v) => fmt.pct(v)}
            formatoEje={(v) => `${v} %`}
            referencia={{ y: 50, etiqueta: 'Paridad' }}
            dominio={[0, 60]}
          />
        </ChartCard>
        <ChartCard
          titulo="Cuánto gana una mujer por cada $100 de un hombre"
          sub="La línea de $100 es la igualdad"
          lectura={lecturaBrecha}
          ayuda={
            <>
              Por debajo de $100, las mujeres ganan menos. “Puestos similares” compara a mujeres y hombres del mismo
              sector, tamaño de empresa, nivel de cargo y edad.
            </>
          }
          leyenda={<Leyenda items={serieBrecha.map((s) => ({ nombre: s.nombre, color: s.color, forma: 'linea' }))} />}
          tabla={{
            columnas: ['Año', 'Todas las personas', 'Puestos similares'],
            filas: filas.map((r) => [r.anio, fmt.p100(r.simple), fmt.p100(r.ajustada)]),
          }}
        >
          <Lineas
            datos={filas}
            x="anio"
            series={serieBrecha}
            formato={(v) => fmt.p100(v)}
            formatoEje={(v) => `$${v}`}
            referencia={{ y: 100, etiqueta: 'Igualdad' }}
            dominio={[lo, hi]}
          />
        </ChartCard>
      </div>
    </section>
  )
}

// ─── Techo de cristal ───────────────────────────────────────────────────────────
const CUARTOS = ['Los que menos ganan', 'Medio bajo', 'Medio alto', 'Los que más ganan']

export function TechoCristal({ d, f, setF }: P) {
  const c = combo(d, f)
  const filas: FilaDato[] = d.dims.niveles.map((nivel) => {
    const x = combo(d, { ...f, nivel })
    return { id: nivel, nombre: nivel, pctM: pctMujeres(x), p100: x ? por100(x[f.medida]) : null, personas: x ? x.n[0] + x.n[1] : 0 }
  })
  const pm = pctMujeres(c)
  const q = c?.q?.map((v, i) => ({ cuarto: CUARTOS[i], pct: v == null ? null : round1(v * 100) }))

  const estr = filas.find((r) => r.id === 'Estratégico')
  const peorNivel = extremos(filas, (r) => r.p100)?.min
  const lecturaNivel =
    f.nivel === TODOS && estr?.pctM != null ? (
      <>
        En cargos {NIVEL_TXT.Estratégico}, <B>{de100(estr.pctM)}</B> son mujeres y ganan <B>{fmt.p100(estr.p100)}</B> por cada
        $100 de un hombre.{' '}
        {peorNivel && peorNivel.p100 != null && peorNivel.p100 < 98 && (
          peorNivel.id === 'Estratégico' ? (
            <B>Es el nivel con la mayor diferencia de sueldo.</B>
          ) : (
            <>La mayor diferencia de sueldo está en los cargos {NIVEL_TXT[peorNivel.id]}.</>
          )
        )}
      </>
    ) : (
      <>Toca un nivel para ver todo el tablero solo con ese tipo de cargo.</>
    )

  const q4 = q?.[3]?.pct
  const lecturaQ =
    q4 != null && pm != null ? (
      <>
        Entre las personas que <B>más ganan</B>, {de100(q4)} son mujeres, frente a {de100(pm)} en total.{' '}
        {q4 < pm - 2 ? (
          <B>Las mujeres llegan menos a los sueldos más altos.</B>
        ) : q4 > pm + 2 ? (
          <>Las mujeres están bien representadas en los sueldos más altos.</>
        ) : (
          <>La proporción es parecida en los sueldos altos.</>
        )}
      </>
    ) : null

  return (
    <section className="seccion">
      <h2>¿Llegan las mujeres a los puestos más altos?</h2>
      <div className="grid2">
        <ChartCard
          titulo="Según el nivel del cargo"
          sub="Cuántas mujeres hay y cuánto ganan en cada nivel"
          lectura={lecturaNivel}
          ayuda={
            <>
              <B>Operativo:</B> asistentes, técnicos, operarios. <B>Táctico:</B> jefaturas y supervisión.{' '}
              <B>Estratégico:</B> gerencias y direcciones. La barra muestra cuántas mujeres (violeta) y hombres (verde) hay;
              el punto, cuánto gana una mujer por cada $100 de un hombre.
            </>
          }
          leyenda={<LeyendaFilas />}
          tabla={{
            columnas: ['Nivel', 'Personas', '% mujeres', 'Mujer por cada $100'],
            filas: filas.map((r) => [r.nombre, fmt.n(r.personas), fmt.pct(r.pctM), fmt.p100(r.p100)]),
          }}
        >
          <Filas filas={filas} activo={f.nivel} onElegir={(id) => setF({ nivel: f.nivel === id ? TODOS : id })} />
        </ChartCard>
        <ChartCard
          titulo="Mujeres según cuánto se gana"
          sub="Ordenamos a todos por sueldo y los separamos en 4 grupos iguales"
          lectura={lecturaQ}
          ayuda={
            <>
              Si no hubiera diferencias, cada grupo tendría la misma cantidad de mujeres que el total (la línea horizontal).
              Una barra más baja a la derecha indica un “techo de cristal”: barreras que frenan el ascenso de las mujeres.
            </>
          }
          tabla={q ? { columnas: ['Grupo', '% mujeres'], filas: q.map((r) => [r.cuarto, fmt.pct(r.pct)]) } : undefined}
        >
          {q ? (
            <Columnas
              datos={q}
              x="cuarto"
              y="pct"
              color={C.mujer}
              formato={(v) => fmt.pct(v)}
              referencia={pm != null ? { y: round1(pm)!, etiqueta: 'Total' } : undefined}
              dominio={[0, Math.ceil(Math.max(60, ...q.map((r) => (r.pct ?? 0) + 8)) / 10) * 10]}
            />
          ) : (
            <Vacio />
          )}
        </ChartCard>
      </div>
    </section>
  )
}

function LeyendaFilas() {
  return (
    <Leyenda
      items={[
        { nombre: 'Mujeres', color: C.mujer },
        { nombre: 'Hombres', color: C.hombre },
        { nombre: 'Lo que gana una mujer por cada $100', color: C.accent, forma: 'punto' },
      ]}
    />
  )
}

// ─── Sectores y tamaño ──────────────────────────────────────────────────────────
export function Sectores({ d, f, setF }: P) {
  const filas: FilaDato[] = d.dims.sectores
    .map((s) => {
      const x = combo(d, { ...f, sector: s.id })
      return { id: s.id, nombre: s.nombre, pctM: pctMujeres(x), p100: x ? por100(x[f.medida]) : null, personas: x ? x.n[0] + x.n[1] : 0 }
    })
    .filter((r) => r.personas > 0)
    .sort((a, b) => (a.p100 ?? 999) - (b.p100 ?? 999))

  const tamanos: FilaDato[] = d.dims.tamanos.map((t) => {
    const x = combo(d, { ...f, tamano: t })
    return { id: t, nombre: t, pctM: pctMujeres(x), p100: x ? por100(x[f.medida]) : null, personas: x ? x.n[0] + x.n[1] : 0 }
  })
  const tabla = (r: FilaDato[], col: string) => ({
    columnas: [col, 'Personas', '% mujeres', 'Mujer por cada $100'],
    filas: r.map((x) => [x.nombre, fmt.n(x.personas), fmt.pct(x.pctM), fmt.p100(x.p100)]),
  })

  // Para la lectura solo se consideran sectores con suficientes personas (evita extremos por casos aislados)
  const robustos = filas.filter((r) => r.personas >= 300)
  const exSal = extremos(robustos, (r) => r.p100)
  const exPart = extremos(robustos, (r) => r.pctM)
  const lecturaSector =
    exSal && exPart ? (
      <>
        Donde más se acercan al sueldo de los hombres: <B>{exSal.max.nombre}</B> ({fmt.p100(exSal.max.p100)} por cada $100). Donde
        menos: <B>{exSal.min.nombre}</B> ({fmt.p100(exSal.min.p100)}). Hay más mujeres en <B>{exPart.max.nombre}</B> (
        {de100(exPart.max.pctM)}) y menos en <B>{exPart.min.nombre}</B> ({de100(exPart.min.pctM)}).
      </>
    ) : null

  const exTam = extremos(tamanos, (r) => r.p100)
  const lecturaTam =
    exTam && exTam.min.id !== exTam.max.id && exTam.min.p100! >= 98 ? (
      <>
        En todos los tamaños de empresa{contexto(d, f, ['tamano'])} las mujeres ganan igual o más que los hombres. La mayor ventaja
        para ellas está en <B>{plural(exTam.max.nombre)}</B> ({fmt.p100(exTam.max.p100)} por cada $100).
      </>
    ) : exTam && exTam.min.id !== exTam.max.id ? (
      <>
        La mayor diferencia de sueldo{contexto(d, f, ['tamano'])} está en <B>{plural(exTam.min.nombre)}</B> ({fmt.p100(exTam.min.p100)}{' '}
        por cada $100) y la menor en <B>{plural(exTam.max.nombre)}</B> ({fmt.p100(exTam.max.p100)}).
      </>
    ) : null

  return (
    <section className="seccion">
      <h2>¿En qué sectores y empresas hay más igualdad?</h2>
      <div className="grid1">
        <ChartCard
          titulo="Por actividad de la empresa"
          sub="Toca un sector para ver todo el tablero solo con ese sector"
          lectura={lecturaSector}
          ayuda="La barra muestra cuántas mujeres (violeta) y hombres (verde) trabajan en cada sector. El punto muestra cuánto gana una mujer por cada $100 de un hombre: a la izquierda de la línea, ganan menos; a la derecha, más. Está ordenado de mayor a menor diferencia."
          leyenda={<LeyendaFilas />}
          tabla={tabla(filas, 'Sector')}
        >
          {filas.length ? <Filas filas={filas} activo={f.sector} onElegir={(id) => setF({ sector: f.sector === id ? TODOS : id })} /> : <Vacio />}
        </ChartCard>
      </div>
      <div className="grid1">
        <ChartCard
          titulo="Por tamaño de la empresa"
          sub="Toca un tamaño para filtrar"
          lectura={lecturaTam}
          ayuda="Tamaño oficial según la Superintendencia de Compañías, que considera ventas y número de trabajadores."
          leyenda={<LeyendaFilas />}
          tabla={tabla(tamanos, 'Tamaño')}
        >
          <Filas filas={tamanos} activo={f.tamano} onElegir={(id) => setF({ tamano: f.tamano === id ? TODOS : id })} />
        </ChartCard>
      </div>
    </section>
  )
}

const plural = (t: string) => (t === 'Microempresa' ? 'las microempresas' : `las empresas ${t.toLowerCase()}s`)

// ─── Edad y antigüedad ──────────────────────────────────────────────────────────
function distribucion(celdas: Celda[] | undefined, rangos: string[]) {
  if (!celdas) return null
  const totH = celdas.reduce((s, c) => s + (c?.[0] ?? 0), 0)
  const totM = celdas.reduce((s, c) => s + (c?.[1] ?? 0), 0)
  return rangos.map((rango, i) => {
    const c = celdas[i]
    return {
      rango,
      h: c && totH ? round1((c[0] / totH) * 100) : null,
      m: c && totM ? round1((c[1] / totM) * 100) : null,
      sueldoH: c?.[2] ?? null,
      sueldoM: c?.[3] ?? null,
      p100: round1(por100Celda(c)),
      pctM: round1(pctCelda(c)),
    }
  })
}

/** Primer tramo desde el cual las mujeres ganan claramente menos y se mantiene así */
function desdeCuando(filas: { rango: string; p100: number | null }[]) {
  const validos = filas.filter((r) => r.p100 != null)
  for (let i = 0; i < validos.length; i++) {
    if (validos.slice(i).every((r) => r.p100! < 98)) return i > 0 ? validos[i] : null
  }
  return null
}

export function EdadAntiguedad({ d, f }: P) {
  const c = combo(d, f)
  const edad = distribucion(c?.edad, d.dims.edad)
  const antig = distribucion(c?.antig, d.dims.antig)
  const sexo = [
    { key: 'sueldoM', nombre: 'Mujeres', color: C.mujer },
    { key: 'sueldoH', nombre: 'Hombres', color: C.hombre },
  ]
  const leyendaSexo = <Leyenda items={sexo.map((s) => ({ nombre: s.nombre, color: s.color, forma: 'linea' }))} />

  const jovenes = (r: typeof edad) => (r ? r.slice(0, 3).reduce((s, x) => ({ h: s.h + (x.h ?? 0), m: s.m + (x.m ?? 0) }), { h: 0, m: 0 }) : null)
  const j = jovenes(edad)
  const lecturaPiramide = j ? (
    <>
      <B>{Math.round(j.m)} de cada 100 mujeres</B> tienen menos de 35 años, frente a {Math.round(j.h)} de cada 100 hombres.{' '}
      {j.m > j.h + 3
        ? 'Las mujeres trabajadoras son, en general, más jóvenes: hay menos mujeres en edades mayores.'
        : Math.abs(j.m - j.h) <= 3
          ? 'Mujeres y hombres tienen edades parecidas.'
          : 'Los hombres trabajadores son, en general, más jóvenes.'}
    </>
  ) : null

  const giroEdad = edad ? desdeCuando(edad) : null
  const exEdad = edad ? extremos(edad, (r) => r.p100) : null
  const todasMenos = edad?.filter((r) => r.p100 != null).every((r) => r.p100! < 98)
  const lecturaEdad = edad ? (
    todasMenos && exEdad ? (
      <>
        <B>En todas las edades</B> las mujeres ganan menos. La mayor diferencia está entre los {exEdad.min.rango} años (
        {fmt.p100(exEdad.min.p100)} por cada $100).
      </>
    ) : giroEdad ? (
      <>
        Las mujeres jóvenes ganan parecido o más que los hombres, pero <B>desde los {giroEdad.rango.split(' ')[0]} años</B> empiezan a
        ganar menos ({fmt.p100(giroEdad.p100)} por cada $100 en ese grupo).
      </>
    ) : (
      <>El sueldo de mujeres y hombres crece de forma parecida con la edad.</>
    )
  ) : null

  const giroAnt = antig ? desdeCuando(antig) : null
  const exAnt = antig ? extremos(antig, (r) => r.p100) : null
  const lecturaAntSueldo = antig ? (
    giroAnt ? (
      <>
        A partir de <B>{giroAnt.rango.split(' ')[0]} años</B> en la empresa, las mujeres pasan a ganar menos que los hombres.
      </>
    ) : exAnt && exAnt.min.p100! < 98 ? (
      <>
        La mayor diferencia aparece entre quienes llevan <B>{antigTxt(exAnt.min.rango)}</B> en la empresa ({fmt.p100(exAnt.min.p100)} por cada
        $100).
      </>
    ) : (
      <>Sin importar los años en la empresa, las mujeres ganan parecido o más que los hombres.</>
    )
  ) : null

  const ini = antig?.[0]?.pctM
  const fin = antig?.[antig.length - 1]?.pctM
  const lecturaAntPart =
    ini != null && fin != null ? (
      <>
        Entre quienes acaban de entrar, {de100(ini)} son mujeres; entre quienes llevan <B>25 años o más</B>, {de100(fin)}.{' '}
        {fin < ini - 3
          ? 'Las mujeres permanecen menos tiempo en las empresas.'
          : Math.abs(fin - ini) <= 3
            ? 'La presencia de mujeres es parecida sin importar los años en la empresa.'
            : 'Hay más mujeres entre quienes llevan muchos años.'}
      </>
    ) : null

  return (
    <section className="seccion">
      <h2>¿Cambia con la edad y los años de trabajo?</h2>
      <div className="grid2">
        <ChartCard
          titulo="Edad de quienes trabajan"
          sub="Cómo se reparten mujeres y hombres por edad"
          lectura={lecturaPiramide}
          ayuda="Cada barra muestra qué parte de las mujeres (derecha) o de los hombres (izquierda) está en ese grupo de edad. Así se comparan aunque haya más hombres que mujeres."
          tabla={edad ? { columnas: ['Edad', '% de hombres', '% de mujeres'], filas: edad.map((r) => [r.rango, fmt.pct(r.h), fmt.pct(r.m)]) } : undefined}
        >
          {edad ? <Piramide filas={edad} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Sueldo según la edad"
          sub="Sueldo mensual promedio en dólares"
          lectura={lecturaEdad}
          leyenda={leyendaSexo}
          tabla={edad ? { columnas: ['Edad', 'Mujeres', 'Hombres', 'Mujer por cada $100'], filas: edad.map((r) => [r.rango, fmt.usd(r.sueldoM), fmt.usd(r.sueldoH), fmt.p100(r.p100)]) } : undefined}
        >
          {edad ? <Lineas datos={edad} x="rango" series={sexo} formato={(v) => fmt.usd(v)} formatoEje={(v) => `$${fmt.n(v)}`} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Sueldo según los años en la empresa"
          sub="Sueldo mensual promedio en dólares"
          lectura={lecturaAntSueldo}
          leyenda={leyendaSexo}
          tabla={antig ? { columnas: ['Años en la empresa', 'Mujeres', 'Hombres', 'Mujer por cada $100'], filas: antig.map((r) => [r.rango, fmt.usd(r.sueldoM), fmt.usd(r.sueldoH), fmt.p100(r.p100)]) } : undefined}
        >
          {antig ? <Lineas datos={antig} x="rango" series={sexo} formato={(v) => fmt.usd(v)} formatoEje={(v) => `$${fmt.n(v)}`} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Mujeres según los años en la empresa"
          sub="De cada 100 personas, cuántas son mujeres"
          lectura={lecturaAntPart}
          ayuda="La línea horizontal es el total. Si las barras bajan hacia la derecha, hay menos mujeres entre quienes llevan muchos años en la empresa."
          tabla={antig ? { columnas: ['Años en la empresa', '% mujeres'], filas: antig.map((r) => [r.rango, fmt.pct(r.pctM)]) } : undefined}
        >
          {antig ? (
            <Columnas
              datos={antig}
              x="rango"
              y="pctM"
              color={C.mujer}
              formato={(v) => fmt.pct(v)}
              referencia={c ? { y: round1(pctMujeres(c))!, etiqueta: 'Total' } : undefined}
              dominio={[0, 60]}
            />
          ) : (
            <Vacio />
          )}
        </ChartCard>
      </div>
    </section>
  )
}

// ─── Provincias ───────────────────────────────────────────────────────────────
export function Provincias({ d, f }: P) {
  const c = combo(d, f)
  const filas: FilaDato[] = (c?.prov ?? [])
    .map((cel, i) => ({ id: d.dims.prov[i], nombre: d.dims.prov[i], pctM: pctCelda(cel), p100: por100Celda(cel), personas: cel ? cel[0] + cel[1] : 0 }))
    .filter((r) => r.personas > 0 && r.id !== 'Sin información')
    .sort((a, b) => b.personas - a.personas)

  // Solo provincias con volumen suficiente para la lectura (evita conclusiones con pocos casos)
  const grandes = filas.filter((r) => r.personas >= 1000)
  const ex = extremos(grandes, (r) => r.p100)
  const lectura =
    ex && ex.min.id !== ex.max.id ? (
      <>
        Entre las provincias con más trabajadores, las mujeres ganan más cerca de los hombres en <B>{ex.max.nombre}</B> (
        {fmt.p100(ex.max.p100)} por cada $100) y más lejos en <B>{ex.min.nombre}</B> ({fmt.p100(ex.min.p100)}).
      </>
    ) : null

  return (
    <section className="seccion">
      <h2>¿Y en cada provincia?</h2>
      <div className="grid1">
        <ChartCard
          titulo="Por provincia de la empresa"
          sub="De la provincia con más trabajadores a la de menos"
          lectura={lectura}
          ayuda="Se usa la provincia donde está registrada la empresa. Solo aparecen provincias con información suficiente para proteger la privacidad."
          leyenda={<LeyendaFilas />}
          tabla={{ columnas: ['Provincia', 'Personas', '% mujeres', 'Mujer por cada $100'], filas: filas.map((x) => [x.nombre, fmt.n(x.personas), fmt.pct(x.pctM), fmt.p100(x.p100)]) }}
        >
          {filas.length ? <Filas filas={filas} /> : <Vacio />}
        </ChartCard>
      </div>
    </section>
  )
}

function round1(v: number | null | undefined): number | null {
  return v == null ? null : Math.round(v * 10) / 10
}

