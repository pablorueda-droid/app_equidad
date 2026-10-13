import { useState, type ReactNode } from 'react'

export interface Tabla {
  columnas: string[]
  filas: (string | number)[][]
}

interface Props {
  titulo: string
  sub?: ReactNode
  leyenda?: ReactNode
  nota?: ReactNode
  tabla?: Tabla
  children: ReactNode
}

function descargarCsv(nombre: string, t: Tabla) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`
  const csv = [t.columnas, ...t.filas].map((f) => f.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ChartCard({ titulo, sub, leyenda, nota, tabla, children }: Props) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className="card chart-card" aria-label={titulo}>
      <div className="cabecera">
        <div>
          <h3>{titulo}</h3>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {tabla && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="btn-link" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla}>
              {verTabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
            <button className="btn-link" onClick={() => descargarCsv(titulo, tabla)} title="Descargar CSV">
              CSV
            </button>
          </div>
        )}
      </div>
      {leyenda && !verTabla && <div style={{ marginTop: 10 }}>{leyenda}</div>}
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
      {nota && <p className="nota">{nota}</p>}
    </section>
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

export function Vacio({ texto = 'No hay datos suficientes para esta combinación de filtros.' }: { texto?: string }) {
  return <div className="vacio">{texto}</div>
}
