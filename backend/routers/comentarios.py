from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import ComentarioGrafico

router = APIRouter(prefix="/api/comentarios", tags=["Comentarios de Auditoría"])

class ComentarioCreate(BaseModel):
    grafico_id: str
    carpeta_id: Optional[int] = None
    usuario_id: int
    texto: str
    parent_id: Optional[int] = None  # Para respuestas en hilo

@router.get("/{grafico_id}")
def obtener_comentarios_grafico(grafico_id: str, carpeta_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ComentarioGrafico).filter(
        ComentarioGrafico.grafico_id == grafico_id,
        ComentarioGrafico.parent_id == None
    )
    if carpeta_id:
        query = query.filter(ComentarioGrafico.carpeta_id == carpeta_id)

    return query.order_by(ComentarioGrafico.fecha_creacion.desc()).all()

@router.post("/")
def crear_comentario(datos: ComentarioCreate, db: Session = Depends(get_db)):
    nuevo_comentario = ComentarioGrafico(
        grafico_id=datos.grafico_id,
        carpeta_id=datos.carpeta_id,
        usuario_id=datos.usuario_id,
        texto=datos.texto,
        parent_id=datos.parent_id,
        estado="abierto"
    )
    db.add(nuevo_comentario)
    db.commit()
    db.refresh(nuevo_comentario)
    return {"mensaje": "Observación creada exitosamente", "comentario": nuevo_comentario}

@router.patch("/{comentario_id}/resolver")
def resolver_comentario(comentario_id: int, db: Session = Depends(get_db)):
    comentario = db.query(ComentarioGrafico).filter(ComentarioGrafico.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    comentario.estado = "resuelto"
    db.commit()
    return {"mensaje": "La observación ha sido marcada como resuelta."}