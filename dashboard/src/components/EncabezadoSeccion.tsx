import type { ReactNode } from 'react'

/** Encabezado editorial de sección: línea superior, número en serif cursiva y H2 serif */
export function EncabezadoSeccion({ num, children }: { num: string; children: ReactNode }) {
  return (
    <div className="sec-cabecera">
      <span className="sec-num" aria-hidden="true">
        {num}
      </span>
      <h2>{children}</h2>
    </div>
  )
}
