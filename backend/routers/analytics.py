from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import SessionLocal
from models import TransaccionProcesada


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analítica BI"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# 1. RESUMEN GENERAL DE LA CARPETA
# ============================================================

@router.get("/resumen/{carpeta_id}")
def obtener_resumen(
    carpeta_id: int,
    sector: str | None = Query(None),
    riesgo: str | None = Query(None),
    tipo: str | None = Query(None),
    solo_anomalias: bool = Query(False),
    solo_duplicados: bool = Query(False),
    busqueda: str | None = Query(None),
    monto_min: float | None = Query(None),
    monto_max: float | None = Query(None),
    zscore_min: float | None = Query(None),
    zscore_max: float | None = Query(None),
    sensibilidad: float = Query(0.70, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    try:
        print(f"--> [Resumen] Consultando carpeta_id={carpeta_id}")

        # ========================================================
        # CONSULTA BASE
        # ========================================================

        query = db.query(TransaccionProcesada).filter(
            TransaccionProcesada.carpeta_id == carpeta_id
        )

        # ========================================================
        # FILTROS
        # ========================================================

        if sector:
            query = query.filter(
                TransaccionProcesada.sector == sector
            )

        if riesgo:
            query = query.filter(
                TransaccionProcesada.nivel_riesgo == riesgo
            )

        if tipo:
            query = query.filter(
                TransaccionProcesada.tipo_movimiento == tipo
            )

        if monto_min is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs >= monto_min
            )

        if monto_max is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs <= monto_max
            )

        if zscore_min is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto >= zscore_min
            )

        if zscore_max is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto <= zscore_max
            )

        if solo_duplicados:
            query = query.filter(
                TransaccionProcesada.es_sospecha_duplicado == True
            )

        if busqueda:
            termino = f"%{busqueda}%"

            query = query.filter(
                or_(
                    TransaccionProcesada.cuenta.ilike(termino),
                    TransaccionProcesada.descripcion.ilike(termino),
                    TransaccionProcesada.proveedor_o_cliente.ilike(termino),
                    TransaccionProcesada.codigo_cuenta.ilike(termino)
                )
            )

        # ========================================================
        # FILTRO DE ANOMALÍAS SEGÚN SENSIBILIDAD
        # ========================================================

        criterio_anomalia = or_(
            TransaccionProcesada.es_anomalia == True,
            TransaccionProcesada.puntuacion_anomalia >= sensibilidad
        )

        if solo_anomalias:
            query = query.filter(criterio_anomalia)

        # ========================================================
        # OBTENER DATOS
        # ========================================================

        transacciones = query.with_entities(
            TransaccionProcesada.monto_abs,
            TransaccionProcesada.es_anomalia,
            TransaccionProcesada.puntuacion_anomalia,
            TransaccionProcesada.nivel_riesgo,
            TransaccionProcesada.sector,
            TransaccionProcesada.tipo_movimiento,
            TransaccionProcesada.debito,
            TransaccionProcesada.credito
        ).all()

        total = len(transacciones)

        # ========================================================
        # RESPUESTA VACÍA
        # ========================================================

        if total == 0:
            return {
                "carpeta_id": carpeta_id,
                "total_transacciones": 0,
                "filtros": {
                    "sector": sector,
                    "riesgo": riesgo,
                    "tipo": tipo,
                    "solo_anomalias": solo_anomalias,
                    "solo_duplicados": solo_duplicados,
                    "busqueda": busqueda,
                    "monto_min": monto_min,
                    "monto_max": monto_max,
                    "zscore_min": zscore_min,
                    "zscore_max": zscore_max,
                    "sensibilidad": sensibilidad
                },
                "kpis": {
                    "tea": 0.0,
                    "isc": 0.0,
                    "monto_en_riesgo": 0.0,
                    "monto_total": 0.0,
                    "total_anomalias": 0,
                    "total_criticas": 0,
                    "cumple_meta_tea": True,
                    "cumple_meta_isc": True
                },
                "distribucion_riesgo": {
                    "Bajo": 0,
                    "Medio": 0,
                    "Alto": 0,
                    "Crítico": 0
                },
                "por_sector": [],
                "por_tipo_movimiento": []
            }

        # ========================================================
        # VARIABLES GENERALES
        # ========================================================

        monto_total = 0.0
        monto_anomalias = 0.0
        total_anomalias = 0
        total_criticas = 0

        distribucion_riesgo = {
            "Bajo": 0,
            "Medio": 0,
            "Alto": 0,
            "Crítico": 0
        }

        # ========================================================
        # PROCESAR RESUMEN
        # ========================================================

        for t in transacciones:

            monto = float(t.monto_abs or 0)

            monto_total += monto

            es_anomalia = (
                bool(t.es_anomalia)
                or float(t.puntuacion_anomalia or 0) >= sensibilidad
            )

            if es_anomalia:
                monto_anomalias += monto
                total_anomalias += 1

            if t.nivel_riesgo == "Crítico":
                total_criticas += 1

            nivel = t.nivel_riesgo or "Bajo"

            if nivel not in distribucion_riesgo:
                distribucion_riesgo[nivel] = 0

            distribucion_riesgo[nivel] += 1

        # ========================================================
        # TEA
        # ========================================================

        tea = (
            (monto_anomalias / monto_total) * 100
            if monto_total > 0
            else 0.0
        )

        # ========================================================
        # ISC
        # ========================================================

        isc = (
            (total_criticas / total_anomalias) * 100
            if total_anomalias > 0
            else 0.0
        )

        # ========================================================
        # RESUMEN POR SECTOR
        # ========================================================

        sectores = {}

        for t in transacciones:

            sector_nombre = t.sector or "General"

            if sector_nombre not in sectores:
                sectores[sector_nombre] = {
                    "sector": sector_nombre,
                    "cantidad": 0,
                    "debito": 0.0,
                    "credito": 0.0,
                    "monto_total": 0.0,
                    "anomalias": 0
                }

            sectores[sector_nombre]["cantidad"] += 1

            sectores[sector_nombre]["debito"] += float(
                t.debito or 0
            )

            sectores[sector_nombre]["credito"] += float(
                t.credito or 0
            )

            sectores[sector_nombre]["monto_total"] += float(
                t.monto_abs or 0
            )

            es_anomalia = (
                bool(t.es_anomalia)
                or float(t.puntuacion_anomalia or 0) >= sensibilidad
            )

            if es_anomalia:
                sectores[sector_nombre]["anomalias"] += 1

        por_sector = list(sectores.values())

        por_sector.sort(
            key=lambda x: x["monto_total"],
            reverse=True
        )

        # ========================================================
        # RESUMEN POR TIPO DE MOVIMIENTO
        # ========================================================

        tipos = {}

        for t in transacciones:

            tipo_nombre = (
                t.tipo_movimiento
                or "Sin especificar"
            )

            if tipo_nombre not in tipos:
                tipos[tipo_nombre] = {
                    "tipo_movimiento": tipo_nombre,
                    "cantidad": 0,
                    "monto_total": 0.0
                }

            tipos[tipo_nombre]["cantidad"] += 1

            tipos[tipo_nombre]["monto_total"] += float(
                t.monto_abs or 0
            )

        por_tipo_movimiento = list(
            tipos.values()
        )

        por_tipo_movimiento.sort(
            key=lambda x: x["monto_total"],
            reverse=True
        )

        # ========================================================
        # REDONDEAR RESULTADOS
        # ========================================================

        for sector_data in por_sector:

            sector_data["debito"] = round(
                sector_data["debito"], 2
            )

            sector_data["credito"] = round(
                sector_data["credito"], 2
            )

            sector_data["monto_total"] = round(
                sector_data["monto_total"], 2
            )

        for tipo_data in por_tipo_movimiento:

            tipo_data["monto_total"] = round(
                tipo_data["monto_total"], 2
            )

        # ========================================================
        # RESPUESTA
        # ========================================================

        resultado = {
            "carpeta_id": carpeta_id,
            "total_transacciones": total,

            "filtros": {
                "sector": sector,
                "riesgo": riesgo,
                "tipo": tipo,
                "solo_anomalias": solo_anomalias,
                "solo_duplicados": solo_duplicados,
                "busqueda": busqueda,
                "monto_min": monto_min,
                "monto_max": monto_max,
                "zscore_min": zscore_min,
                "zscore_max": zscore_max,
                "sensibilidad": sensibilidad
            },

            "kpis": {
                "tea": round(tea, 2),
                "isc": round(isc, 2),
                "monto_en_riesgo": round(
                    monto_anomalias,
                    2
                ),
                "monto_total": round(
                    monto_total,
                    2
                ),
                "total_anomalias": total_anomalias,
                "total_criticas": total_criticas,
                "cumple_meta_tea": tea < 3.0,
                "cumple_meta_isc": isc < 10.0
            },

            "distribucion_riesgo": distribucion_riesgo,

            "por_sector": por_sector,

            "por_tipo_movimiento": por_tipo_movimiento
        }

        print(
            f"--> [Resumen] "
            f"Transacciones: {total}"
        )

        print(
            f"--> [Resumen] "
            f"Anomalías: {total_anomalias}"
        )

        print(
            f"--> [Resumen] "
            f"Monto en riesgo: {monto_anomalias:.2f}"
        )

        return resultado

    except Exception as e:

        print(
            f"❌ Error en Resumen: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 2. SCATTER PLOT
# ============================================================

@router.get("/scatter/{carpeta_id}")
def obtener_scatter(
    carpeta_id: int,
    max_puntos: int = Query(
        default=500,
        ge=50,
        le=2000
    ),
    sector: str | None = Query(None),
    riesgo: str | None = Query(None),
    tipo: str | None = Query(None),
    solo_anomalias: bool = Query(False),
    solo_duplicados: bool = Query(False),
    busqueda: str | None = Query(None),
    monto_min: float | None = Query(None),
    monto_max: float | None = Query(None),
    zscore_min: float | None = Query(None),
    zscore_max: float | None = Query(None),
    sensibilidad: float = Query(
        default=0.70,
        ge=0.0,
        le=1.0
    ),
    db: Session = Depends(get_db)
):
    try:
        print(
            f"--> [Scatter] Consultando carpeta_id={carpeta_id}"
        )

        # ========================================================
        # CONSULTA BASE
        # ========================================================

        query = db.query(
            TransaccionProcesada
        ).filter(
            TransaccionProcesada.carpeta_id == carpeta_id
        )

        # ========================================================
        # FILTROS
        # ========================================================

        if sector:
            query = query.filter(
                TransaccionProcesada.sector == sector
            )

        if riesgo:
            query = query.filter(
                TransaccionProcesada.nivel_riesgo == riesgo
            )

        if tipo:
            query = query.filter(
                TransaccionProcesada.tipo_movimiento == tipo
            )

        if monto_min is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs >= monto_min
            )

        if monto_max is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs <= monto_max
            )

        if zscore_min is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto >= zscore_min
            )

        if zscore_max is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto <= zscore_max
            )

        if solo_duplicados:
            query = query.filter(
                TransaccionProcesada.es_sospecha_duplicado == True
            )

        if busqueda:
            termino = f"%{busqueda}%"

            query = query.filter(
                or_(
                    TransaccionProcesada.cuenta.ilike(termino),
                    TransaccionProcesada.descripcion.ilike(termino),
                    TransaccionProcesada.proveedor_o_cliente.ilike(termino),
                    TransaccionProcesada.codigo_cuenta.ilike(termino)
                )
            )

        # ========================================================
        # CRITERIO DE ANOMALÍA
        # ========================================================

        criterio_anomalia = or_(
            TransaccionProcesada.es_anomalia == True,
            TransaccionProcesada.puntuacion_anomalia >= sensibilidad
        )

        # ========================================================
        # SI SE SOLICITAN SOLO ANOMALÍAS
        # ========================================================

        if solo_anomalias:
            query = query.filter(
                criterio_anomalia
            )

        # ========================================================
        # ANOMALÍAS
        # ========================================================

        anomalías = query.filter(
            criterio_anomalia
        ).order_by(
            TransaccionProcesada.puntuacion_anomalia.desc()
        ).limit(
            max_puntos
        ).all()

        puntos_anomalias = len(anomalías)

        # ========================================================
        # ESPACIO RESTANTE PARA TRANSACCIONES NORMALES
        # ========================================================

        restantes = max(
            max_puntos - puntos_anomalias,
            0
        )

        normales = []

        if restantes > 0 and not solo_anomalias:

            normales = query.filter(
                ~criterio_anomalia
            ).order_by(
                TransaccionProcesada.id
            ).limit(
                restantes
            ).all()

        # ========================================================
        # COMBINAR RESULTADOS
        # ========================================================

        transacciones = anomalías + normales

        resultado = []

        for t in transacciones:

            es_anomalia = (
                bool(t.es_anomalia)
                or float(
                    t.puntuacion_anomalia or 0
                ) >= sensibilidad
            )

            resultado.append({
                "id": t.id,

                "x": round(
                    float(t.z_score_monto or 0),
                    2
                ),

                "y": round(
                    float(t.monto_abs or 0),
                    2
                ),

                "cuenta": (
                    t.cuenta
                    or "Sin cuenta"
                ),

                "descripcion": (
                    t.descripcion
                    or "Sin detalle"
                ),

                "sector": (
                    t.sector
                    or "General"
                ),

                "fecha": (
                    t.fecha
                    or ""
                ),

                "nivel_riesgo": (
                    t.nivel_riesgo
                    or "Bajo"
                ),

                "es_anomalia": es_anomalia,

                "puntuacion_anomalia": round(
                    float(
                        t.puntuacion_anomalia or 0
                    ),
                    4
                ),

                "tipo_movimiento": (
                    t.tipo_movimiento
                    or "Sin especificar"
                )
            })

        # ========================================================
        # LOGS
        # ========================================================

        print(
            f"--> [Scatter] Sensibilidad: "
            f"{sensibilidad}"
        )

        print(
            f"--> [Scatter] Anomalías: "
            f"{puntos_anomalias}"
        )

        print(
            f"--> [Scatter] Normales: "
            f"{len(normales)}"
        )

        print(
            f"--> [Scatter] Total enviados: "
            f"{len(resultado)}"
        )

        # ========================================================
        # RESPUESTA
        # ========================================================

        return {
            "carpeta_id": carpeta_id,
            "total_puntos": len(resultado),
            "max_puntos": max_puntos,
            "sensibilidad": sensibilidad,
            "filtros": {
                "sector": sector,
                "riesgo": riesgo,
                "tipo": tipo,
                "solo_anomalias": solo_anomalias,
                "solo_duplicados": solo_duplicados,
                "busqueda": busqueda,
                "monto_min": monto_min,
                "monto_max": monto_max,
                "zscore_min": zscore_min,
                "zscore_max": zscore_max
            },
            "puntos": resultado
        }

    except Exception as e:

        print(
            f"❌ Error en Scatter: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 3. TRANSACCIONES PAGINADAS + FILTROS
# ============================================================

@router.get("/transacciones/{carpeta_id}")
def obtener_transacciones(
    carpeta_id: int,

    page: int = Query(
        default=1,
        ge=1
    ),

    limit: int = Query(
        default=25,
        ge=1,
        le=100
    ),

    sector: str | None = None,

    riesgo: str | None = None,

    tipo: str | None = None,

    solo_anomalias: bool = False,

    solo_duplicados: bool = False,

    busqueda: str | None = None,

    monto_min: float | None = None,

    monto_max: float | None = None,

    zscore_min: float | None = None,

    zscore_max: float | None = None,

    db: Session = Depends(get_db)
):
    try:
        print(
            f"--> [Transacciones] "
            f"carpeta={carpeta_id}, "
            f"page={page}, "
            f"limit={limit}"
        )

        query = db.query(
            TransaccionProcesada
        ).filter(
            TransaccionProcesada.carpeta_id == carpeta_id
        )

        # --------------------------------------------------------
        # Filtro sector
        # --------------------------------------------------------

        if sector:
            query = query.filter(
                TransaccionProcesada.sector == sector
            )

        # --------------------------------------------------------
        # Filtro riesgo
        # --------------------------------------------------------

        if riesgo:
            query = query.filter(
                TransaccionProcesada.nivel_riesgo == riesgo
            )

        # --------------------------------------------------------
        # Filtro tipo de movimiento
        # --------------------------------------------------------

        if tipo:
            query = query.filter(
                TransaccionProcesada.tipo_movimiento == tipo
            )

        # --------------------------------------------------------
        # Solo anomalías
        # --------------------------------------------------------

        if solo_anomalias:
            query = query.filter(
                TransaccionProcesada.es_anomalia == True
            )

        # --------------------------------------------------------
        # Solo posibles duplicados
        # --------------------------------------------------------

        if solo_duplicados:
            query = query.filter(
                TransaccionProcesada.es_sospecha_duplicado == True
            )

        # --------------------------------------------------------
        # Búsqueda
        # --------------------------------------------------------

        if busqueda:
            termino = f"%{busqueda}%"

            query = query.filter(
                or_(
                    TransaccionProcesada.cuenta.ilike(
                        termino
                    ),
                    TransaccionProcesada.descripcion.ilike(
                        termino
                    ),
                    TransaccionProcesada.proveedor_o_cliente.ilike(
                        termino
                    ),
                    TransaccionProcesada.codigo_cuenta.ilike(
                        termino
                    )
                )
            )

        # --------------------------------------------------------
        # Rango de monto
        # --------------------------------------------------------

        if monto_min is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs >= monto_min
            )

        if monto_max is not None:
            query = query.filter(
                TransaccionProcesada.monto_abs <= monto_max
            )

        # --------------------------------------------------------
        # Rango Z-Score
        # --------------------------------------------------------

        if zscore_min is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto >= zscore_min
            )

        if zscore_max is not None:
            query = query.filter(
                TransaccionProcesada.z_score_monto <= zscore_max
            )

        # --------------------------------------------------------
        # Total después de filtros
        # --------------------------------------------------------

        total = query.count()

        # --------------------------------------------------------
        # Paginación
        # --------------------------------------------------------

        offset = (page - 1) * limit

        transacciones = query.order_by(
            TransaccionProcesada.id.desc()
        ).offset(
            offset
        ).limit(
            limit
        ).all()

        resultado = []

        for t in transacciones:
            resultado.append({
                "id": t.id,
                "archivo_id": t.archivo_id,
                "carpeta_id": t.carpeta_id,

                "sector": (
                    t.sector
                    or "General"
                ),

                "fecha": t.fecha or "",

                "codigo_cuenta": (
                    t.codigo_cuenta
                    or ""
                ),

                "cuenta": (
                    t.cuenta
                    or "Sin cuenta"
                ),

                "proveedor_o_cliente": (
                    t.proveedor_o_cliente
                    or ""
                ),

                "descripcion": (
                    t.descripcion
                    or ""
                ),

                "debito": round(
                    float(t.debito or 0),
                    2
                ),

                "credito": round(
                    float(t.credito or 0),
                    2
                ),

                "monto_abs": round(
                    float(t.monto_abs or 0),
                    2
                ),

                "categoria_predicha": (
                    t.categoria_predicha
                    or ""
                ),

                "es_anomalia": bool(
                    t.es_anomalia
                ),

                "puntuacion_anomalia": round(
                    float(
                        t.puntuacion_anomalia or 0
                    ),
                    4
                ),

                "nivel_riesgo": (
                    t.nivel_riesgo
                    or "Bajo"
                ),

                "z_score_monto": round(
                    float(
                        t.z_score_monto or 0
                    ),
                    4
                ),

                "tipo_movimiento": (
                    t.tipo_movimiento
                    or "Sin especificar"
                ),

                "es_sospecha_duplicado": bool(
                    t.es_sospecha_duplicado
                ),

                "segmento_monto": (
                    t.segmento_monto
                    or ""
                ),

                # Datos compatibles con el Scatter
                "x": round(
                    float(
                        t.z_score_monto or 0
                    ),
                    2
                ),

                "y": round(
                    float(
                        t.monto_abs or 0
                    ),
                    2
                )
            })

        total_paginas = (
            (total + limit - 1) // limit
            if total > 0
            else 0
        )

        print(
            f"--> [Transacciones] "
            f"Total filtrado={total}, "
            f"devueltos={len(resultado)}"
        )

        return {
            "carpeta_id": carpeta_id,

            "items": resultado,

            "paginacion": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_paginas": total_paginas,
                "tiene_anterior": page > 1,
                "tiene_siguiente": page < total_paginas
            }
        }

    except Exception as e:
        print(
            f"❌ Error en Transacciones: {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 4. COMPATIBILIDAD CON EL FRONTEND ACTUAL
# ============================================================
# Lo dejamos temporalmente para no romper el frontend
# mientras hacemos la migración hacia /resumen.

@router.get("/kpis/{carpeta_id}")
def obtener_kpis_compatibilidad(
    carpeta_id: int,
    db: Session = Depends(get_db)
):
    return obtener_resumen(
        carpeta_id=carpeta_id,
        db=db
    )