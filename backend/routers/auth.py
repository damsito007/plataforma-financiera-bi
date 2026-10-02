from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario

router = APIRouter(prefix="/api", tags=["Autenticación"])

@router.post("/token")
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # Buscar usuario en Supabase
    usuario = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    
    # Validación básica (En producción se compara hash con passlib/bcrypt)
    if not usuario or usuario.hashed_password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifica tu usuario y contraseña.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Devolver credenciales y rol para el Frontend
    return {
        "access_token": f"bearer_token_demo_{usuario.id}",
        "token_type": "bearer",
        "rol": usuario.rol,
        "codigo_cliente": usuario.codigo_cliente or ""
    }