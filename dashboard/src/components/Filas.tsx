import { fmt } from '../data'
import { BarraParticipacion, PuntoBrecha } from './charts'

export interface FilaDato {
  id: string
  nombre: string
  detalle?: string
  pctM: number | null
  p100: number | null
  personas: number
}

/** Filas comparables: participación de mujeres + $ que gana una mujer por cada $100 de un hombre */
export function Filas({
  filas,
  activo,
  onElegir,
}: {
  filas: FilaDato[]
  activo?: string
  onElegir?: (id: string) => void
}) {
  const desvio = Math.max(10, ...filas.map((f) => (f.p100 == null ? 0 : Math.abs(f.p100 - 100))))
  const span = Math.ceil(desvio / 10) * 10 + 5
  const [min, max] = [100 - span, 100 + span]

  return (
    <div className="filas">
      <div className="filas-head">
        <span>{onElegir ? 'Clic para filtrar' : ''}</span>
        <span>Participación (mujeres | hombres)</span>
        <span>Mujer por cada $100 de un hombre (línea vertical = igualdad)</span>
      </div>
      {filas.map((f) => (
        <div
          key={f.id}
          className={`fila${activo === f.id ? ' activa' : ''}`}
          role={onElegir ? 'button' : undefined}
          tabIndex={onElegir ? 0 : undefined}
          style={{ cursor: onElegir ? 'pointer' : 'default' }}
          onClick={() => onElegir?.(f.id)}
          onKeyDown={(e) => {
            if (onElegir && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              onElegir(f.id)
            }
          }}
          title={`${f.nombre}: ${fmt.n(f.personas)} personas · mujeres ${fmt.pct(f.pctM)} · ${fmt.p100(f.p100)} por cada $100`}
        >
          <span className="nombre">
            {f.nombre}
            {f.detalle && <small>{f.detalle}</small>}
          </span>
          <BarraParticipacion pctM={f.pctM} alto={22} />
          <PuntoBrecha valor={f.p100} min={min} max={max} />
        </div>
      ))}
    </div>
  )
}
