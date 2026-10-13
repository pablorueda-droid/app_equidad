# Análisis de métricas: qué se conserva, qué se corrige y qué se agrega

Revisión del dashboard Power BI `actuar_por_la_equidad_new.pbix` (2 páginas, 11 visuales) frente a los datos disponibles en BigQuery (`estudios_actuariales` + SCVS). Las cifras de ejemplo son de 2025, sin filtros.

## 1. Hallazgo crítico: el "Índice de equidad salarial" de Power BI no mide la brecha

La medida DAX era:

```
INDICADOR_BRECHA = DIVIDE(AVERAGE(agrupado[rem_mujeres]), AVERAGE(agrupado[rem_hombres]))
```

sobre `agrupado_sectores_hs`, que **concatena** filas de hombres y de mujeres rellenando con `0` la columna del otro sexo. Por eso:

- promedia ceros: cada fila de hombres aporta un 0 al promedio de mujeres y viceversa;
- es un promedio simple de celdas (sector × nivel × tamaño × año): una celda con 3 personas pesa igual que una con 50.000.

| 2025 | Power BI | Razón real de medias | Razón de medianas |
|---|---|---|---|
| Total | 0,916 | 1,030 | 1,010 |
| Construcción | 0,948 | 1,212 | 1,131 |
| Finanzas y seguros | 0,848 | 0,883 | 0,936 |
| Enseñanza | 1,075 | 0,929 | 0,975 |

El índice publicado podía mostrar brechas que no existen, o en sentido contrario (Enseñanza). El análisis EKOS de 2022 citaba valores de 0,26 en minería y de 1,72 en enseñanza que vienen de este mismo cálculo.

**Corrección:** la brecha se calcula sobre los microdatos para cada combinación de filtros y se publica en dos versiones:

- **Brecha simple**: mediana (o promedio) de mujeres ÷ la de hombres, expresada como "por cada $100".
- **Brecha ajustada**: compara dentro de celdas homogéneas (sector × tamaño × nivel × rango de edad) y las combina ponderando por el número de personas de cada celda. Aísla la diferencia que no se explica por la composición.

## 2. Métricas del Power BI

| Métrica Power BI | Decisión | Motivo |
|---|---|---|
| Participación de mujeres (gauge) | **Conservar, otra forma** | Es clave. Un gauge de 0–100 % no tiene una referencia útil: pasa a una cifra destacada con su variación anual y a una línea de tendencia con la referencia de paridad (50 %). |
| Texto desplazable por año | **Eliminar** | Dificulta la lectura y no es accesible. Se sustituye por la línea de tendencia. |
| % mujeres/hombres por tamaño (100 % apilado) | **Conservar** | Se integra con la brecha en una misma fila por tamaño. |
| Remuneración promedio por nivel jerárquico (barras, **suma**) | **Corregir** | Según la definición exportada del .pbix, el visual usa `Sum(remuneracion)`, no el promedio, a pesar del título. Pasa a mediana o promedio, junto con la brecha por nivel. |
| Pirámide por rango de edad (tornado) | **Conservar** | Se muestra el % de cada sexo, no el conteo absoluto, para que la forma sea comparable. |
| % mujeres/hombres por nivel jerárquico | **Conservar y reforzar** | Es la base del "techo de cristal"; se complementa con los cuartiles salariales. |
| Participación por industria + línea `Igualdad = 0.5` | **Corregir** | Usaba dos ejes y una columna calculada constante. Pasa a filas ordenadas con la participación y la brecha en escalas propias. |
| Remuneración promedio por tamaño (barras, **suma**) | **Corregir** | Mismo problema de `Sum`. |
| Índice de equidad (tarjeta, línea por nivel, columnas por industria y tamaño) | **Recalcular** | Ver sección 1. |
| Cantidad de empresas (tarjeta con `Min(rucced)`) | **Corregir** | La definición exportada usa `Min(rucced)`, que no es un conteo. Pasa a conteo distinto de empresas. |

## 3. Métricas nuevas (con datos ya disponibles)

| Métrica | Fuente | Por qué aporta |
|---|---|---|
| **Brecha ajustada** | microdatos | Separa la "discriminación" de la composición; es el estándar internacional (OIT/OCDE). |
| **Mujeres por cuartil salarial** | microdatos | Muestra el techo de cristal sin depender de la clasificación de cargos. Ejemplo (Finanzas 2025): las mujeres son el 57 % del total pero el 52 % del cuartil mejor pagado. |
| **Mujeres en cargos estratégicos** | nivel de cargo | Indicador ODS 5.5.2 (proporción de mujeres en cargos directivos). |
| **Sueldo por edad** | edad | Muestra que la ventaja de las mujeres jóvenes se revierte desde los 55 años (ya lo señalaba el análisis EKOS). |
| **Sueldo y participación por antigüedad** | `ts_desahucio` | Trayectoria y permanencia de las mujeres en la empresa. |
| **Provincia** | `scvs_empresas.provincia` | Dimensión territorial nueva (25 provincias). |
| **Tamaño oficial SCVS** | `scvs_balances_anuales.segmento` | Sustituye al tamaño estimado por el número de empleados del estudio; es la clasificación que el público reconoce. |
| **Mediana además del promedio** | microdatos | Los sueldos gerenciales distorsionan el promedio; la mediana es más representativa. |

## 4. Mejoras de comunicación para público general

- Un titular en lenguaje llano: "por cada $100 que gana un hombre, una mujer gana $X".
- Las secciones responden preguntas ("¿Llegan las mujeres a los puestos más altos?").
- Un solo eje por gráfico (se eliminan los ejes duales) y referencias explícitas (paridad 50 %, igualdad $100).
- Una paleta validada para daltonismo: violeta para mujeres y verde azulado para hombres. La combinación morado/azul de Power BI fallaba la prueba de daltonismo (ΔE 2,8).
- Cada gráfico tiene vista de tabla y descarga CSV (accesibilidad y transparencia).
- Los filtros se reflejan en la URL, así que una vista concreta se puede compartir.
- Sección de metodología, limitaciones y privacidad.

## 5. Posibles extensiones (requieren validación)

- **Región Costa / Sierra / Amazonía** a partir de la provincia.
- **Sueldo base (`sueldo`) frente a la remuneración total**, para separar componentes variables.
- **Panel de empresas constantes** para comparar años con las mismas empresas (hoy la muestra cambia cada año).
- **Clasificación de cargos con un modelo de texto** en lugar de palabras clave: hoy solo el 23 % de los registros se clasifica por cargo y el resto por percentil de sueldo, lo que es parcialmente circular al medir la brecha por nivel.
