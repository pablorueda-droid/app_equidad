"""Configuración del ETL. Todo es sobreescribible por variables de entorno."""

import os

BQ_PROJECT = os.getenv("BQ_PROJECT", "act-actuafast")
BQ_DATASET = os.getenv("BQ_DATASET", "actuafastv2")
VIEW_ESTUDIOS = f"{BQ_PROJECT}.{BQ_DATASET}.estudios_actuariales"
TBL_BALANCES = f"{BQ_PROJECT}.{BQ_DATASET}.scvs_balances_anuales"
TBL_EMPRESAS = f"{BQ_PROJECT}.{BQ_DATASET}.scvs_empresas"

ANIO_INICIAL = int(os.getenv("ANIO_INICIAL", "2018"))

# Destino de las salidas: carpeta local o prefijo gs://bucket/ruta
OUTPUT_URI = os.getenv("OUTPUT_URI", "out")
# Guarda además el detalle por empleado (contiene RUC: solo en almacenamiento privado)
GUARDAR_DETALLE = os.getenv("GUARDAR_DETALLE", "false").lower() == "true"

# Token que debe enviar quien dispare POST /etl/run (Cloud Scheduler). Sin token -> endpoint deshabilitado.
ETL_TOKEN = os.getenv("ETL_TOKEN", "")
# Orígenes permitidos para consumir la API desde el navegador (separados por coma)
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

# Protección de datos en el dashboard público
MIN_EMPRESAS = int(os.getenv("MIN_EMPRESAS", "3"))  # celdas con menos empresas se suprimen
MIN_PERSONAS = int(os.getenv("MIN_PERSONAS", "10"))  # remuneraciones por sexo con menos personas se suprimen

# Sectores con 30 o menos RUCs únicos (en todo el periodo) se excluyen
MIN_RUCS_SECTOR = int(os.getenv("MIN_RUCS_SECTOR", "30"))

# Salario Básico Unificado por año (USD). ACTUALIZAR cada año: los años sin SBU se excluyen del proceso.
SBU_POR_ANIO = {
    2018: 386,
    2019: 394,
    2020: 400,
    2021: 400,
    2022: 425,
    2023: 450,
    2024: 460,
    2025: 470,
    2026: 482,
}

DESCRIPCION_CIIU = {
    "A": "AGRICULTURA, GANADERÍA, SILVICULTURA Y PESCA",
    "B": "EXPLOTACIÓN DE MINAS Y CANTERAS",
    "C": "INDUSTRIAS MANUFACTURERAS",
    "D": "SUMINISTRO DE ELECTRICIDAD, GAS, VAPOR Y AIRE ACONDICIONADO",
    "E": "SUMINISTRO DE AGUA; ALCANTARILLADO, GESTIÓN DE DESECHOS Y ACTIVIDADES DE SANEAMIENTO",
    "F": "CONSTRUCCIÓN",
    "G": "COMERCIO AL POR MAYOR Y AL POR MENOR; REPARACIÓN DE VEHÍCULOS DE MOTOR Y MOTOCICLETAS",
    "H": "TRANSPORTE Y ALMACENAMIENTO",
    "I": "ALOJAMIENTO Y SERVICIOS DE COMIDA",
    "J": "INFORMACIÓN Y COMUNICACIONES",
    "K": "ACTIVIDADES FINANCIERAS Y DE SEGUROS",
    "L": "ACTIVIDADES INMOBILIARIAS",
    "M": "ACTIVIDADES PROFESIONALES, CIENTÍFICAS Y TÉCNICAS",
    "N": "ACTIVIDADES ADMINISTRATIVAS Y SERVICIOS DE APOYO",
    "O": "ADMINISTRACIÓN PÚBLICA Y DEFENSA; PLANES DE SEGURIDAD SOCIAL DE AFILIACIÓN OBLIGATORIA",
    "P": "ENSEÑANZA",
    "Q": "ACTIVIDADES DE ATENCIÓN DE LA SALUD HUMANA Y DE ASISTENCIA SOCIAL",
    "R": "ARTES, ENTRETENIMIENTO Y RECREACIÓN",
    "S": "OTRAS ACTIVIDADES DE SERVICIOS",
    "T": "ACTIVIDADES DE LOS HOGARES COMO EMPLEADORES",
    "U": "ACTIVIDADES DE ORGANIZACIONES Y ÓRGANOS EXTRATERRITORIALES",
}

# Nombres cortos para el público (antes industrias_resumido.xlsx)
SECTOR_CORTO = {
    "A": "Agricultura y pesca",
    "B": "Minas y canteras",
    "C": "Manufactura",
    "D": "Electricidad y gas",
    "E": "Agua y saneamiento",
    "F": "Construcción",
    "G": "Comercio",
    "H": "Transporte",
    "I": "Alojamiento y comida",
    "J": "Información y comunicación",
    "K": "Finanzas y seguros",
    "L": "Inmobiliarias",
    "M": "Profesionales y científicas",
    "N": "Servicios administrativos",
    "O": "Administración pública",
    "P": "Enseñanza",
    "Q": "Salud",
    "R": "Artes y entretenimiento",
    "S": "Otros servicios",
    "T": "Hogares",
    "U": "Org. extraterritoriales",
}

# Palabras clave (sin tildes, minúsculas) para clasificar el nivel jerárquico del cargo.
# Se evalúan en orden: operativo, táctico, estratégico (la primera coincidencia gana).
NIVEL_OPERATIVO = ["operador", "asistente", "tecnico", "auxiliar", "bodeguero", "analista", "junior"]
NIVEL_TACTICO = ["supervisor", "jefe", "coordinador", "lider", "senior"]
NIVEL_ESTRATEGICO = ["director", "gerente", "vicepresidente", "presidente", "ceo", "cfo", "cmo"]

NIVELES = ["Operativo", "Táctico", "Estratégico"]
TAMANOS = ["Microempresa", "Pequeña", "Mediana", "Grande"]

RANGOS_EDAD = [  # (etiqueta, desde, hasta)
    ("18 a 24", 18, 24), ("25 a 29", 25, 29), ("30 a 34", 30, 34), ("35 a 39", 35, 39),
    ("40 a 44", 40, 44), ("45 a 49", 45, 49), ("50 a 54", 50, 54), ("55 a 59", 55, 59),
    ("60 +", 60, 200),
]
RANGOS_ANTIGUEDAD = [  # años de servicio (ts_desahucio)
    ("Menos de 1", 0, 1), ("1 a 4", 1, 5), ("5 a 9", 5, 10), ("10 a 14", 10, 15),
    ("15 a 24", 15, 25), ("25 o más", 25, 200),
]
