"""Construcción del JSON público que consume el dashboard.

Se precalculan los indicadores para TODAS las combinaciones de filtros del dashboard
(año x sector x tamaño x nivel, donde cada filtro puede ser "*" = todos). Así el
navegador nunca recibe microdatos y las medianas/cuartiles son exactos.

Clave de cada combinación: "anio|sector|tamano|nivel"  (ej. "2025|C|*|*").

Por combinación:
  emp      nº de empresas
  n        [hombres, mujeres]
  media    [remuneración media H, M]
  mediana  [remuneración mediana H, M]
  aj       índice de equidad ajustado (mujer/hombre comparando misma
           combinación sector x tamaño x nivel x rango de edad)
  q        % de mujeres en cada cuartil salarial (Q1 más bajo ... Q4 más alto)
  edad / antig / prov  desglose alineado con dims: [nH, nM, mediaH, mediaM] o null

Protección de datos: se omite toda celda con menos de MIN_EMPRESAS empresas y
se anula la remuneración de un sexo con menos de MIN_PERSONAS personas.
"""

from datetime import datetime, timezone
from itertools import combinations

import numpy as np
import pandas as pd

from . import config

FILTROS = ["sector", "tamano", "nivel_cargo"]
DESGLOSES = {"edad": "rango_edad", "antig": "rango_antiguedad", "prov": "provincia"}
TODOS = "*"


def _r(x, nd=0):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), nd) if nd else int(round(float(x)))


def _clave(fila: dict, subset) -> str:
    partes = [str(fila["anio"])] + [str(fila[f]) if f in subset else TODOS for f in FILTROS]
    return "|".join(partes)


def _stats_por_sexo(df, claves):
    """n, media y mediana por sexo -> columnas *_M / *_F."""
    g = df.groupby(claves + ["sexo_persona"], observed=True)["remuneracion"].agg(
        n="size", media="mean", mediana="median"
    )
    g = g.unstack("sexo_persona")
    g.columns = [f"{a}_{b}" for a, b in g.columns]
    for col in ["n_M", "n_F"]:
        if col not in g:
            g[col] = 0
    g[["n_M", "n_F"]] = g[["n_M", "n_F"]].fillna(0)
    return g


def _par(fila, campo, nd=0):
    """[H, M] aplicando la supresión por número de personas."""
    out = []
    for s in ("M", "F"):
        n = fila.get(f"n_{s}", 0) or 0
        v = fila.get(f"{campo}_{s}")
        out.append(_r(v, nd) if n >= config.MIN_PERSONAS else None)
    return out


def _celda_desglose(fila, emp):
    if emp < config.MIN_EMPRESAS:
        return None
    n = [int(fila.get("n_M", 0) or 0), int(fila.get("n_F", 0) or 0)]
    return n + _par(fila, "media")


def construir_dashboard(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["es_mujer"] = (df["sexo_persona"] == "F").astype(np.int8)

    dims = {
        "anios": sorted(int(a) for a in df["anio"].unique()),
        "sectores": [
            {"id": s, "nombre": config.SECTOR_CORTO.get(s, s), "descripcion": config.DESCRIPCION_CIIU.get(s, s)}
            for s in sorted(df["sector"].unique())
        ],
        "tamanos": [t for t in config.TAMANOS if t in set(df["tamano"])],
        "niveles": [n for n in config.NIVELES if n in set(df["nivel_cargo"])],
        "edad": [r[0] for r in config.RANGOS_EDAD],
        "antig": [r[0] for r in config.RANGOS_ANTIGUEDAD],
        "prov": (
            df[df["provincia"] != "Sin información"]["provincia"].value_counts().index.tolist()
            + (["Sin información"] if (df["provincia"] == "Sin información").any() else [])
        ),
    }
    pos = {k: {v: i for i, v in enumerate(dims[k])} for k in ("edad", "antig", "prov")}

    # Base fina para el índice ajustado: medias por sexo en celdas homogéneas
    fino_claves = ["anio"] + FILTROS + ["rango_edad"]
    fino = _stats_por_sexo(df, fino_claves).reset_index()
    fino = fino[(fino["n_M"] >= 1) & (fino["n_F"] >= 1)].copy()
    fino["w"] = fino["n_M"] + fino["n_F"]
    fino["wF"] = fino["w"] * fino["media_F"]
    fino["wM"] = fino["w"] * fino["media_M"]

    datos: dict[str, dict] = {}
    for k in range(len(FILTROS) + 1):
        for subset in combinations(FILTROS, k):
            claves = ["anio"] + list(subset)

            base = _stats_por_sexo(df, claves)
            base["emp"] = df.groupby(claves, observed=True)["rucced"].nunique()

            aj = fino.groupby(claves)[["wF", "wM"]].sum()
            base["aj"] = aj["wF"] / aj["wM"]

            # Cuartiles salariales dentro de cada combinación
            pct = df.groupby(claves, observed=True)["remuneracion"].rank(pct=True, method="average")
            cuartil = np.clip(np.ceil(pct * 4), 1, 4).astype(int)
            q = df.assign(cuartil=cuartil).groupby(claves + ["cuartil"], observed=True)["es_mujer"].mean()
            q = q.unstack("cuartil")

            for fila in base.reset_index().to_dict("records"):
                emp = int(fila["emp"])
                if emp < config.MIN_EMPRESAS:
                    continue
                clave = _clave(fila, subset)
                idx = tuple(fila[c] for c in claves) if len(claves) > 1 else fila["anio"]
                cuartiles = q.loc[idx] if idx in q.index else None
                datos[clave] = {
                    "emp": emp,
                    "n": [int(fila["n_M"]), int(fila["n_F"])],
                    "media": _par(fila, "media"),
                    "mediana": _par(fila, "mediana"),
                    "aj": _r(fila.get("aj"), 4),
                    "q": [_r(cuartiles.get(i), 4) for i in (1, 2, 3, 4)] if cuartiles is not None else None,
                }

            for nombre, col in DESGLOSES.items():
                g = _stats_por_sexo(df, claves + [col])
                g["emp"] = df.groupby(claves + [col], observed=True)["rucced"].nunique()
                for fila in g.reset_index().to_dict("records"):
                    clave = _clave(fila, subset)
                    if clave not in datos:
                        continue
                    arr = datos[clave].setdefault(nombre, [None] * len(dims[nombre]))
                    i = pos[nombre].get(fila[col])
                    if i is not None:
                        arr[i] = _celda_desglose(fila, int(fila["emp"]))

    meta = {
        "titulo": "ACTUAR por la Equidad",
        "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fuente": "Información laboral de empresas privadas del Ecuador + Superintendencia de Compañías (SCVS)",
        "registros": int(len(df)),
        "empresas": int(df["rucced"].nunique()),
        "sbu": {str(a): v for a, v in config.SBU_POR_ANIO.items() if a in dims["anios"]},
        "min_empresas": config.MIN_EMPRESAS,
        "min_personas": config.MIN_PERSONAS,
        "calidad": {
            "pct_tamano_scvs": _r(df["tamano_fuente"].eq("scvs").mean(), 4),
            "pct_nivel_por_cargo": _r(df["nivel_fuente"].eq("cargo").mean(), 4),
        },
    }
    return {"meta": meta, "dims": dims, "datos": datos}
