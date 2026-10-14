import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface Tabla {
  columnas: string[]
  filas: (string | number)[][]
}

interface Props {
  titulo: string
  sub?: ReactNode
  leyenda?: ReactNode
  /** Lectura dinámica en lenguaje simple: qué dice el gráfico con los filtros actuales */
  lectura?: ReactNode
  /** Cómo leer el gráfico (se abre con el botón "?") */
  ayuda?: ReactNode
  tabla?: Tabla
  children: ReactNode
}

export function ChartCard({ titulo, sub, leyenda, lectura, ayuda, tabla, children }: Props) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className="card chart-card" aria-label={titulo}>
      <div className="cabecera">
        <div>
          <h3>
            {titulo}
            {ayuda && <Ayuda titulo={titulo}>{ayuda}</Ayuda>}
          </h3>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {tabla && (
          <div className="acciones">
            <button className="btn-link" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla}>
              {verTabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          </div>
        )}
      </div>
      {lectura && <Lectura>{lectura}</Lectura>}
      {leyenda && !verTabla && <div style={{ marginTop: 12 }}>{leyenda}</div>}
      <div className="cuerpo">
        {verTabla && tabla ? (
          <div className="tabla-scroll">
            <table className="datos">
              <thead>
                <tr>
                  {tabla.columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.filas.map((f, i) => (
                  <tr key={i}>
                    {f.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

/** Recuadro "Lo que nos dice": la lectura cambia con los filtros. El ícono es el mini "=" (mujer / hombre). */
export function Lectura({ children }: { children: ReactNode }) {
  return (
    <div className="lectura" aria-live="polite">
      <span className="lectura-ico" aria-hidden="true">
        <i className="lectura-ico-m" />
        <i className="lectura-ico-h" />
      </span>
      <div>
        <span className="lectura-t">Lo que nos dice</span>
        <p>{children}</p>
      </div>
    </div>
  )
}

/** Botón "?" con una explicación breve (clic, foco o Esc para cerrar) */
export function Ayuda({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [abierto])
  return (
    <span className="ayuda" ref={ref}>
      <button
        className="ayuda-btn"
        aria-label={`¿Cómo leer: ${titulo}?`}
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
      >
        ?
      </button>
      {abierto && (
        <span className="ayuda-pop" id={id} role="tooltip">
          {children}
        </span>
      )}
    </span>
  )
}

export function Leyenda({ items }: { items: { nombre: string; color: string; forma?: 'caja' | 'linea' | 'punto' }[] }) {
  return (
    <div className="leyenda">
      {items.map((i) => (
        <span key={i.nombre}>
          <i
            className={i.forma === 'linea' ? 'sw-linea' : i.forma === 'punto' ? 'sw-punto' : 'sw'}
            style={{ background: i.color }}
          />
          {i.nombre}
        </span>
      ))}
    </div>
  )
}

export function Vacio({ texto = 'No hay suficientes datos para esta combinación. Prueba con menos filtros.' }: { texto?: string }) {
  return <div className="vacio">{texto}</div>
}
