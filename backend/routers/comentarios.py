from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import ComentarioGrafico
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/api/comentarios", tags=["Comentarios de Auditoría"])

class ComentarioCreate(BaseModel):
    grafico_id: str
    carpeta_id: Optional[int] = None
    usuario_id: int
    texto: str
    parent_id: Optional[int] = None  # Para respuestas en hilo

@router.get("/{grafico_id}")
def obtener_comentarios_grafico(grafico_id: str, carpeta_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ComentarioGrafico).options(
        joinedload(ComentarioGrafico.autor),
        selectinload(ComentarioGrafico.respuestas).joinedload(ComentarioGrafico.autor)
    ).filter(
        ComentarioGrafico.grafico_id == grafico_id,
        ComentarioGrafico.parent_id == None
    )

    if carpeta_id:
        query = query.filter(ComentarioGrafico.carpeta_id == carpeta_id)

    comentarios = query.order_by(ComentarioGrafico.fecha_creacion.desc()).all()

    # Formateamos la respuesta explicitamente para devolver el nombre de usuario e hilos
    def serializar_comentario(c):
        return {
            "id": c.id,
            "grafico_id": c.grafico_id,
            "carpeta_id": c.carpeta_id,
            "usuario_id": c.usuario_id,
            "username": c.autor.username if c.autor else f"Usuario #{c.usuario_id}",
            "texto": c.texto,
            "estado": c.estado,
            "fecha_creacion": c.fecha_creacion,
            "parent_id": c.parent_id,
            "respuestas": [serializar_comentario(r) for r in c.respuestas] if c.respuestas else []
        }

    return [serializar_comentario(c) for c in comentarios]

@router.post("/")
def crear_comentario(datos: ComentarioCreate, db: Session = Depends(get_db)):
    nuevo_comentario = ComentarioGrafico(
        grafico_id=datos.grafico_id,
        carpeta_id=datos.carpeta_id,
        usuario_id=datos.usuario_id, # <--- Recibe el ID enviado
        texto=datos.texto,
        parent_id=datos.parent_id,
        estado="abierto"
    )
    db.add(nuevo_comentario)
    db.commit()
    db.refresh(nuevo_comentario)

    # Cargar la relación del autor para asegurar que se retorne el username
    comentario_con_autor = db.query(ComentarioGrafico).options(
        joinedload(ComentarioGrafico.autor)
    ).filter(ComentarioGrafico.id == nuevo_comentario.id).first()

    return {
        "mensaje": "Observación creada exitosamente",
        "comentario": {
            "id": comentario_con_autor.id,
            "grafico_id": comentario_con_autor.grafico_id,
            "carpeta_id": comentario_con_autor.carpeta_id,
            "usuario_id": comentario_con_autor.usuario_id,
            "username": comentario_con_autor.autor.username if comentario_con_autor.autor else f"Usuario #{comentario_con_autor.usuario_id}",
            "texto": comentario_con_autor.texto,
            "estado": comentario_con_autor.estado,
            "fecha_creacion": comentario_con_autor.fecha_creacion,
            "parent_id": comentario_con_autor.parent_id
        }
    }

@router.patch("/{comentario_id}/resolver")
def resolver_comentario(comentario_id: int, db: Session = Depends(get_db)):
    comentario = db.query(ComentarioGrafico).filter(ComentarioGrafico.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Observación no encontrada")

    comentario.estado = "resuelto"
    db.commit()
    return {"mensaje": "La observación ha sido marcada como resuelta."}

    # Eliminar un comentario o respuesta por su ID
@router.delete("/{comentario_id}")
def eliminar_comentario(comentario_id: int, db: Session = Depends(get_db)):
    comentario = db.query(ComentarioGrafico).filter(ComentarioGrafico.id == comentario_id).first()
    if not comentario:
        raise HTTPException(status_code=404, detail="Observación o respuesta no encontrada")

    try:
        db.delete(comentario)
        db.commit()
        return {"mensaje": "Comentario eliminado exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar la observación: {str(e)}")