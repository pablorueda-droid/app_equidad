import type { ReactNode } from 'react'
import { fmt, type Dashboard } from '../data'
import { EncabezadoSeccion } from './EncabezadoSeccion'

function Pregunta({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="faq">
      <summary>{q}</summary>
      <div className="faq-r">{children}</div>
    </details>
  )
}

/** Preguntas frecuentes: la metodología, en corto y desplegable */
export function Metodologia({ d }: { d: Dashboard }) {
  const anios = `${d.dims.anios[0]} a ${d.dims.anios[d.dims.anios.length - 1]}`
  return (
    <section className="seccion" id="metodologia">
      <EncabezadoSeccion num="?">Preguntas frecuentes</EncabezadoSeccion>
      <div className="faqs">
        <Pregunta q="¿De dónde salen estos datos?">
          De la información laboral de {fmt.n(d.meta.empresas)} empresas privadas del Ecuador entre {anios}, con datos de la
          Superintendencia de Compañías sobre su actividad, tamaño y provincia. Solo se publican totales: nunca datos de una
          persona o empresa.
        </Pregunta>
        <Pregunta q="¿Qué significa “por cada $100”?">
          Es una forma sencilla de comparar sueldos. Si una mujer gana $90 por cada $100 que gana un hombre, gana 10 % menos.
          $100 significa igualdad.
        </Pregunta>
        <Pregunta q="¿Qué es el “sueldo típico”?">
          Es el sueldo del medio: si ordenamos a todos de menor a mayor sueldo, la mitad gana menos y la mitad gana más. A
          diferencia del promedio, no se deja llevar por unos pocos sueldos muy altos. Puedes cambiar entre ambos arriba, en
          “Comparar con”.
        </Pregunta>
        <Pregunta q="¿Qué es comparar “puestos similares”?">
          Compara a mujeres y hombres que trabajan en el mismo sector, en empresas del mismo tamaño, en el mismo nivel de
          cargo y con edad parecida. Muestra la diferencia que queda cuando ambos hacen un trabajo parecido.
        </Pregunta>
        <Pregunta q="¿Cómo se define el nivel del cargo?">
          Por el nombre del cargo (por ejemplo, “gerente” es estratégico, “jefe” es táctico y “asistente” es operativo). Si el
          nombre no lo indica, se estima según el sueldo dentro de su sector y tamaño de empresa.
        </Pregunta>
        <Pregunta q="¿A quiénes incluye?">
          A personas de 18 años o más con un sueldo igual o mayor al Salario Básico Unificado de cada año. No incluye personas
          jubiladas ni sectores con muy pocas empresas.
        </Pregunta>
        <Pregunta q="¿Qué no muestran estos datos?">
          Las empresas incluidas son sobre todo medianas y grandes del sector formal, así que no representan a toda la
          economía (por ejemplo, el trabajo informal). Además, las empresas pueden cambiar de un año a otro.
        </Pregunta>
        <Pregunta q="¿Cómo se protege la privacidad?">
          No se muestra ningún grupo con menos de {d.meta.min_empresas} empresas, ni sueldos de grupos con menos de{' '}
          {d.meta.min_personas} personas. Así ninguna empresa ni persona puede ser identificada.
        </Pregunta>
      </div>
    </section>
  )
}
