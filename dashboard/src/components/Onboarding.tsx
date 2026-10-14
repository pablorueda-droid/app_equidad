import { useEffect, useRef, useState, type ReactNode } from 'react'
import { C } from '../colores'
import { CLAVE_ONBOARDING } from '../onboarding'

interface Paso {
  titulo: string
  texto: ReactNode
  visual: ReactNode
  /** id del elemento a resaltar en la página */
  destino?: string
}

const PASOS: Paso[] = [
  {
    titulo: '¿Ganan lo mismo mujeres y hombres?',
    texto: 'Este tablero compara cuánto ganan y dónde trabajan las mujeres y los hombres en empresas del Ecuador. Te mostramos cómo leerlo en 4 pasos.',
    visual: <VisualPersonas />,
  },
  {
    titulo: 'La cifra clave: “por cada $100”',
    texto: (
      <>
        Si un hombre gana <b>$100</b> y una mujer <b>$90</b>, ella gana <b>10 % menos</b>. Cuando la cifra es $100, ganan lo
        mismo.
      </>
    ),
    visual: <VisualCien />,
    destino: 'tour-cifra',
  },
  {
    titulo: 'Elige qué quieres ver',
    texto: 'Con estos filtros cambias el año, el sector, el tamaño de la empresa o el nivel del cargo. Todo el tablero se actualiza.',
    visual: <VisualFiltros />,
    destino: 'tour-filtros',
  },
  {
    titulo: 'Explora y lee la explicación',
    texto: (
      <>
        Cada gráfico trae un recuadro <b>“Lo que nos dice”</b> que se actualiza con tus filtros. Toca las filas para filtrar y
        el botón <b>?</b> si tienes dudas.
      </>
    ),
    visual: <VisualLectura />,
    destino: 'tour-explora',
  },
]

export function Onboarding({ onCerrar }: { onCerrar: () => void }) {
  const [i, setI] = useState(0)
  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1
  const dialogo = useRef<HTMLDivElement>(null)

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE_ONBOARDING, '1')
    } catch {
      /* navegación privada: se mostrará de nuevo */
    }
    onCerrar()
  }

  // Resalta y lleva a la vista el elemento del paso
  useEffect(() => {
    const el = paso.destino ? document.getElementById(paso.destino) : null
    if (el) {
      el.classList.add('tour-foco')
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return () => el?.classList.remove('tour-foco')
  }, [paso.destino])

  useEffect(() => {
    dialogo.current?.querySelector<HTMLButtonElement>('.tour-sig')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      if (e.key === 'ArrowRight' && !ultimo) setI((v) => v + 1)
      if (e.key === 'ArrowLeft' && i > 0) setI((v) => v - 1)
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  return (
    <div className={`tour-velo${paso.destino ? ' tour-velo-claro' : ''}`}>
      <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-t" ref={dialogo}>
        <div className="tour-visual">{paso.visual}</div>
        <p className="tour-paso">
          Paso {i + 1} de {PASOS.length}
        </p>
        <h2 id="tour-t">{paso.titulo}</h2>
        <p className="tour-texto">{paso.texto}</p>
        <div className="tour-puntos" aria-hidden="true">
          {PASOS.map((_, k) => (
            <i key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>
        <div className="tour-botones">
          <button className="btn-link" onClick={cerrar}>
            Saltar
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button className="btn-sec" onClick={() => setI(i - 1)}>
                Atrás
              </button>
            )}
            <button className="btn-pri tour-sig" onClick={() => (ultimo ? cerrar() : setI(i + 1))}>
              {ultimo ? 'Empezar a explorar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Ilustraciones simples (SVG) ──────────────────────────────────────────────────
function Persona({ x, color }: { x: number; color: string }) {
  return (
    <g transform={`translate(${x},0)`}>
      <circle cx="20" cy="16" r="11" fill={color} />
      <path d="M2 64c0-14 8-26 18-26s18 12 18 26z" fill={color} />
    </g>
  )
}

function VisualPersonas() {
  return (
    <svg viewBox="0 0 200 70" width="200" height="70" aria-hidden="true">
      <Persona x={40} color={C.mujer} />
      <text x="100" y="42" textAnchor="middle" fontSize="22" fill="var(--text-muted)">
        =?
      </text>
      <Persona x={122} color={C.hombre} />
    </svg>
  )
}

function VisualCien() {
  return (
    <svg viewBox="0 0 220 76" width="220" height="76" aria-hidden="true">
      <text x="0" y="22" fontSize="12" fill="var(--text-secondary)">Hombre</text>
      <rect x="56" y="10" width="130" height="16" rx="4" fill={C.hombre} />
      <text x="192" y="22" fontSize="12" fontWeight="700" fill="var(--text-primary)">$100</text>
      <text x="0" y="56" fontSize="12" fill="var(--text-secondary)">Mujer</text>
      <rect x="56" y="44" width="117" height="16" rx="4" fill={C.mujer} />
      <text x="179" y="56" fontSize="12" fontWeight="700" fill="var(--text-primary)">$90</text>
      <line x1="186" y1="4" x2="186" y2="68" stroke="var(--text-muted)" strokeDasharray="0" strokeWidth="1" />
    </svg>
  )
}

function VisualFiltros() {
  const caja = (x: number, t: string) => (
    <g transform={`translate(${x},20)`}>
      <rect width="58" height="28" rx="7" fill="var(--surface-1)" stroke="var(--axis)" />
      <text x="8" y="18" fontSize="11" fill="var(--text-secondary)">{t}</text>
      <path d="M46 12l4 4 4-4" stroke="var(--neutral)" fill="none" strokeWidth="1.5" />
    </g>
  )
  return (
    <svg viewBox="0 0 200 70" width="200" height="70" aria-hidden="true">
      {caja(2, 'Año')}
      {caja(70, 'Sector')}
      {caja(138, 'Cargo')}
    </svg>
  )
}

function VisualLectura() {
  return (
    <svg viewBox="0 0 220 76" width="220" height="76" aria-hidden="true">
      <rect x="1" y="1" width="218" height="74" rx="10" fill="var(--mujer-wash)" stroke="var(--border)" />
      <circle cx="24" cy="24" r="9" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <rect x="42" y="18" width="90" height="8" rx="4" fill="var(--accent)" opacity="0.7" />
      <rect x="20" y="42" width="180" height="7" rx="3.5" fill="var(--axis)" />
      <rect x="20" y="56" width="130" height="7" rx="3.5" fill="var(--axis)" />
    </svg>
  )
}
