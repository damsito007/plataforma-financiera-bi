from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import os, shutil
from database import get_db
from models import HistorialArchivo, TransaccionProcesada
from services import procesar_archivo_empresarial

router = APIRouter(prefix="/api/admin", tags=["Administrador"])

@router.post("/upload-excel")
async def cargar_archivo(
    file: UploadFile = File(...),
    sector: str = Form("Telecomunicaciones"), # "Telecomunicaciones", "Arrocera", "Cerveceria"
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato no soportado. Formatos válidos: .xlsx, .xls, .csv")

    temp_folder = "temp_files"
    os.makedirs(temp_folder, exist_ok=True)
    temp_path = os.path.join(temp_folder, file.filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        df, resumen = procesar_archivo_empresarial(temp_path, sector)

        nuevo_historial = HistorialArchivo(
            nombre_archivo=file.filename,
            sector=sector,
            usuario_id=1,
            total_registros=resumen["total_registros"],
            total_anomalias=resumen["total_anomalias"],
            total_debito=resumen["total_debito"],
            total_credito=resumen["total_credito"]
        )
        db.add(nuevo_historial)
        db.commit()
        db.refresh(nuevo_historial)

        registros = [
            TransaccionProcesada(
                archivo_id=nuevo_historial.id,
                sector=sector,
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
            "mensaje": f"Archivo '{file.filename}' del sector '{sector}' procesado e inyectado con éxito.",
            "resumen": resumen,
            "historial_id": nuevo_historial.id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la ingesta: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)