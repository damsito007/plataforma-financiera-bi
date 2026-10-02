
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, SessionLocal
from models import Base, Usuario
from routers import auth, carpetas, historial, comentarios, admin, analytics

# 1. Crear automáticamente las tablas en Supabase PostgreSQL
Base.metadata.create_all(bind=engine)

# 2. Instanciar la aplicación FastAPI
app = FastAPI(
    title="Plataforma Financiera BI",
    version="1.0.0",
    description="API de Inteligencia Financiera y Auditoría Contable con Isolation Forest"
)

# 3. Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Registrar los Routers de la aplicación
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(carpetas.router)
app.include_router(historial.router)
app.include_router(comentarios.router)
app.include_router(analytics.router)
# 5. Endpoint base para verificar salud del servidor
@app.get("/")
def check_status():
    return {
        "status": "Online",
        "database": "Supabase PostgreSQL",
        "plataforma": "BI & Auditoría Contable"
    }

