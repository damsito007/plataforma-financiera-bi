from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import HistorialArchivo, TransaccionProcesada
from sqlalchemy import func
from database import SessionLocal

router = APIRouter(prefix="/api/historial", tags=["Historial y Gestión de Archivos"])

# 1. Obtener la lista de archivos subidos (Filtrable opcionalmente por carpeta_id)
@router.get("/")
def listar_historial(carpeta_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(HistorialArchivo)
    
    if carpeta_id is not None:
        query = query.filter(HistorialArchivo.carpeta_id == carpeta_id)
        
    archivos = query.order_by(HistorialArchivo.fecha_subida.desc()).all()
    return archivos

# 2. Obtener el resumen analítico de un archivo específico por su ID
@router.get("/{archivo_id}")
def obtener_detalle_archivo(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(HistorialArchivo).filter(HistorialArchivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="El archivo solicitado no existe.")
    return archivo

# 3. Eliminar un archivo y todas sus transacciones asociadas en Supabase (Cascada)
@router.delete("/{archivo_id}")
def eliminar_archivo(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(HistorialArchivo).filter(HistorialArchivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="El registro del archivo no fue encontrado.")

    try:
        # Eliminar las transacciones asociadas al archivo
        db.query(TransaccionProcesada).filter(TransaccionProcesada.archivo_id == archivo_id).delete()
        
        # Eliminar el registro del historial
        db.delete(archivo)
        db.commit()
        return {"mensaje": f"El archivo '{archivo.nombre_archivo}' y sus registros asociados fueron eliminados con éxito."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar el registro: {str(e)}")

        router = APIRouter(prefix="/api/analytics", tags=["Analítica BI"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


