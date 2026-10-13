import { useEffect, useMemo, useState } from 'react'
import { cargarDashboard, TODOS, type Dashboard, type Filtros, type Medida } from './data'
import { Metodologia } from './components/Metodologia'
import { EdadAntiguedad, Evolucion, Provincias, Sectores, TechoCristal, Titular } from './components/Secciones'

function filtrosIniciales(d: Dashboard): Filtros {
  const q = new URLSearchParams(window.location.search)
  const anio = Number(q.get('anio'))
  const val = (k: string, opciones: string[]) => {
    const v = q.get(k)
    return v && opciones.includes(v) ? v : TODOS
  }
  return {
    anio: d.dims.anios.includes(anio) ? anio : d.dims.anios[d.dims.anios.length - 1],
    sector: val('sector', d.dims.sectores.map((s) => s.id)),
    tamano: val('tamano', d.dims.tamanos),
    nivel: val('nivel', d.dims.niveles),
    medida: q.get('medida') === 'media' ? 'media' : 'mediana',
  }
}

export default function App() {
  const [d, setD] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setFiltros] = useState<Filtros | null>(null)

  useEffect(() => {
    cargarDashboard()
      .then((datos) => {
        setD(datos)
        setFiltros(filtrosIniciales(datos))
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  // Los filtros quedan en la URL para poder compartir una vista concreta
  useEffect(() => {
    if (!f) return
    const q = new URLSearchParams()
    q.set('anio', String(f.anio))
    if (f.sector !== TODOS) q.set('sector', f.sector)
    if (f.tamano !== TODOS) q.set('tamano', f.tamano)
    if (f.nivel !== TODOS) q.set('nivel', f.nivel)
    if (f.medida !== 'mediana') q.set('medida', f.medida)
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
  }, [f])

  const setF = (p: Partial<Filtros>) => setFiltros((prev) => (prev ? { ...prev, ...p } : prev))
  const actualizado = useMemo(
    () => (d ? new Date(d.meta.generado).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }) : ''),
    [d],
  )

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <p className="marca">Actuaria · ACTUAR por la Equidad</p>
          <h1>¿Cuánto ganan y dónde trabajan las mujeres en las empresas del Ecuador?</h1>
          <p className="bajada">
            Indicadores de equidad de género construidos a partir de{' '}
            {d ? `${(d.meta.registros / 1e6).toFixed(1).replace('.', ',')} millones de registros laborales de ${d.meta.empresas.toLocaleString('es-EC')} empresas` : 'millones de registros laborales'}{' '}
            del sector formal, {d ? `${d.dims.anios[0]}–${d.dims.anios[d.dims.anios.length - 1]}` : ''}.
          </p>
        </div>
      </header>

      {error && (
        <div className="wrap">
          <div className="card" style={{ marginTop: 24 }}>
            <p>No pudimos cargar la información. {error}</p>
          </div>
        </div>
      )}

      {d && f && (
        <>
          <nav className="filtros" aria-label="Filtros">
            <div className="wrap">
              <div className="filtro">
                <label htmlFor="f-anio">Año</label>
                <select id="f-anio" value={f.anio} onChange={(e) => setF({ anio: Number(e.target.value) })}>
                  {[...d.dims.anios].reverse().map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filtro">
                <label htmlFor="f-sector">Sector económico</label>
                <select id="f-sector" value={f.sector} onChange={(e) => setF({ sector: e.target.value })}>
                  <option value={TODOS}>Todos los sectores</option>
                  {d.dims.sectores.map((s) => (
                    <option key={s.id} value={s.id} title={s.descripcion}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filtro">
                <label htmlFor="f-tamano">Tamaño de empresa</label>
                <select id="f-tamano" value={f.tamano} onChange={(e) => setF({ tamano: e.target.value })}>
                  <option value={TODOS}>Todos los tamaños</option>
                  {d.dims.tamanos.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="filtro">
                <label htmlFor="f-nivel">Nivel del cargo</label>
                <select id="f-nivel" value={f.nivel} onChange={(e) => setF({ nivel: e.target.value })}>
                  <option value={TODOS}>Todos los niveles</option>
                  {d.dims.niveles.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="filtro" style={{ minWidth: 0 }}>
                <label id="l-medida">Comparar sueldos con</label>
                <div className="segmentado" role="group" aria-labelledby="l-medida">
                  {(['mediana', 'media'] as Medida[]).map((m) => (
                    <button key={m} aria-pressed={f.medida === m} onClick={() => setF({ medida: m })}>
                      {m === 'mediana' ? 'Mediana' : 'Promedio'}
                    </button>
                  ))}
                </div>
              </div>
              {(f.sector !== TODOS || f.tamano !== TODOS || f.nivel !== TODOS) && (
                <button className="btn-link" onClick={() => setF({ sector: TODOS, tamano: TODOS, nivel: TODOS })}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </nav>

          <main className="wrap">
            <Titular d={d} f={f} setF={setF} />
            <Evolucion d={d} f={f} setF={setF} />
            <TechoCristal d={d} f={f} setF={setF} />
            <Sectores d={d} f={f} setF={setF} />
            <EdadAntiguedad d={d} f={f} setF={setF} />
            <Provincias d={d} f={f} setF={setF} />
            <Metodologia d={d} />
          </main>

          <footer>
            <div className="wrap">
              <p>
                Fuente: {d.meta.fuente}. Actualizado el {actualizado}. Elaborado por Actuaria.
              </p>
            </div>
          </footer>
        </>
      )}
    </>
  )
}
