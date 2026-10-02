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

# 4. Procesar e inyectar un archivo en una carpeta específica
@router.post("/{carpeta_id}/upload")
async def cargar_archivo_en_carpeta(
    carpeta_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    carpeta = db.query(CarpetaProyecto).filter(CarpetaProyecto.id == carpeta_id).first()
    if not carpeta:
        raise HTTPException(status_code=404, detail="La carpeta especificada no existe.")

    temp_folder = "temp_files"
    os.makedirs(temp_folder, exist_ok=True)
    temp_path = os.path.join(temp_folder, file.filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Ejecutar el servicio de ML con el sector de la carpeta
        df, resumen = procesar_archivo_empresarial(temp_path, carpeta.sector)

        # Crear el registro del archivo
        nuevo_historial = HistorialArchivo(
            carpeta_id=carpeta.id,
            nombre_archivo=file.filename,
            total_registros=resumen["total_registros"],
            total_anomalias=resumen["total_anomalias"],
            total_debito=resumen["total_debito"],
            total_credito=resumen["total_credito"]
        )
        db.add(nuevo_historial)
        db.commit()
        db.refresh(nuevo_historial)

        # Inyectar las transacciones procesadas
        registros = [
            TransaccionProcesada(
                archivo_id=nuevo_historial.id,
                carpeta_id=carpeta.id,
                sector=carpeta.sector,
                fecha=str(row.get('fecha', '')),
                codigo_cuenta=str(row.get('cuenta', '')),
                cuenta=str(row.get('cuenta', '')),
                proveedor_o_cliente=str(row.get('proveedor_o_cliente', '')),
                descripcion=str(row.get('descripcion', '')),
                debito=float(row.get('debito', 0.0)),
                credito=float(row.get('credito', 0.0)),
                monto_abs=float(row.get('monto_abs', 0.0)),
                es_anomalia=bool(row.get('es_anomalia', False)),
                puntuacion_anomalia=float(row.get('puntuacion_anomalia', 0.0)),
                nivel_riesgo=str(row.get('nivel_riesgo', 'Bajo')),
                z_score_monto=float(row.get('z_score_monto', 0.0)),
                tipo_movimiento=str(row.get('tipo_movimiento', 'Débito'))
            )
            for _, row in df.iterrows()
        ]

        db.bulk_save_objects(registros)
        db.commit()

        return {
            "mensaje": f"Archivo '{file.filename}' procesado e inyectado con éxito en la carpeta '{carpeta.nombre}'.",
            "resumen": resumen,
            "historial_id": nuevo_historial.id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la ingesta: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)