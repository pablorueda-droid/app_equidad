import { fmt, type Dashboard } from '../data'

export function Metodologia({ d }: { d: Dashboard }) {
  const sbu = Object.entries(d.meta.sbu)
    .map(([a, v]) => `${a}: $${v}`)
    .join(' · ')
  return (
    <section className="seccion" id="metodologia">
      <h2>¿Cómo leer y cómo se calculan estos datos?</h2>
      <div className="metodo">
        <div className="card">
          <h3>Brecha simple</h3>
          <p>
            Divide el sueldo mensual de las mujeres para el de los hombres y lo expresa “por cada $100”. $100 significa
            igualdad; $90 significa que las mujeres ganan 10 % menos. Puede calcularse con la <strong>mediana</strong> (el
            sueldo del medio: la mitad gana menos y la mitad más, poco afectado por sueldos extremos) o con el{' '}
            <strong>promedio</strong>.
          </p>
        </div>
        <div className="card">
          <h3>Brecha ajustada</h3>
          <p>
            Compara a mujeres y hombres que trabajan en el mismo sector, tamaño de empresa, nivel de cargo y rango de edad, y
            luego combina esas comparaciones. Así se separa la diferencia salarial de la que se explica porque mujeres y
            hombres trabajan en lugares o puestos distintos.
          </p>
        </div>
        <div className="card">
          <h3>Origen de los datos</h3>
          <ul>
            <li>Estudios actuariales de jubilación patronal y desahucio realizados por Actuaria ({fmt.n(d.meta.empresas)} empresas).</li>
            <li>Sector económico (CIIU), tamaño y provincia: Superintendencia de Compañías.</li>
            <li>Sueldo: remuneración mensual promedio usada para el cálculo del desahucio.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Depuración</h3>
          <ul>
            <li>Se excluyen jubilados, personas menores de 18 años y sueldos inferiores al Salario Básico Unificado del año ({sbu}).</li>
            <li>Se excluyen sectores con 30 empresas o menos en todo el periodo.</li>
            <li>
              Nivel de cargo: por palabras clave del cargo (p. ej. “gerente”, “jefe”, “asistente”) y, cuando no hay
              coincidencia ({fmt.pct((1 - d.meta.calidad.pct_nivel_por_cargo) * 100)} de los casos), según la posición del sueldo dentro de su sector,
              tamaño y año.
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Limitaciones</h3>
          <ul>
            <li>Refleja a empresas con estudio actuarial (principalmente medianas y grandes del sector formal); no representa a toda la economía.</li>
            <li>El nivel de cargo estimado por sueldo puede subestimar las diferencias dentro de cada nivel.</li>
            <li>Las empresas de cada año pueden variar, lo que afecta la comparación entre años.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Privacidad</h3>
          <p>
            Solo se publican cifras agregadas. Se ocultan combinaciones con menos de {d.meta.min_empresas} empresas y los
            sueldos de grupos con menos de {d.meta.min_personas} personas, para que ninguna empresa ni persona pueda ser
            identificada.
          </p>
        </div>
      </div>
    </section>
  )
}
