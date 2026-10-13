"""Pruebas del ETL con datos sintéticos (no requieren BigQuery)."""

import json

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import config, indicators, pipeline, storage, transform


def _base_sintetica(n=6000, seed=1):
    rng = np.random.default_rng(seed)
    rucs = [f"{i:013d}" for i in range(40)]
    df = pd.DataFrame({
        "rucced": rng.choice(rucs, n),
        "sexo_persona": rng.choice(["M", "F"], n, p=[0.6, 0.4]),
        "cargo": rng.choice(["Asistente contable", "JEFE DE PLANTA", "Gerente General", "Obrero", "TECNICO"], n),
        "remuneracion": rng.lognormal(7, 0.5, n).round(2) + 470,
        "edad": rng.integers(18, 70, n),
        "ts_desahucio": rng.uniform(0, 30, n),
        "anio": rng.choice([2024, 2025], n),
        "segmento": rng.choice(["GRANDE", "MEDIANA", None], n),
        "provincia": rng.choice(["PICHINCHA  ", "GUAYAS", None], n),
    })
    # 35 RUCs en el sector C (se conserva) y 5 en el sector Z inválido / sector P con pocos RUCs
    ciiu = {r: ("C" if i < 35 else "P") for i, r in enumerate(rucs)}
    df["ciiu_n1"] = df["rucced"].map(ciiu)
    return df


def test_transformar_reglas_negocio():
    df = transform.transformar(_base_sintetica())
    assert set(df["sector"]) == {"C"}, "sector con <=30 RUCs debe excluirse"
    assert set(df["tamano"]) <= set(config.TAMANOS)
    # Palabra clave sin tilde debe clasificar (TECNICO -> Operativo; Gerente -> Estratégico)
    assert (df.loc[df.index[df["nivel_fuente"] == "cargo"], "nivel_cargo"].isin(config.NIVELES)).all()
    gerentes = transform._sin_tildes(pd.Series(["Gerente General"]))
    assert gerentes.iloc[0] == "gerente general"
    assert set(df["rango_edad"]) <= {r[0] for r in config.RANGOS_EDAD}
    assert "Pichincha" in set(df["provincia"]) and "Sin información" in set(df["provincia"])


def test_nivel_palabra_prioridad_operativo():
    df = pd.DataFrame({
        "sector": ["C"] * 3, "tamano": ["Grande"] * 3, "anio": [2025] * 3,
        "remuneracion": [500.0, 900.0, 5000.0],
        "cargo": ["ASISTENTE DE GERENCIA", "Jefe de Bodega", "Técnico Senior"],
    })
    out = transform.calcular_nivel_cargo(df)
    assert out["nivel_cargo"].tolist() == ["Operativo", "Táctico", "Operativo"]


def test_indicadores_y_supresion():
    df = transform.transformar(_base_sintetica())
    d = indicators.construir_dashboard(df)
    total = d["datos"]["2025|C|*|*"]
    sub = df[df["anio"] == 2025]
    assert total["n"] == [int((sub.sexo_persona == "M").sum()), int((sub.sexo_persona == "F").sum())]
    assert total["media"][1] == round(sub[sub.sexo_persona == "F"].remuneracion.mean())
    assert len(total["q"]) == 4 and all(0 <= v <= 1 for v in total["q"])
    assert len(total["edad"]) == len(d["dims"]["edad"])
    # Ninguna combinación publicada con menos empresas que el mínimo
    assert all(v["emp"] >= config.MIN_EMPRESAS for v in d["datos"].values())
    # El JSON no expone RUCs
    assert "0000000000001" not in json.dumps(d)


def test_api_dashboard(tmp_path, monkeypatch):
    df = _base_sintetica()
    ruta = tmp_path / "extraccion.parquet"
    df.to_parquet(ruta)
    monkeypatch.setattr(config, "OUTPUT_URI", str(tmp_path / "out"))
    monkeypatch.setattr(config, "ETL_TOKEN", "secreto")
    pipeline.ejecutar(detalle_local=str(ruta))

    from app import main
    main._cache.update(datos=None, ts=0.0)
    c = TestClient(main.app)
    assert c.get("/healthz").json() == {"status": "ok"}
    r = c.get("/api/dashboard")
    assert r.status_code == 200 and "2025|*|*|*" in r.json()["datos"]
    assert c.post("/etl/run", headers={"X-ETL-Token": "malo"}).status_code == 403


def test_storage_local_gzip_roundtrip(tmp_path):
    storage.escribir_dashboard(str(tmp_path), {"a": 1}, "x")
    assert json.loads(storage.leer_bytes(str(tmp_path), "publico/dashboard.json")) == {"a": 1}
