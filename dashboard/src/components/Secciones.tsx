import {
  combo,
  fmt,
  pctCelda,
  pctMujeres,
  por100,
  por100Celda,
  textoBrecha,
  TODOS,
  type Celda,
  type Dashboard,
  type Filtros,
} from '../data'
import { ChartCard, Leyenda, Vacio } from './ChartCard'
import { C, Columnas, Lineas, Piramide } from './charts'
import { Filas, type FilaDato } from './Filas'

interface P {
  d: Dashboard
  f: Filtros
  setF: (p: Partial<Filtros>) => void
}

const nombreMedida = (f: Filtros) => (f.medida === 'mediana' ? 'mediana' : 'promedio')

// ─── Titular ──────────────────────────────────────────────────────────────────
export function Titular({ d, f }: P) {
  const c = combo(d, f)
  if (!c) return <div className="card" style={{ marginTop: 24 }}><Vacio /></div>
  const p = por100(c[f.medida])
  const aj = c.aj != null ? c.aj * 100 : null
  const pm = pctMujeres(c)
  const ant = combo(d, { ...f, anio: f.anio - 1 })
  const pmAnt = pctMujeres(ant)
  const estr = combo(d, { ...f, nivel: 'Estratégico' })
  const pmEstr = pctMujeres(estr)

  return (
    <div className="titular">
      <div className="card headline">
        <p className="eyebrow">
          En {f.anio}, por cada $100 que gana un hombre, una mujer gana
        </p>
        <div className="cifra">
          <span className="valor">{fmt.p100(p)}</span>
          <span className="frase">
            es decir, <strong>{textoBrecha(p)}</strong> (remuneración {nombreMedida(f)} mensual)
          </span>
        </div>
        <p className="detalle">
          Si comparamos a mujeres y hombres <strong>del mismo sector, tamaño de empresa, nivel de cargo y edad</strong>, la
          mujer gana <strong>{fmt.p100(aj)}</strong> por cada $100 ({textoBrecha(aj)}). A esto lo llamamos{' '}
          <em>brecha ajustada</em>: muestra la diferencia que no se explica por dónde ni en qué puesto trabaja cada persona.
        </p>
        <p className="detalle" style={{ marginTop: 8 }}>
          Mujer: {fmt.usd(c[f.medida][1])} · Hombre: {fmt.usd(c[f.medida][0])}
        </p>
      </div>
      <div className="kpis">
        <div className="card kpi">
          <p className="label">Mujeres en la fuerza laboral</p>
          <p className="value">{fmt.pct(pm)}</p>
          <p className="delta">
            {pm != null && pmAnt != null
              ? Math.abs(pm - pmAnt) < 0.05
                ? `sin cambio vs ${f.anio - 1}`
                : `${pm > pmAnt ? '+' : '−'}${Math.abs(pm - pmAnt).toFixed(1).replace('.', ',')} pp vs ${f.anio - 1}`
              : 'sin comparación anual'}
          </p>
        </div>
        <div className="card kpi">
          <p className="label">Mujeres en cargos estratégicos</p>
          <p className="value">{fmt.pct(pmEstr)}</p>
          <p className="delta">gerencias y direcciones</p>
        </div>
        <div className="card kpi">
          <p className="label">Personas analizadas</p>
          <p className="value">{fmt.compacto(c.n[0] + c.n[1])}</p>
          <p className="delta">
            {fmt.n(c.n[1])} mujeres · {fmt.n(c.n[0])} hombres
          </p>
        </div>
        <div className="card kpi">
          <p className="label">Empresas analizadas</p>
          <p className="value">{fmt.n(c.emp)}</p>
          <p className="delta">con estudio actuarial en {f.anio}</p>
        </div>
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
    { key: 'simple', nombre: `Brecha simple (${nombreMedida(f)})`, color: C.accent },
    { key: 'ajustada', nombre: 'Brecha ajustada', color: C.neutral },
  ]
  const valores = filas.flatMap((r) => [r.simple, r.ajustada]).filter((v): v is number => v != null)
  const lo = Math.floor(Math.min(90, ...valores) / 5) * 5
  const hi = Math.ceil(Math.max(105, ...valores) / 5) * 5

  return (
    <section className="seccion">
      <h2>¿Cómo ha cambiado en el tiempo?</h2>
      <p className="intro">
        Evolución anual con los filtros seleccionados. Cada año refleja las empresas con estudio actuarial de ese año, por lo
        que la muestra puede variar.
      </p>
      <div className="grid2">
        <ChartCard
          titulo="Participación de mujeres"
          sub="% de mujeres sobre el total de personas trabajadoras"
          tabla={{ columnas: ['Año', '% mujeres'], filas: filas.map((r) => [r.anio, fmt.pct(r.participacion)]) }}
        >
          <Lineas
            datos={filas}
            x="anio"
            series={[{ key: 'participacion', nombre: 'Mujeres', color: C.mujer }]}
            formato={(v) => fmt.pct(v)}
            formatoEje={(v) => `${v} %`}
            referencia={{ y: 50, etiqueta: 'Paridad 50 %' }}
            dominio={[0, 60]}
          />
        </ChartCard>
        <ChartCard
          titulo="Lo que gana una mujer por cada $100 de un hombre"
          sub="100 = igualdad salarial; por debajo, las mujeres ganan menos"
          leyenda={<Leyenda items={serieBrecha.map((s) => ({ nombre: s.nombre, color: s.color, forma: 'linea' }))} />}
          tabla={{
            columnas: ['Año', 'Brecha simple', 'Brecha ajustada'],
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
export function TechoCristal({ d, f, setF }: P) {
  const c = combo(d, f)
  const filas: FilaDato[] = d.dims.niveles.map((nivel) => {
    const x = combo(d, { ...f, nivel })
    return {
      id: nivel,
      nombre: nivel,
      pctM: pctMujeres(x),
      p100: x ? por100(x[f.medida]) : null,
      personas: x ? x.n[0] + x.n[1] : 0,
    }
  })
  const pm = pctMujeres(c)
  const q = c?.q?.map((v, i) => ({ cuartil: ['Q1 · 25 % peor pagado', 'Q2', 'Q3', 'Q4 · 25 % mejor pagado'][i], pct: v == null ? null : round1(v * 100) }))

  return (
    <section className="seccion">
      <h2>¿Llegan las mujeres a los puestos más altos?</h2>
      <p className="intro">
        El “techo de cristal” describe las barreras invisibles que limitan el ascenso de las mujeres. Lo vemos en dos
        formas: cuántas mujeres hay en cada nivel jerárquico y en qué parte de la escala salarial se ubican.
      </p>
      <div className="grid2">
        <ChartCard
          titulo="Nivel jerárquico del cargo"
          sub={`Participación y brecha (${nombreMedida(f)}) por nivel. ${f.nivel === TODOS ? 'Clic en un nivel para filtrar.' : ''}`}
          leyenda={<Leyenda items={[{ nombre: 'Mujeres', color: C.mujer }, { nombre: 'Hombres', color: C.hombre }, { nombre: '$ mujer por cada $100', color: C.accent, forma: 'punto' }]} />}
          tabla={{
            columnas: ['Nivel', 'Personas', '% mujeres', 'Mujer por cada $100'],
            filas: filas.map((r) => [r.nombre, fmt.n(r.personas), fmt.pct(r.pctM), fmt.p100(r.p100)]),
          }}
          nota="Operativo: asistentes, técnicos, operarios. Táctico: jefaturas, supervisión, coordinación. Estratégico: gerencias y direcciones."
        >
          <Filas filas={filas} activo={f.nivel} onElegir={(id) => setF({ nivel: f.nivel === id ? TODOS : id })} />
        </ChartCard>
        <ChartCard
          titulo="Mujeres en cada cuarto de la escala salarial"
          sub="Ordenamos a todas las personas de menor a mayor sueldo y las dividimos en 4 grupos iguales"
          tabla={q ? { columnas: ['Cuartil', '% mujeres'], filas: q.map((r) => [r.cuartil, fmt.pct(r.pct)]) } : undefined}
          nota={pm != null ? `Si no hubiera diferencias, cada grupo tendría ${fmt.pct(pm)} de mujeres (línea de referencia).` : undefined}
        >
          {q ? (
            <Columnas
              datos={q.map((r) => ({ ...r, cuartil: r.cuartil.split(' · ')[0] }))}
              x="cuartil"
              y="pct"
              color={C.mujer}
              formato={(v) => fmt.pct(v)}
              referencia={pm != null ? { y: round1(pm)!, etiqueta: `Total ${fmt.pct(pm)}` } : undefined}
              dominio={[0, Math.ceil(Math.max(60, ...q.map((r) => (r.pct ?? 0) + 8)) / 10) * 10]}
            />
          ) : (
            <Vacio />
          )}
          {q && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', padding: '0 8px 0 48px' }}>
              <span>← sueldos más bajos</span>
              <span>sueldos más altos →</span>
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  )
}

// ─── Sectores y tamaño ──────────────────────────────────────────────────────────
export function Sectores({ d, f, setF }: P) {
  const filas: FilaDato[] = d.dims.sectores
    .map((s) => {
      const x = combo(d, { ...f, sector: s.id })
      return {
        id: s.id,
        nombre: s.nombre,
        pctM: pctMujeres(x),
        p100: x ? por100(x[f.medida]) : null,
        personas: x ? x.n[0] + x.n[1] : 0,
      }
    })
    .filter((r) => r.personas > 0)
    .sort((a, b) => (a.p100 ?? 999) - (b.p100 ?? 999))

  const tamanos: FilaDato[] = d.dims.tamanos.map((t) => {
    const x = combo(d, { ...f, tamano: t })
    return { id: t, nombre: t, pctM: pctMujeres(x), p100: x ? por100(x[f.medida]) : null, personas: x ? x.n[0] + x.n[1] : 0 }
  })
  const leyenda = (
    <Leyenda items={[{ nombre: 'Mujeres', color: C.mujer }, { nombre: 'Hombres', color: C.hombre }, { nombre: '$ mujer por cada $100', color: C.accent, forma: 'punto' }]} />
  )
  const tabla = (r: FilaDato[], col: string) => ({
    columnas: [col, 'Personas', '% mujeres', 'Mujer por cada $100'],
    filas: r.map((x) => [x.nombre, fmt.n(x.personas), fmt.pct(x.pctM), fmt.p100(x.p100)]),
  })

  return (
    <section className="seccion">
      <h2>¿En qué sectores y empresas hay más equidad?</h2>
      <p className="intro">
        Las mujeres no se reparten por igual entre actividades económicas. A la izquierda, cuántas mujeres trabajan en cada
        sector; a la derecha, cuánto ganan por cada $100 que gana un hombre del mismo sector. Ordenado de mayor a menor
        brecha.
      </p>
      <div className="grid1">
        <ChartCard
          titulo="Actividad económica (CIIU)"
          sub="Clic en un sector para filtrar todo el tablero"
          leyenda={leyenda}
          tabla={tabla(filas, 'Sector')}
        >
          {filas.length ? (
            <Filas filas={filas} activo={f.sector} onElegir={(id) => setF({ sector: f.sector === id ? TODOS : id })} />
          ) : (
            <Vacio />
          )}
        </ChartCard>
      </div>
      <div className="grid1">
        <ChartCard
          titulo="Tamaño de empresa"
          sub="Según la clasificación oficial de la Superintendencia de Compañías"
          leyenda={leyenda}
          tabla={tabla(tamanos, 'Tamaño')}
        >
          <Filas filas={tamanos} activo={f.tamano} onElegir={(id) => setF({ tamano: f.tamano === id ? TODOS : id })} />
        </ChartCard>
      </div>
    </section>
  )
}

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

export function EdadAntiguedad({ d, f }: P) {
  const c = combo(d, f)
  const edad = distribucion(c?.edad, d.dims.edad)
  const antig = distribucion(c?.antig, d.dims.antig)
  const sexo = [
    { key: 'sueldoM', nombre: 'Mujeres', color: C.mujer },
    { key: 'sueldoH', nombre: 'Hombres', color: C.hombre },
  ]
  const leyendaSexo = <Leyenda items={sexo.map((s) => ({ nombre: s.nombre, color: s.color, forma: 'linea' }))} />

  return (
    <section className="seccion">
      <h2>Edad y trayectoria</h2>
      <p className="intro">
        ¿En qué etapas de la vida laboral se concentran las mujeres y cómo evoluciona su sueldo con la edad y los años de
        servicio en la empresa?
      </p>
      <div className="grid2">
        <ChartCard
          titulo="¿Cómo se distribuyen por edad?"
          sub="% de las mujeres (y de los hombres) que está en cada rango de edad"
          tabla={edad ? { columnas: ['Edad', '% de hombres', '% de mujeres'], filas: edad.map((r) => [r.rango, fmt.pct(r.h), fmt.pct(r.m)]) } : undefined}
        >
          {edad ? <Piramide filas={edad} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Sueldo promedio según la edad"
          sub="Remuneración mensual promedio (USD)"
          leyenda={leyendaSexo}
          tabla={edad ? { columnas: ['Edad', 'Mujeres', 'Hombres', 'Mujer por cada $100'], filas: edad.map((r) => [r.rango, fmt.usd(r.sueldoM), fmt.usd(r.sueldoH), fmt.p100(r.p100)]) } : undefined}
        >
          {edad ? <Lineas datos={edad} x="rango" series={sexo} formato={(v) => fmt.usd(v)} formatoEje={(v) => `$${fmt.n(v)}`} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Sueldo promedio según los años en la empresa"
          sub="Remuneración mensual promedio (USD) por antigüedad"
          leyenda={leyendaSexo}
          tabla={antig ? { columnas: ['Antigüedad (años)', 'Mujeres', 'Hombres', 'Mujer por cada $100'], filas: antig.map((r) => [r.rango, fmt.usd(r.sueldoM), fmt.usd(r.sueldoH), fmt.p100(r.p100)]) } : undefined}
        >
          {antig ? <Lineas datos={antig} x="rango" series={sexo} formato={(v) => fmt.usd(v)} formatoEje={(v) => `$${fmt.n(v)}`} /> : <Vacio />}
        </ChartCard>
        <ChartCard
          titulo="Mujeres según los años en la empresa"
          sub="% de mujeres en cada tramo de antigüedad"
          tabla={antig ? { columnas: ['Antigüedad (años)', '% mujeres'], filas: antig.map((r) => [r.rango, fmt.pct(r.pctM)]) } : undefined}
          nota="Una caída en los tramos largos puede indicar que las mujeres permanecen menos tiempo en las empresas."
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
    .map((cel, i) => ({
      id: d.dims.prov[i],
      nombre: d.dims.prov[i],
      pctM: pctCelda(cel),
      p100: por100Celda(cel),
      personas: cel ? cel[0] + cel[1] : 0,
    }))
    .filter((r) => r.personas > 0 && r.id !== 'Sin información')
    .sort((a, b) => b.personas - a.personas)

  return (
    <section className="seccion">
      <h2>¿Y por provincia?</h2>
      <p className="intro">Provincia del domicilio de la empresa registrado en la Superintendencia de Compañías.</p>
      <div className="grid1">
        <ChartCard
          titulo="Provincia de la empresa"
          sub="Ordenado por número de personas · brecha calculada con el sueldo promedio"
          leyenda={<Leyenda items={[{ nombre: 'Mujeres', color: C.mujer }, { nombre: 'Hombres', color: C.hombre }, { nombre: '$ mujer por cada $100', color: C.accent, forma: 'punto' }]} />}
          tabla={{
            columnas: ['Provincia', 'Personas', '% mujeres', 'Mujer por cada $100'],
            filas: filas.map((x) => [x.nombre, fmt.n(x.personas), fmt.pct(x.pctM), fmt.p100(x.p100)]),
          }}
          nota="Se muestran solo provincias con al menos 3 empresas en la combinación de filtros elegida."
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
