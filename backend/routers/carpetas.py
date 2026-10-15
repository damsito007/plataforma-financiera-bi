from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import os, shutil
import pandas as pd
from database import get_db
from models import CarpetaProyecto, HistorialArchivo, TransaccionProcesada
from services import procesar_archivo_empresarial
from typing import Optional
from sqlalchemy import text

router = APIRouter(prefix="/api/carpetas", tags=["Carpetas y Proyectos"])

# 1. Crear una nueva carpeta / cliente
@router.post("/")
def crear_carpeta(nombre: str = Form(...), sector: str = Form(...), descripcion: str = Form(""), db: Session = Depends(get_db)):
    nueva_carpeta = CarpetaProyecto(nombre=nombre, sector=sector, descripcion=descripcion, usuario_id=1)
    db.add(nueva_carpeta)
    db.commit()
    db.refresh(nueva_carpeta)
    return nueva_carpeta

# 2. Listar todas las carpetas disponibles
@router.get("/")
def listar_carpetas(db: Session = Depends(get_db)):
    return db.query(CarpetaProyecto).order_by(CarpetaProyecto.fecha_creacion.desc()).all()

# 3. Previsualizar las columnas de un Excel/CSV antes de procesarlo
@router.post("/preview-columns")
async def preview_columnas(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato no soportado (.xlsx, .xls, .csv)")
    
    # Leer solo las primeras 5 filas para rapidez
    if file.filename.endswith('.csv'):
        df = pd.read_csv(file.file, nrows=5)
    else:
        df = pd.read_excel(file.file, nrows=5)
    
    return {
        "nombre_archivo": file.filename,
        "columnas_detectadas": [str(c).strip() for c in df.columns]
    }

# ============================================================
# 4. Procesar e inyectar un archivo en una carpeta específica
# ============================================================

@router.post("/{carpeta_id}/upload")
async def cargar_archivo_en_carpeta(
    carpeta_id: int,
    file: UploadFile = File(...),
    usuario_id: int = Form(1),
    db: Session = Depends(get_db)
):
    # Verificar que la carpeta exista
    carpeta = (
        db.query(CarpetaProyecto)
        .filter(CarpetaProyecto.id == carpeta_id)
        .first()
    )

    if not carpeta:
        raise HTTPException(
            status_code=404,
            detail="La carpeta especificada no existe."
        )

    # Validar extensión
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Formatos válidos: .xlsx, .xls, .csv"
        )

    try:
        # ========================================================
        # Ejecutar TODO el pipeline
        # El servicio se encarga de:
        # - Leer Excel/CSV
        # - Normalizar datos
        # - Calcular Z-Score
        # - Ejecutar Isolation Forest
        # - Clasificar riesgo
        # - Crear HistorialArchivo
        # - Crear TransaccionProcesada
        # - Guardar en PostgreSQL
        # ========================================================

        resultado = procesar_archivo_empresarial(
            file=file,
            sector=carpeta.sector,
            db=db,
            carpeta_id=carpeta.id,
            usuario_id=usuario_id
        )

        return resultado

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Error en la ingesta: {str(e)}"
        )


