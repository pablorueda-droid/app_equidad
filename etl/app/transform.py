"""Transformaciones de negocio sobre la base por empleado (vectorizadas)."""

import re
import unicodedata

import numpy as np
import pandas as pd

from . import config

_SEGMENTO_A_TAMANO = {
    "MICROEMPRESA": "Microempresa", "MICRO": "Microempresa",
    "PEQUEÑA": "Pequeña", "PEQUENA": "Pequeña",
    "MEDIANA": "Mediana",
    "GRANDE": "Grande",
}


def _sin_tildes(serie: pd.Series) -> pd.Series:
    def norm(txt: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFKD", txt) if not unicodedata.combining(c))

    unicos = serie.astype(str).str.lower().unique()
    mapa = {u: norm(u) for u in unicos}
    return serie.astype(str).str.lower().map(mapa)


def asignar_sector(df: pd.DataFrame) -> pd.DataFrame:
    """Sector = letra CIIU nivel 1. Se descartan registros sin CIIU válido."""
    df = df[df["ciiu_n1"].isin(config.DESCRIPCION_CIIU.keys())].copy()
    df = df.rename(columns={"ciiu_n1": "sector"})
    print(f"  Tras asignar sector CIIU: {len(df):,}")
    return df


def clasificar_tamano(df: pd.DataFrame) -> pd.DataFrame:
    """Tamaño oficial SCVS (segmento); si no existe, por número de empleados del estudio."""
    n = df.groupby(["rucced", "anio"])["rucced"].transform("size")
    por_conteo = np.select(
        [n <= 10, n <= 50, n <= 200], ["Microempresa", "Pequeña", "Mediana"], default="Grande"
    )
    oficial = df["segmento"].map(_SEGMENTO_A_TAMANO)
    df["tamano"] = oficial.fillna(pd.Series(por_conteo, index=df.index))
    df["tamano_fuente"] = np.where(oficial.notna(), "scvs", "conteo")
    return df


def _rangos(valores: pd.Series, rangos) -> pd.Series:
    bordes = [r[1] for r in rangos] + [rangos[-1][2] + 1]
    etiquetas = [r[0] for r in rangos]
    return pd.cut(valores, bins=bordes, labels=etiquetas, right=False).astype(str)


def asignar_rangos(df: pd.DataFrame) -> pd.DataFrame:
    df["rango_edad"] = _rangos(df["edad"], config.RANGOS_EDAD)
    df["rango_antiguedad"] = _rangos(df["ts_desahucio"], config.RANGOS_ANTIGUEDAD)
    return df


def calcular_nivel_cargo(df: pd.DataFrame) -> pd.DataFrame:
    """
    1) Percentiles de remuneración dentro de (sector, tamaño, año):
       <=P55 Operativo, <=P95 Táctico, resto Estratégico.
    2) Las palabras clave del cargo sobrescriben al percentil cuando coinciden.
    """
    grupo = df.groupby(["sector", "tamano", "anio"])["remuneracion"]
    p55 = grupo.transform(lambda s: s.quantile(0.55))
    p95 = grupo.transform(lambda s: s.quantile(0.95))
    nivel = np.select(
        [df["remuneracion"] <= p55, df["remuneracion"] <= p95],
        ["Operativo", "Táctico"], default="Estratégico",
    )
    df["nivel_cargo"] = nivel

    cargo = _sin_tildes(df["cargo"])
    por_palabra = pd.Series(pd.NA, index=df.index, dtype="object")
    # Orden inverso para que la primera lista (operativo) tenga prioridad, como en la lógica original
    for etiqueta, palabras in [
        ("Estratégico", config.NIVEL_ESTRATEGICO),
        ("Táctico", config.NIVEL_TACTICO),
        ("Operativo", config.NIVEL_OPERATIVO),
    ]:
        patron = "|".join(re.escape(p) for p in palabras)
        por_palabra = por_palabra.mask(cargo.str.contains(patron, regex=True), etiqueta)
    df["nivel_fuente"] = np.where(por_palabra.notna(), "cargo", "percentil")
    df["nivel_cargo"] = por_palabra.fillna(df["nivel_cargo"])
    return df


def asignar_provincia(df: pd.DataFrame) -> pd.DataFrame:
    df["provincia"] = (
        df["provincia"].fillna("").str.strip().str.title()
        .replace({"": "Sin información", "Santo Domingo De Los Tsachilas": "Santo Domingo de los Tsáchilas",
                  "Galapagos": "Galápagos", "Manabi": "Manabí", "Bolivar": "Bolívar",
                  "Sucumbios": "Sucumbíos", "Los Rios": "Los Ríos", "Cañar": "Cañar"})
    )
    return df


def remover_sectores(df: pd.DataFrame) -> pd.DataFrame:
    """Elimina sectores con MIN_RUCS_SECTOR o menos RUCs únicos en todo el periodo."""
    conteo = df.groupby("sector")["rucced"].nunique()
    mantener = conteo[conteo > config.MIN_RUCS_SECTOR].index
    excluidos = sorted(set(conteo.index) - set(mantener))
    if excluidos:
        print(f"  Sectores excluidos por baja representación: {excluidos}")
    df = df[df["sector"].isin(mantener)]
    print(f"  Tras remover sectores poco representados: {len(df):,}")
    return df


def transformar(df: pd.DataFrame) -> pd.DataFrame:
    df["remuneracion"] = df["remuneracion"].astype(float).round(2)
    df["ts_desahucio"] = df["ts_desahucio"].astype(float)
    df["anio"] = df["anio"].astype(int)
    df = asignar_sector(df)
    df = clasificar_tamano(df)
    df = asignar_rangos(df)
    df = calcular_nivel_cargo(df)
    df = asignar_provincia(df)
    df = remover_sectores(df)
    columnas = [
        "anio", "rucced", "sexo_persona", "remuneracion", "edad", "ts_desahucio",
        "sector", "tamano", "tamano_fuente", "nivel_cargo", "nivel_fuente",
        "rango_edad", "rango_antiguedad", "provincia",
    ]
    return df[columnas].reset_index(drop=True)
