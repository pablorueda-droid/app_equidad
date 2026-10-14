import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { C } from '../colores'
import { fmt } from '../data'
import { escala, marcas } from '../escala'

// Ejes: Bricolage 12px en texto terciario (la familia se fija en index.css, .recharts-cartesian-axis-tick-value)
const ejeProps = {
  stroke: 'var(--axis)',
  tick: { fill: 'var(--text-muted)', fontSize: 12 },
  tickLine: false,
} as const

/** Etiqueta del eje X partida en líneas para que quepa en su banda (columnas con nombres largos) */
function TickMultilinea({ x, y, payload, ancho }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; ancho: number }) {
  const palabras = String(payload?.value ?? '').split(' ')
  const maxCar = Math.max(6, Math.floor(ancho / 7))
  const lineas: string[] = []
  for (const p of palabras) {
    const ultima = lineas[lineas.length - 1]
    if (ultima && (ultima + ' ' + p).length <= maxCar) lineas[lineas.length - 1] = `${ultima} ${p}`
    else lineas.push(p)
  }
  return (
    <text x={x} y={y} textAnchor="middle" fill="var(--text-muted)" fontSize={12} className="recharts-cartesian-axis-tick-value">
      {lineas.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 12 : 15}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

export interface Serie {
  key: string
  nombre: string
  color: string
}

type Fila = Record<string, string | number | null>

interface TTProps {
  active?: boolean
  label?: string | number
  payload?: readonly { dataKey?: string | number; value?: number | null }[]
  series: Serie[]
  formato: (v: number | null) => string
}

function TooltipSeries({ active, label, payload, series, formato }: TTProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="tt">
      <div className="tt-t">{label}</div>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key)
        return (
          <div className="tt-r" key={s.key}>
            <span className="tt-k">
              <i className="sw-linea" style={{ background: s.color }} />
              {s.nombre}
            </span>
            <b>{formato(p?.value ?? null)}</b>
          </div>
        )
      })}
    </div>
  )
}

