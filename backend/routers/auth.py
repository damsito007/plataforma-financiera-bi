from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Autenticación"])

@router.post("/token")
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    
    if not usuario or usuario.hashed_password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifica tu usuario y contraseña.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Devuelve el id y username para que el frontend pueda identificarte
    return {
        "access_token": f"bearer_token_demo_{usuario.id}",
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "username": usuario.username,
            "rol": usuario.rol,
            "codigo_cliente": usuario.codigo_cliente or ""
        }
    }


class ConfirmPasswordRequest(BaseModel):
    username: str
    password: str

@router.post("/verify-password")
def verify_password(req: ConfirmPasswordRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.username == req.username).first()
    if not usuario or usuario.hashed_password != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta. No se puede proceder con la eliminación."
        )
    return {"status": "success", "message": "Contraseña verificada exitosamente."}