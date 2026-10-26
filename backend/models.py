from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# ==========================================
# 1. MODELO DE USUARIOS (RBAC)
# ==========================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    rol = Column(String, default="User")  # "Admin" o "User"
    codigo_cliente = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    carpetas = relationship("CarpetaProyecto", backref="creador")
    comentarios = relationship("ComentarioGrafico", backref="autor")


# ==========================================
# 2. MODELO DE CARPETAS / PROYECTOS / CLIENTES
# ==========================================
class CarpetaProyecto(Base):
    __tablename__ = "carpetas_proyectos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)  # ej: "Auditoría Cervecería Q3 2026"
    sector = Column(String, nullable=False)  # "Telecomunicaciones", "Arrocera", "Cerveceria"
    descripcion = Column(Text, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    # Relaciones en cascada (Si borras la carpeta, elimina sus archivos y transacciones)
    archivos = relationship("HistorialArchivo", backref="carpeta", cascade="all, delete-orphan")
    transacciones = relationship("TransaccionProcesada", backref="carpeta", cascade="all, delete-orphan")
    comentarios = relationship("ComentarioGrafico", backref="carpeta", cascade="all, delete-orphan")

# ==========================================
# 3. MODELO DE HISTORIAL DE ARCHIVOS
# ==========================================
class HistorialArchivo(Base):
    __tablename__ = "historial_archivos"

    id = Column(Integer, primary_key=True, index=True)
    carpeta_id = Column(Integer, ForeignKey("carpetas_proyectos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True) # <--- Nuevo campo
    nombre_archivo = Column(String, nullable=False)
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    
    total_registros = Column(Integer, default=0)
    total_anomalias = Column(Integer, default=0)
    total_debito = Column(Float, default=0.0)
    total_credito = Column(Float, default=0.0)

    # Relaciones
    usuario = relationship("Usuario") # <--- Relación opcional
    transacciones = relationship("TransaccionProcesada", backref="archivo", cascade="all, delete-orphan")


# ==========================================
# 4. MODELO DE TRANSACCIONES PROCESADAS (BI & ML)
# ==========================================
class TransaccionProcesada(Base):
    __tablename__ = "transacciones_procesadas"

    id = Column(Integer, primary_key=True, index=True)
    archivo_id = Column(Integer, ForeignKey("historial_archivos.id"), nullable=False)
    carpeta_id = Column(Integer, ForeignKey("carpetas_proyectos.id"), nullable=False)
    sector = Column(String, default="General")
    
    # Datos Normalizados
    fecha = Column(String, nullable=True)
    fecha_vencimiento = Column(String, nullable=True)        # <--- NUEVO (Antigüedad de Saldos)
    numero_documento = Column(String, nullable=True)         # <--- NUEVO (Referencia/Factura)
    codigo_cuenta = Column(String, nullable=True)
    cuenta = Column(String, nullable=True)
    tipo_cuenta_financiera = Column(String, nullable=True)  # <--- NUEVO ("Inventario", "Costo_Ventas", etc.)
    
    proveedor_o_cliente = Column(String, nullable=True) 
    descripcion = Column(String, nullable=True)
    debito = Column(Float, default=0.0)
    credito = Column(Float, default=0.0)
    monto_abs = Column(Float, default=0.0)
    
    # Categorización de Flujo de Caja
    cashflow_categoria = Column(String, nullable=True)      # <--- NUEVO (Columna CASHFLOW / Centro Costo del Excel)
    
    # Outputs ML y BI
    categoria_predicha = Column(String, nullable=True)
    es_anomalia = Column(Boolean, default=False) 
    puntuacion_anomalia = Column(Float, default=0.0)
    nivel_riesgo = Column(String, default="Bajo")
    z_score_monto = Column(Float, default=0.0)
    tipo_movimiento = Column(String, nullable=True)
    es_sospecha_duplicado = Column(Boolean, default=False)
    segmento_monto = Column(String, nullable=True)


# ==========================================
# 5. MODELO DE COMENTARIOS DE AUDITORÍA EN HILO
# ==========================================
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from database import Base

class ComentarioGrafico(Base):
    __tablename__ = "comentarios_graficos"

    id = Column(Integer, primary_key=True, index=True)
    grafico_id = Column(String, index=True, nullable=False)
    carpeta_id = Column(Integer, ForeignKey("carpetas_proyectos.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    texto = Column(String, nullable=False)
    estado = Column(String, default="abierto")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # Clave foránea autorreferenciada
    parent_id = Column(Integer, ForeignKey("comentarios_graficos.id"), nullable=True)

    # Relación jerárquica explícita
    padre = relationship(
        "ComentarioGrafico",
        remote_side=[id],
        backref=backref("respuestas", cascade="all, delete-orphan")
    )