/** Líneas sobre un eje categórico u ordenado (años, rangos de edad, antigüedad) */
export function Lineas({
  datos,
  x,
  series,
  formato,
  formatoEje,
  referencia,
  dominio,
  alto = 260,
}: {
  datos: Fila[]
  x: string
  series: Serie[]
  formato: (v: number | null) => string
  formatoEje?: (v: number) => string
  referencia?: { y: number; etiqueta: string }
  dominio?: [number, number]
  alto?: number
}) {
  const ultimo = datos.length - 1
  const valores = datos.flatMap((r) => series.map((s) => r[s.key])).filter((v): v is number => typeof v === 'number')
  const esc = escala(valores, dominio)
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <LineChart data={datos} margin={{ top: 12, right: 56, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey={x} {...ejeProps} interval="preserveStartEnd" minTickGap={10} padding={{ left: 12, right: 12 }} />
        <YAxis
          {...ejeProps}
          axisLine={false}
          width={56}
          domain={esc.dominio}
          ticks={esc.marcas}
          interval={0}
          tickFormatter={formatoEje}
        />
        {referencia && (
          <ReferenceLine
            y={referencia.y}
            stroke="var(--text-muted)"
            strokeWidth={1}
            label={{ value: referencia.etiqueta, position: 'insideTopLeft', fill: 'var(--text-muted)', fontSize: 12 }}
          />
        )}
        <Tooltip
          cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
          content={(p) => (
            <TooltipSeries
              active={p.active}
              label={p.label as string}
              payload={p.payload as unknown as TTProps['payload']}
              series={series}
              formato={formato}
            />
          )}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.nombre}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color, stroke: 'var(--surface-1)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: s.color, stroke: 'var(--surface-1)', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList
              dataKey={s.key}
              content={(props) => {
                const { index, x: px, y: py, value } = props as { index: number; x: number; y: number; value: number }
                if (index !== ultimo || value == null) return null
                return (
                  <text x={px + 8} y={py + 4} fontSize={12} fill="var(--text-secondary)" fontWeight={600}>
                    {formato(value)}
                  </text>
                )
              }}
            />
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Columnas de una sola serie con línea de referencia (p.ej. cuartiles salariales) */
export function Columnas({
  datos,
  x,
  y,
  color,
  formato,
  referencia,
  dominio,
  alto = 240,
}: {
  datos: Fila[]
  x: string
  y: string
  color: string
  formato: (v: number | null) => string
  referencia?: { y: number; etiqueta: string }
  dominio?: [number, number]
  alto?: number
}) {
  // Ancho aproximado de cada banda para partir las etiquetas largas (se recalcula al redimensionar)
  const [ancho, setAncho] = useState(480)
  const banda = Math.max(40, (ancho - 48 - 72) / Math.max(1, datos.length))
  return (
    <ResponsiveContainer width="100%" height={alto + 18} onResize={(w) => setAncho(w)}>
      <BarChart data={datos} margin={{ top: 22, right: 72, bottom: 4, left: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey={x} {...ejeProps} interval={0} height={48} tick={(p) => <TickMultilinea {...p} ancho={banda} />} />
        <YAxis
          {...ejeProps}
          axisLine={false}
          width={48}
          domain={dominio}
          ticks={dominio ? marcas(dominio[0], dominio[1]) : undefined}
          interval={0}
          tickFormatter={(v) => `${v} %`}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          content={(p) => (
            <TooltipSeries
              active={p.active}
              label={p.label as string}
              payload={p.payload as unknown as TTProps['payload']}
              series={[{ key: y, nombre: 'Mujeres', color }]}
              formato={formato}
            />
          )}
        />
        <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          <LabelList
            dataKey={y}
            position="top"
            formatter={(v: unknown) => formato(v as number)}
            style={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, stroke: 'var(--surface-1)', strokeWidth: 3, paintOrder: 'stroke' }}
          />
        </Bar>
        {referencia && (
          <ReferenceLine
            y={referencia.y}
            stroke="var(--text-primary)"
            strokeWidth={1}
            label={{ value: referencia.etiqueta, position: 'right', fill: 'var(--text-secondary)', fontSize: 12 }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barra 100 % apilada horizontal Mujeres | Hombres, hecha en HTML (etiquetas sin recortes) */
export function BarraParticipacion({ pctM, alto = 26 }: { pctM: number | null; alto?: number }) {
  if (pctM == null) return <span className="sub">—</span>
  const pctH = 100 - pctM
  const cabe = (p: number) => p >= 14
  return (
    <div
      style={{ display: 'flex', gap: 2, height: alto, width: '100%' }}
      role="img"
      aria-label={`Mujeres ${fmt.pct(pctM)}, hombres ${fmt.pct(pctH)}`}
    >
      <div style={{ width: `${pctM}%`, background: C.mujer, color: 'var(--on-mujer)', borderRadius: '4px 0 0 4px', ...celdaTexto }}>
        {cabe(pctM) && `${Math.round(pctM)} %`}
      </div>
      <div style={{ width: `${pctH}%`, background: C.hombre, color: 'var(--on-hombre)', borderRadius: '0 4px 4px 0', ...celdaTexto }}>
        {cabe(pctH) && `${Math.round(pctH)} %`}
      </div>
    </div>
  )
}

const celdaTexto = {
  fontSize: 12,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  padding: '0 8px',
  whiteSpace: 'nowrap' as const,
  minWidth: 0,
}

/** Punto sobre una escala centrada en 100 ("igualdad") para mostrar $ por cada $100 */
export function PuntoBrecha({ valor, min, max }: { valor: number | null; min: number; max: number }) {
  if (valor == null)
    return (
      <span className="sub" style={{ fontSize: 12 }}>
        datos insuficientes
      </span>
    )
  const pos = (v: number) => ((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100
  const p = pos(valor)
  const c = pos(100)
  return (
    <div style={{ position: 'relative', height: 24, width: '100%' }} role="img" aria-label={`${fmt.p100(valor)} por cada $100`}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 1, background: 'var(--grid)' }} />
      <div style={{ position: 'absolute', left: `${c}%`, top: 0, bottom: 0, width: 1, background: 'var(--text-muted)' }} />
      <div
        style={{
          position: 'absolute',
          top: 10,
          height: 3,
          left: `${Math.min(p, c)}%`,
          width: `${Math.abs(p - c)}%`,
          background: 'var(--accent)',
          opacity: 0.35,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${p}% - 6px)`,
          top: 6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 0 2px var(--surface-1)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 2,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          ...(p < c ? { right: `calc(${100 - p}% + 10px)` } : { left: `calc(${p}% + 10px)` }),
        }}
      >
        {fmt.p100(valor)}
      </span>
    </div>
  )
}

/** Pirámide: % de cada sexo por rango (hombres a la izquierda, mujeres a la derecha) */
export function Piramide({ filas }: { filas: { rango: string; h: number | null; m: number | null }[] }) {
  const max = Math.max(...filas.flatMap((f) => [f.h ?? 0, f.m ?? 0]), 1)
  const ancho = (v: number | null) => `${((v ?? 0) / max) * 72}%`
  const etiqueta = { fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' as const }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        <span style={{ textAlign: 'right' }}>Hombres</span>
        <span />
        <span>Mujeres</span>
      </div>
      {filas.map((f) => (
        <div
          key={f.rango}
          style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr', alignItems: 'center', height: 26 }}
          title={`${f.rango}: hombres ${fmt.pct(f.h)}, mujeres ${fmt.pct(f.m)}`}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <span style={etiqueta}>{fmt.pct(f.h)}</span>
            <div style={{ width: ancho(f.h), height: 16, background: C.hombre, borderRadius: '4px 0 0 4px' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{f.rango}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: ancho(f.m), height: 16, background: C.mujer, borderRadius: '0 4px 4px 0' }} />
            <span style={etiqueta}>{fmt.pct(f.m)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
