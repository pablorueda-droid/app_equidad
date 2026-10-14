import { useEffect, useMemo, useState } from 'react'
import { cargarDashboard, combo, fmt, pctMujeres, por100, textoBrecha, TODOS, type Dashboard, type Filtros, type Medida } from './data'
import logoActuaria from './assets/actuaria-blanco.svg'
import { Metodologia } from './components/Metodologia'
import { Onboarding } from './components/Onboarding'
import { onboardingVisto } from './onboarding'
import { EdadAntiguedad, Evolucion, Provincias, Sectores, TechoCristal, Titular } from './components/Secciones'

/** Personas del último año, redondeado hacia abajo a decenas de mil ("330.000") */
function personasUltimoAnio(d: Dashboard) {
  const c = d.datos[`${d.dims.anios[d.dims.anios.length - 1]}|*|*|*`]
  const n = c ? c.n[0] + c.n[1] : 0
  return (Math.floor(n / 10_000) * 10_000).toLocaleString('es-EC')
}

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

/** Gráfico "=": barras Hombre $100 / Mujer $X cruzadas por la línea de igualdad */
function SignoIgual({ d, f }: { d: Dashboard; f: Filtros }) {
  const c = combo(d, f)
  const p = c ? por100(c[f.medida]) : null
  const max = Math.max(100, p ?? 0) * 1.04
  const ancho = (v: number) => `${(v / max) * 100}%`
  const linea = ancho(100)
  return (
    <div className="igual">
      <p className="hero-eyebrow">Por cada $100 que gana un hombre · {f.anio}</p>
      <div className="igual-barras" role="img" aria-label={`Por cada $100 que gana un hombre, una mujer gana ${fmt.p100(p)}`}>
        <div className="igual-fila">
          <span>Hombre</span>
          <div className="igual-pista">
            <div className="igual-barra igual-h" style={{ width: linea }} />
            <i className="igual-linea igual-linea-arriba" style={{ left: linea }} />
          </div>
          <b>$100</b>
        </div>
        <div className="igual-fila">
          <span>Mujer</span>
          <div className="igual-pista">
            <div className="igual-barra igual-m" style={{ width: ancho(p ?? 0) }} />
            <i className="igual-linea igual-linea-abajo" style={{ left: linea }} />
          </div>
          <b>{fmt.p100(p)}</b>
        </div>
      </div>
      <div className="igual-cifra">
        <span className="igual-valor">{fmt.p100(p)}</span>
        <span className="igual-frase">
          gana una mujer: {textoBrecha(p)} <span className="igual-nota">(la línea lila clara es la igualdad)</span>
        </span>
      </div>
    </div>
  )
}

/** Franja de paridad: participación de mujeres frente a la marca de 50 */
function FranjaParidad({ d, f }: { d: Dashboard; f: Filtros }) {
  const pm = pctMujeres(combo(d, f))
  const faltan = pm == null ? '' : pm >= 49.5 ? 'Paridad alcanzada' : `Faltan ${Math.round(50 - pm)} para la paridad`
  return (
    <div className="paridad">
      <div className="wrap paridad-wrap">
        <p className="paridad-cifra">
          <span>{pm == null ? '—' : Math.round(pm)}</span>
          <span>de cada 100 personas trabajadoras son mujeres</span>
        </p>
        <div
          className="paridad-pista"
          role="img"
          aria-label={pm == null ? 'Sin datos de participación' : `Mujeres ${fmt.pct(pm)}, hombres ${fmt.pct(100 - pm)}; la paridad es 50 %`}
        >
          <span className="paridad-etq">50 · paridad</span>
          <div className="paridad-barra">
            <div className="paridad-m" style={{ width: `${pm ?? 0}%` }} />
            <div className="paridad-h" />
          </div>
          <i className="paridad-marca" />
          <div className="paridad-leyenda" aria-hidden="true">
            <span>Mujeres</span>
            <span>Hombres</span>
          </div>
        </div>
        <p className="paridad-faltan">{faltan}</p>
      </div>
    </div>
  )
}

export default function App() {
  const [d, setD] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setFiltros] = useState<Filtros | null>(null)
  const [tour, setTour] = useState(false)

  useEffect(() => {
    cargarDashboard()
      .then((datos) => {
        setD(datos)
        setFiltros(filtrosIniciales(datos))
        if (!onboardingVisto()) setTour(true)
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
          <div className="hero-top">
            <img className="hero-logo" src={logoActuaria} alt="Actuaria" width={157} height={38} />
            <p className="marca">ACTUAR por la Equidad</p>
          </div>
          <div className="hero-grid">
            <div>
              <h1>
                ¿Cuánto ganan y dónde trabajan <em>las mujeres</em> en las empresas del Ecuador?
              </h1>
              <p className="bajada">
                Datos de{' '}
                {d ? `más de ${personasUltimoAnio(d)} trabajadores al año en ${d.meta.empresas.toLocaleString('es-EC')} empresas privadas, ${d.dims.anios[0]}–${d.dims.anios[d.dims.anios.length - 1]}` : 'miles de trabajadores en empresas privadas'}.
              </p>
              {d && (
                <button className="btn-hero" onClick={() => setTour(true)}>
                  ¿Cómo leer este tablero?
                </button>
              )}
            </div>
            {d && f && <SignoIgual d={d} f={f} />}
          </div>
        </div>
        {d && f && <FranjaParidad d={d} f={f} />}
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
          <nav className="filtros" aria-label="Filtros" id="tour-filtros">
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
                <label htmlFor="f-sector">Sector</label>
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
                <label htmlFor="f-tamano">Tamaño de la empresa</label>
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
                <label id="l-medida">Comparar con</label>
                <div className="segmentado" role="group" aria-labelledby="l-medida">
                  {(['mediana', 'media'] as Medida[]).map((m) => (
                    <button key={m} aria-pressed={f.medida === m} onClick={() => setF({ medida: m })}>
                      {m === 'mediana' ? 'Sueldo típico' : 'Promedio'}
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

          {tour && <Onboarding onCerrar={() => setTour(false)} />}

          <footer className="pie">
            <div className="wrap pie-wrap">
              <div className="pie-marca">
                <p className="pie-titulo">
                  ACTUAR por la <em>Equidad</em>
                </p>
                <p>Elaborado por Actuaria</p>
              </div>
              <p className="pie-fuente">
                Fuente: información laboral de empresas privadas del Ecuador y Superintendencia de Compañías. Actualizado el{' '}
                {actualizado}.
              </p>
            </div>
          </footer>
        </>
      )}
    </>
  )
}
