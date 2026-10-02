# init_db.py
from database import SessionLocal, engine
import models, auth

# Crear las tablas físicas en el archivo SQLite
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Verificando e insertando usuarios de prueba...")

# 1. Crear un Administrador de pruebas
if not db.query(models.Usuario).filter(models.Usuario.username == "admin").first():
    admin_user = models.Usuario(
        username="admin",
        password_hash=auth.obtener_password_hash("admin123"),
        rol="Admin"
    )
    db.add(admin_user)
    print("- Usuario 'admin' creado (Clave: admin123)")

# 2. Crear el Cliente de pruebas (Mismo código que el Excel de ejemplo)
if not db.query(models.Usuario).filter(models.Usuario.username == "marjourie").first():
    cliente_user = models.Usuario(
        username="marjourie",
        password_hash=auth.obtener_password_hash("cliente123"),
        rol="User",
        codigo_cliente="301407125"
    )
    db.add(cliente_user)
    print("- Usuario 'marjourie' creado (Clave: cliente123)")

db.commit()
print("¡Base de datos SQLite inicializada exitosamente!")
db.close()
