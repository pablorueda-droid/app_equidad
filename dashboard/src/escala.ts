// Marcas "redondas" del eje Y (mismo criterio que el prototipo v3: ~4 intervalos de 1, 2, 2,5, 5 o 10)

export function pasoRedondo(bruto: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)))
  const r = bruto / mag
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag
}

export function marcas(lo: number, hi: number) {
  const paso = pasoRedondo((hi - lo) / 4)
  const out: number[] = []
  for (let t = Math.ceil(lo / paso) * paso; t <= hi + 1e-9; t += paso) out.push(Math.round(t * 1000) / 1000)
  return out
}

/** Dominio y marcas a partir de los datos (si no se fija un dominio) */
export function escala(valores: number[], dominio?: [number, number]): { dominio: [number, number]; marcas: number[] } {
  if (dominio) return { dominio, marcas: marcas(dominio[0], dominio[1]) }
  if (!valores.length) return { dominio: [0, 1], marcas: [0, 1] }
  const mn = Math.min(...valores)
  const mx = Math.max(...valores)
  const paso = pasoRedondo((mx - mn) / 4 || 1)
  const lo = Math.floor(mn / paso) * paso
  let hi = Math.ceil(mx / paso) * paso
  if (hi === lo) hi = lo + paso
  return { dominio: [lo, hi], marcas: marcas(lo, hi) }
}
