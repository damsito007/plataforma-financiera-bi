# backend/services.py
import io
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile, status

# Importar con los nombres EXACTOS de tu models.py
from models import HistorialArchivo, TransaccionProcesada


def normalizar_y_cargar_dataframe(file: UploadFile):
    """Carga Excel o CSV desde UploadFile independientemente de delimitadores."""
    contents = file.file.read()
    filename = file.filename

    if filename.endswith('.csv'):
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(contents), encoding='latin1', sep=None, engine='python')
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(contents))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Debe ser .xlsx o .csv"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo proporcionado está vacío."
        )

    # Normalizar nombres de columnas a minúsculas
    df.columns = [str(c).strip().lower().replace(" ", "_").replace(".", "") for c in df.columns]

    mapeo = {
        'debito': ['debito', 'debit', 'debitos', 'cargo', 'cargos'],
        'credito': ['credito', 'credit', 'creditos', 'abono', 'abonos'],
        'monto': ['monto', 'amount', 'total', 'importe', 'valor'],
        'cuenta': ['cuenta', 'account', 'nombre_cuenta'],
        'codigo_cuenta': ['codigo_cuenta', 'num_cuenta', 'codigo'],
        'descripcion': ['descripcion', 'description', 'detalle', 'observacion', 'glosa', 'concepto'],
        'fecha': ['fecha', 'date', 'fecha_transaccion', 'periodo'],
        'proveedor_o_cliente': ['proveedor', 'cliente', 'tercero', 'vendor', 'customer']
    }

    df_normalizado = pd.DataFrame()

    for campo_estandar, sinonimos in mapeo.items():
        col_encontrada = next((col for col in df.columns if any(s in col for s in sinonimos)), None)
        if col_encontrada:
            df_normalizado[campo_estandar] = df[col_encontrada]
        else:
            df_normalizado[campo_estandar] = 0.0 if campo_estandar in ['debito', 'credito', 'monto'] else 'N/A'

    for col in ['debito', 'credito', 'monto']:
        df_normalizado[col] = pd.to_numeric(df_normalizado[col], errors='coerce').fillna(0.0)

    df_normalizado['monto_abs'] = np.where(
        df_normalizado['monto'] > 0,
        df_normalizado['monto'],
        np.maximum(df_normalizado['debito'], df_normalizado['credito'])
    )
    df_normalizado['tipo_movimiento'] = np.where(df_normalizado['debito'] > 0, 'Débito', 'Crédito')

    return df_normalizado


def procesar_archivo_empresarial(file: UploadFile, sector: str, db: Session, carpeta_id: int):
    filename = file.filename

    try:
        df = normalizar_y_cargar_dataframe(file)

        # 1. Detección de anomalías con Isolation Forest & Z-Score
        std_monto = float(df['monto_abs'].std())
        mean_monto = float(df['monto_abs'].mean())
        df['z_score_monto'] = (df['monto_abs'] - mean_monto) / (std_monto if std_monto > 0 else 1.0)

        features = df[['monto_abs', 'z_score_monto']].fillna(0)

        contaminacion_map = {
            'Telecomunicaciones': 0.05,
            'Arrocera': 0.03,
            'Cerveceria': 0.04
        }
        contamination = contaminacion_map.get(sector, 0.05)

        if len(df) >= 5:
            model = IsolationForest(contamination=contamination, random_state=42)
            df['pred_anomalia'] = model.fit_predict(features)
            df['puntuacion_anomalia'] = model.decision_function(features)
            df['es_anomalia'] = df['pred_anomalia'] == -1
        else:
            df['puntuacion_anomalia'] = 0.0
            df['es_anomalia'] = False

        def evaluar_riesgo(row):
            if row['es_anomalia'] and row['z_score_monto'] > 2.5:
                return "Crítico"
            elif row['es_anomalia']:
                return "Alto"
            return "Bajo"

        df['nivel_riesgo'] = df.apply(evaluar_riesgo, axis=1)

        # Totales
        total_registros = int(len(df))
        total_anomalias = int(df['es_anomalia'].sum())
        total_debito = float(df['debito'].sum())
        total_credito = float(df['credito'].sum())

        # 2. Inserción en la tabla HistorialArchivo
        nuevo_archivo = HistorialArchivo(
            nombre_archivo=filename,
            carpeta_id=int(carpeta_id),
            total_registros=total_registros,
            total_anomalias=total_anomalias,
            total_debito=total_debito,
            total_credito=total_credito
        )
        db.add(nuevo_archivo)
        db.commit()
        db.refresh(nuevo_archivo)

        # 3. Inserción en la tabla TransaccionProcesada
        registros_db = []
        for _, row in df.iterrows():
            reg = TransaccionProcesada(
                archivo_id=int(nuevo_archivo.id),
                carpeta_id=int(carpeta_id),
                sector=str(sector),
                fecha=str(row.get('fecha', '')),
                codigo_cuenta=str(row.get('codigo_cuenta', '')),
                cuenta=str(row.get('cuenta', 'N/A')),
                proveedor_o_cliente=str(row.get('proveedor_o_cliente', 'N/A')),
                descripcion=str(row.get('descripcion', 'Sin detalle')),
                debito=float(row['debito']),
                credito=float(row['credito']),
                monto_abs=float(row['monto_abs']),
                es_anomalia=bool(row['es_anomalia']),
                puntuacion_anomalia=float(row['puntuacion_anomalia']),
                nivel_riesgo=str(row['nivel_riesgo']),
                z_score_monto=float(row['z_score_monto']),
                tipo_movimiento=str(row['tipo_movimiento'])
            )
            registros_db.append(reg)

        db.bulk_save_objects(registros_db)
        db.commit()

        return {
            "mensaje": f"Archivo '{filename}' procesado y guardado con éxito.",
            "archivo_id": nuevo_archivo.id,
            "resumen": {
                "sector": sector,
                "total_registros": total_registros,
                "total_anomalias": total_anomalias,
                "total_debito": total_debito,
                "total_credito": total_credito
            }
        }

    except HTTPException as http_exc:
        db.rollback()
        raise http_exc
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el pipeline de ML: {str(e)}"
        )