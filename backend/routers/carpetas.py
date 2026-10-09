from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import os, shutil
import pandas as pd
from database import get_db
from models import CarpetaProyecto, HistorialArchivo, TransaccionProcesada
from services import procesar_archivo_empresarial

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
            carpeta_id=carpeta.id
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