@router.delete("/{carpeta_id}")
def eliminar_carpeta(carpeta_id: int, db: Session = Depends(get_db)):
    carpeta = db.query(CarpetaProyecto).filter(CarpetaProyecto.id == carpeta_id).first()
    if not carpeta:
        raise HTTPException(status_code=404, detail="La carpeta especificada no existe.")
    
    try:
        db.delete(carpeta)
        db.commit()
        return {"mensaje": f"Carpeta '{carpeta.nombre}' eliminada con éxito."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar la carpeta: {str(e)}")


# ============================================================
# 5. ANALÍTICA DE REGISTROS CONTABLES
# ============================================================

@router.get("/{carpeta_id}/analitica-registros")
def obtener_analitica_registros(
    carpeta_id: int,
    archivo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Obtiene métricas contables de una carpeta o de un archivo específico:
    - Evolución mensual.
    - Top 10 de cuentas contables.
    - Distribución por sector.
    """

    try:
        filtro_archivo = (
            "AND t.archivo_id = :archivo_id"
            if archivo_id is not None
            else ""
        )

        params = {"carpeta_id": carpeta_id}

        if archivo_id is not None:
            params["archivo_id"] = archivo_id

        # 1. EVOLUCIÓN MENSUAL
        query_evolucion = text(f"""
            SELECT
                TO_CHAR(
                    TO_TIMESTAMP(
                        TRIM(t.fecha),
                        'YYYY-MM-DD HH24:MI:SS'
                    ),
                    'YYYY-MM'
                ) AS mes,
                COUNT(*) AS total_registros,
                COUNT(
                    CASE
                        WHEN t.es_anomalia = TRUE THEN 1
                    END
                ) AS anomalias,
                SUM(COALESCE(t.monto_abs, 0)) AS monto_total
            FROM transacciones_procesadas t
            JOIN historial_archivos h
                ON t.archivo_id = h.id
            WHERE h.carpeta_id = :carpeta_id
                {filtro_archivo}
                AND TRIM(t.fecha) ~
                    '^\\d{{4}}-\\d{{2}}-\\d{{2}} \\d{{2}}:\\d{{2}}:\\d{{2}}$'
            GROUP BY mes
            ORDER BY mes ASC
        """)

        evolucion_res = db.execute(
            query_evolucion, params
        ).fetchall()

        evolucion_mensual = [
            {
                "mes": r.mes or "Sin Fecha",
                "total_registros": int(r.total_registros or 0),
                "anomalias": int(r.anomalias or 0),
                "monto_total": float(r.monto_total or 0.0)
            }
            for r in evolucion_res
        ]

        # 2. TOP 10 CUENTAS CONTABLES
        query_top_cuentas = text(f"""
            SELECT
                COALESCE(
                    NULLIF(TRIM(t.cuenta), ''),
                    NULLIF(TRIM(t.codigo_cuenta), ''),
                    'Sin Cuenta'
                ) AS cuenta,
                COUNT(*) AS total_transacciones,
                COUNT(
                    CASE
                        WHEN t.es_anomalia = TRUE THEN 1
                    END
                ) AS anomalias
            FROM transacciones_procesadas t
            JOIN historial_archivos h
                ON t.archivo_id = h.id
            WHERE h.carpeta_id = :carpeta_id
                {filtro_archivo}
            GROUP BY
                COALESCE(
                    NULLIF(TRIM(t.cuenta), ''),
                    NULLIF(TRIM(t.codigo_cuenta), ''),
                    'Sin Cuenta'
                )
            ORDER BY
                anomalias DESC,
                total_transacciones DESC
            LIMIT 10
        """)

        cuentas_res = db.execute(
            query_top_cuentas, params
        ).fetchall()

        top_cuentas = [
            {
                "cuenta": r.cuenta,
                "total_transacciones": int(r.total_transacciones or 0),
                "anomalias": int(r.anomalias or 0)
            }
            for r in cuentas_res
        ]

        # 3. DISTRIBUCIÓN POR SECTOR
        query_centros_costo = text(f"""
            SELECT
                COALESCE(
                    NULLIF(TRIM(t.sector), ''),
                    'Sin Sector'
                ) AS centro,
                COUNT(*) AS total_transacciones,
                COUNT(
                    CASE
                        WHEN t.es_anomalia = TRUE THEN 1
                    END
                ) AS anomalias,
                SUM(COALESCE(t.monto_abs, 0)) AS monto_total
            FROM transacciones_procesadas t
            JOIN historial_archivos h
                ON t.archivo_id = h.id
            WHERE h.carpeta_id = :carpeta_id
                {filtro_archivo}
            GROUP BY
                COALESCE(
                    NULLIF(TRIM(t.sector), ''),
                    'Sin Sector'
                )
            ORDER BY
                anomalias DESC,
                monto_total DESC
            LIMIT 8
        """)

        centros_res = db.execute(
            query_centros_costo, params
        ).fetchall()

        centros_costo = [
            {
                "centro": r.centro,
                "total_transacciones": int(r.total_transacciones or 0),
                "anomalias": int(r.anomalias or 0),
                "monto_total": float(r.monto_total or 0.0)
            }
            for r in centros_res
        ]

        return {
            "evolucion_mensual": evolucion_mensual,
            "top_cuentas": top_cuentas,
            "centros_costo": centros_costo
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener analítica contable: {str(e)}"
        )
