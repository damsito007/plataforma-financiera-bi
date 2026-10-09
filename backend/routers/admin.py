from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from services import procesar_archivo_empresarial

router = APIRouter(
    prefix="/api/admin",
    tags=["Administrador"]
)


@router.post("/upload-excel")
async def cargar_archivo(
    file: UploadFile = File(...),
    sector: str = Form("Telecomunicaciones"),
    carpeta_id: int = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Formatos válidos: .xlsx, .xls, .csv"
        )

    try:
        resultado = procesar_archivo_empresarial(
            file=file,
            sector=sector,
            db=db,
            carpeta_id=carpeta_id
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