import React, { useEffect, useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';
import {
    AlertTriangle, ShieldCheck, DollarSign, Activity,
    CheckCircle2, XCircle, Search, RotateCcw,
    SlidersHorizontal, Copy, Info,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api';

const COLORES_RIESGO = {
    Bajo: '#10B981',
    Medio: '#F59E0B',
    Alto: '#F97316',
    Crítico: '#EF4444'
};

const fmtMoney = value =>
    `$${Number(value || 0).toLocaleString('es-NI', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

const fmtNumber = value =>
    Number(value || 0).toLocaleString('es-NI', {
        maximumFractionDigits: 2
    });

function TooltipInfo({ children }) {
    return (
        <div className="group relative inline-flex ml-1">
            <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />

            <div
                className="pointer-events-none absolute z-50 bottom-full left-1/2
                    -translate-x-1/2 mb-2 w-64 rounded-lg border border-slate-700
                    bg-slate-950 p-3 text-xs text-slate-300 opacity-0 shadow-xl
                    transition-opacity group-hover:opacity-100"
            >
                {children}
            </div>
        </div>
    );
}

function ChartTooltip({ active, payload, children }) {
    if (!active || !payload?.length) return null;

    return (
        <div
            className="rounded-xl border border-slate-700 bg-slate-950
                p-3 text-xs shadow-2xl"
        >
            {children(payload[0].payload)}
        </div>
    );
}

export default function AnaliticaAvanzada({ carpetaId }) {

    // ============================================================
    // ESTADOS PRINCIPALES
    // ============================================================

    const [kpis, setKpis] = useState(null);

    const [transacciones, setTransacciones] = useState([]);

    const [scatter, setScatter] = useState([]);

    const [paginacion, setPaginacion] = useState({
        page: 1,
        limit: 25,
        total: 0,
        total_paginas: 0,
        tiene_anterior: false,
        tiene_siguiente: false
    });

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // ============================================================
    // FILTROS
    // ============================================================

    const [sectorFiltro, setSectorFiltro] = useState('Todos');
    const [tipoFiltro, setTipoFiltro] = useState('Todos');
    const [riesgoFiltro, setRiesgoFiltro] = useState('Todos');

    const [soloAnomalias, setSoloAnomalias] = useState(false);
    const [soloDuplicados, setSoloDuplicados] = useState(false);

    const [busqueda, setBusqueda] = useState('');

    const [montoMin, setMontoMin] = useState(0);
    const [montoMax, setMontoMax] = useState(0);

    const [zscoreMin, setZscoreMin] = useState(0);
    const [zscoreMax, setZscoreMax] = useState(0);

    const [pagina, setPagina] = useState(1);

    const LIMIT = 25;

    // ============================================================
    // CONSTRUIR PARAMETROS
    // ============================================================

    const construirParametros = () => {
        const params = {
            page: pagina,
            limit: LIMIT
        };

        if (sectorFiltro !== 'Todos') {
            params.sector = sectorFiltro;
        }

        if (tipoFiltro !== 'Todos') {
            params.tipo = tipoFiltro;
        }

        if (riesgoFiltro !== 'Todos') {
            params.riesgo = riesgoFiltro;
        }

        if (soloAnomalias) {
            params.solo_anomalias = true;
        }

        if (soloDuplicados) {
            params.solo_duplicados = true;
        }

        if (busqueda.trim()) {
            params.busqueda = busqueda.trim();
        }

        if (montoMin > 0) {
            params.monto_min = montoMin;
        }

        if (montoMax > 0) {
            params.monto_max = montoMax;
        }

        /*
         * Los rangos de Z-Score se envían solamente cuando
         * realmente tenemos límites establecidos.
         */
        if (zscoreMin !== 0) {
            params.zscore_min = zscoreMin;
        }

        if (zscoreMax !== 0) {
            params.zscore_max = zscoreMax;
        }

        return params;
    };

    // ============================================================
    // CARGAR ANALITICA
    // ============================================================

    const cargarAnalitica = async () => {
        if (!carpetaId) return;

        setCargando(true);
        setError(null);

        try {

            const params = construirParametros();

            // ----------------------------------------------------
            // RESUMEN
            // ----------------------------------------------------

            const resResumen = await api.get(
                `/api/analytics/resumen/${carpetaId}`,
                {
                    params
                }
            );

            // ----------------------------------------------------
            // TRANSACCIONES
            // ----------------------------------------------------

            const resTransacciones = await api.get(
                `/api/analytics/transacciones/${carpetaId}`,
                {
                    params
                }
            );

            // ----------------------------------------------------
            // SCATTER
            // ----------------------------------------------------

            const paramsScatter = {
                ...params,
                max_puntos: 500
            };

            /*
             * El endpoint Scatter no necesita page/limit.
             */
            delete paramsScatter.page;
            delete paramsScatter.limit;

            const resScatter = await api.get(
                `/api/analytics/scatter/${carpetaId}`,
                {
                    params: paramsScatter
                }
            );

            // ====================================================
            // RESUMEN
            // ====================================================

            setKpis(resResumen.data);

            // ====================================================
            // TRANSACCIONES
            // ====================================================

            const items = Array.isArray(
                resTransacciones.data?.items
            )
                ? resTransacciones.data.items
                : [];

            const datos = items.map(t => ({
                id: t.id,
                archivo_id: t.archivo_id,
                carpeta_id: t.carpeta_id,

                sector: t.sector || 'Sin sector',
                fecha: t.fecha || '',

                codigo_cuenta: t.codigo_cuenta || '',

                cuenta: t.cuenta || 'Sin cuenta',

                proveedor_o_cliente:
                    t.proveedor_o_cliente || '',

                descripcion:
                    t.descripcion || '',

                debito: Number(t.debito || 0),

                credito: Number(t.credito || 0),

                monto_abs: Number(t.monto_abs || 0),

                categoria_predicha:
                    t.categoria_predicha || '',

                es_anomalia:
                    Boolean(t.es_anomalia),

                puntuacion_anomalia:
                    Number(t.puntuacion_anomalia || 0),

                nivel_riesgo:
                    t.nivel_riesgo || 'Bajo',

                z_score_monto:
                    Number(t.z_score_monto || 0),

                tipo_movimiento:
                    t.tipo_movimiento || 'Sin especificar',

                es_sospecha_duplicado:
                    Boolean(t.es_sospecha_duplicado),

                segmento_monto:
                    t.segmento_monto || '',

                x:
                    Number(
                        t.x ??
                        t.z_score_monto ??
                        0
                    ),

                y:
                    Number(
                        t.y ??
                        t.monto_abs ??
                        0
                    )
            }));

            setTransacciones(datos);

            // ====================================================
            // PAGINACION
            // ====================================================

            if (resTransacciones.data?.paginacion) {
                setPaginacion(
                    resTransacciones.data.paginacion
                );
            }

            // ====================================================
            // SCATTER
            // ====================================================

            const puntos = Array.isArray(
                resScatter.data?.puntos
            )
                ? resScatter.data.puntos
                : [];

            setScatter(
                puntos.map(t => ({
                    ...t,

                    id: t.id,

                    x: Number(
                        t.x ??
                        t.z_score_monto ??
                        0
                    ),

                    y: Number(
                        t.y ??
                        t.monto_abs ??
                        0
                    ),

                    z_score_monto:
                        Number(
                            t.z_score_monto ??
                            t.x ??
                            0
                        ),

                    monto_abs:
                        Number(
                            t.monto_abs ??
                            t.y ??
                            0
                        ),

                    puntuacion_anomalia:
                        Number(
                            t.puntuacion_anomalia || 0
                        ),

                    es_anomalia:
                        Boolean(t.es_anomalia),

                    nivel_riesgo:
                        t.nivel_riesgo || 'Bajo',

                    sector:
                        t.sector || 'Sin sector',

                    cuenta:
                        t.cuenta || 'Sin cuenta'
                }))
            );

        } catch (err) {

            console.error(
                'Error cargando analítica:',
                err
            );

            setError(
                err.response?.data?.detail ||
                err.message ||
                'No fue posible cargar la analítica.'
            );

        } finally {
            setCargando(false);
        }
    };

    // ============================================================
    // CARGA INICIAL / CAMBIO DE FILTROS
    // ============================================================

    useEffect(() => {

        if (!carpetaId) return;

        cargarAnalitica();

    }, [
        carpetaId,
        pagina,
        sectorFiltro,
        tipoFiltro,
        riesgoFiltro,
        soloAnomalias,
        soloDuplicados,
        busqueda,
        montoMin,
        montoMax,
        zscoreMin,
        zscoreMax
    ]);

    // ============================================================
    // OPCIONES DE SECTOR
    // ============================================================

    const sectores = useMemo(() => {

        const lista =
            kpis?.por_sector
                ? kpis.por_sector.map(item =>
                    item.sector
                ).filter(Boolean)
                : [];

        return [
            'Todos',
            ...new Set(lista)
        ];

    }, [kpis]);

    // ============================================================
    // OPCIONES DE TIPO
    // ============================================================

    const tipos = useMemo(() => {

        const lista =
            kpis?.por_tipo_movimiento
                ? kpis.por_tipo_movimiento.map(item =>
                    item.tipo_movimiento
                ).filter(Boolean)
                : [];

        return [
            'Todos',
            ...new Set(lista)
        ];

    }, [kpis]);

    // ============================================================
    // RIESGOS
    // ============================================================

    const riesgos = useMemo(
        () => [
            'Todos',
            ...Object.keys(COLORES_RIESGO)
        ],
        []
    );

    // ============================================================
    // DATOS PIE
    // ============================================================

    const datosPie = useMemo(() => {

        if (!kpis?.distribucion_riesgo) {
            return [];
        }

        if (Array.isArray(kpis.distribucion_riesgo)) {

            return kpis.distribucion_riesgo.map(item => ({
                name:
                    item.nivel_riesgo ??
                    item.riesgo ??
                    item.name,

                value:
                    Number(
                        item.total ??
                        item.cantidad ??
                        item.value ??
                        0
                    )
            }));

        }

        return Object.entries(
            kpis.distribucion_riesgo
        ).map(([name, value]) => ({
            name,
            value: Number(value || 0)
        }));

    }, [kpis]);

    // ============================================================
    // DATOS POR SECTOR
    // ============================================================

    const datosSector = useMemo(() => {

        if (!kpis?.por_sector) {
            return [];
        }

        return kpis.por_sector.map(item => ({
            sector:
                item.sector ||
                'Sin sector',

            credito:
                Number(
                    item.credito ??
                    item.total_credito ??
                    0
                ),

            debito:
                Number(
                    item.debito ??
                    item.total_debito ??
                    0
                )
        }));

    }, [kpis]);

    // ============================================================
    // ANOMALIAS POR SECTOR
    // ============================================================

    const datosAnomaliasSector = useMemo(() => {

        if (!kpis?.por_sector) {
            return [];
        }

        return kpis.por_sector
            .map(item => ({
                sector:
                    item.sector ||
                    'Sin sector',

                cantidad:
                    Number(
                        item.anomalias ??
                        item.total_anomalias ??
                        item.cantidad_anomalias ??
                        0
                    )
            }))
            .filter(item => item.cantidad > 0)
            .sort(
                (a, b) =>
                    b.cantidad -
                    a.cantidad
            );

    }, [kpis]);

    // ============================================================
    // METRICAS
    // ============================================================

    const metricas = useMemo(() => {

        const datosKpi =
            kpis?.kpis || {};

        return {

            total:
                Number(
                    kpis?.total_transacciones ??
                    datosKpi.total_transacciones ??
                    datosKpi.total ??
                    paginacion.total ??
                    0
                ),

            anomalías:
                Number(
                    datosKpi.total_anomalias ??
                    datosKpi.anomalias ??
                    0
                ),

            críticas:
                Number(
                    datosKpi.total_criticas ??
                    datosKpi.criticas ??
                    0
                ),

            montoRiesgo:
                Number(
                    datosKpi.monto_en_riesgo ??
                    0
                ),

            tea:
                Number(
                    datosKpi.tea ??
                    0
                ),

            isc:
                Number(
                    datosKpi.isc ??
                    0
                )
        };

    }, [
        kpis,
        paginacion.total
    ]);

    // ============================================================
    // PAGINACION
    // ============================================================

    const cambiarPagina = nuevaPagina => {

        if (
            nuevaPagina < 1 ||
            nuevaPagina >
            paginacion.total_paginas
        ) {
            return;
        }

        setPagina(nuevaPagina);

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // ============================================================
    // REINICIAR FILTROS
    // ============================================================

    const reiniciarFiltros = () => {

        setSectorFiltro('Todos');

        setTipoFiltro('Todos');

        setRiesgoFiltro('Todos');

        setSoloAnomalias(false);

        setSoloDuplicados(false);

        setBusqueda('');

        setMontoMin(0);

        setMontoMax(0);

        setZscoreMin(0);

        setZscoreMax(0);

        setPagina(1);
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (cargando) {

        return (
            <div className="p-10 text-center text-slate-400">

                <Activity
                    className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500"
                />

                <p>
                    Procesando indicadores ejecutivos...
                </p>

            </div>
        );
    }

    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (
            <div
                className="p-6 rounded-2xl border border-red-900
                    bg-red-950/30 text-red-300"
            >

                <div className="flex items-center gap-2 font-semibold">

                    <AlertTriangle className="w-5 h-5" />

                    Error cargando analítica

                </div>

                <p className="text-sm mt-2">
                    {error}
                </p>

                <button
                    onClick={cargarAnalitica}
                    className="mt-4 px-4 py-2 rounded-lg
                        bg-red-600 hover:bg-red-500
                        text-white text-sm"
                >
                    Reintentar
                </button>

            </div>
        );
    }

    if (!kpis) {
        return null;
    }

    const teaBase =
        Number(
            kpis.kpis?.tea || 0
        );

    const iscBase =
        Number(
            kpis.kpis?.isc || 0
        );

    const montoBase =
        Number(
            kpis.kpis?.monto_en_riesgo || 0
        );

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="space-y-6 my-6">

            {/* ====================================================
                FILTROS
            ==================================================== */}

            <div
                className="bg-slate-900 border border-slate-800
                    rounded-2xl p-5"
            >

                <div
                    className="flex flex-col lg:flex-row
                        lg:items-center lg:justify-between
                        gap-4 mb-5"
                >

                    <div>

                        <div className="flex items-center gap-2">

                            <SlidersHorizontal
                                className="w-5 h-5 text-blue-400"
                            />

                            <h2 className="text-sm font-bold text-white">
                                Filtros de análisis
                            </h2>

                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                            Los resultados se actualizan desde la API
                            según los filtros seleccionados.
                        </p>

                    </div>

                    <button
                        onClick={reiniciarFiltros}
                        className="flex items-center justify-center gap-2
                            px-3 py-2 rounded-lg border border-slate-700
                            text-slate-300 hover:bg-slate-800 text-xs"
                    >

                        <RotateCcw className="w-4 h-4" />

                        Restablecer

                    </button>

                </div>

                <div
                    className="grid grid-cols-1 sm:grid-cols-2
                        lg:grid-cols-4 gap-3"
                >

                    {/* SECTOR */}

                    <div>

                        <label className="text-xs text-slate-400">
                            Sector
                        </label>

                        <select
                            value={sectorFiltro}
                            onChange={e => {
                                setSectorFiltro(
                                    e.target.value
                                );
                                setPagina(1);
                            }}
                            className="w-full mt-1 bg-slate-950
                                border border-slate-700 rounded-lg
                                px-3 py-2 text-sm text-white"
                        >

                            {sectores.map(sector => (
                                <option
                                    key={sector}
                                    value={sector}
                                >
                                    {sector}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* TIPO */}

                    <div>

                        <label className="text-xs text-slate-400">
                            Tipo de movimiento
                        </label>

                        <select
                            value={tipoFiltro}
                            onChange={e => {
                                setTipoFiltro(
                                    e.target.value
                                );
                                setPagina(1);
                            }}
                            className="w-full mt-1 bg-slate-950
                                border border-slate-700 rounded-lg
                                px-3 py-2 text-sm text-white"
                        >

                            {tipos.map(tipo => (
                                <option
                                    key={tipo}
                                    value={tipo}
                                >
                                    {tipo}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* RIESGO */}

                    <div>

                        <label className="text-xs text-slate-400">
                            Nivel de riesgo
                        </label>

                        <select
                            value={riesgoFiltro}
                            onChange={e => {
                                setRiesgoFiltro(
                                    e.target.value
                                );
                                setPagina(1);
                            }}
                            className="w-full mt-1 bg-slate-950
                                border border-slate-700 rounded-lg
                                px-3 py-2 text-sm text-white"
                        >

                            {riesgos.map(riesgo => (
                                <option
                                    key={riesgo}
                                    value={riesgo}
                                >
                                    {riesgo}
                                </option>
                            ))}

                        </select>

                    </div>

                    {/* BUSQUEDA */}

                    <div>

                        <label className="text-xs text-slate-400">
                            Buscar
                        </label>

                        <div className="relative mt-1">

                            <Search
                                className="absolute left-3 top-2.5
                                    w-4 h-4 text-slate-500"
                            />

                            <input
                                value={busqueda}
                                onChange={e => {
                                    setBusqueda(
                                        e.target.value
                                    );
                                    setPagina(1);
                                }}
                                placeholder="Cuenta, descripción..."
                                className="w-full bg-slate-950
                                    border border-slate-700 rounded-lg
                                    pl-9 pr-3 py-2 text-sm text-white
                                    placeholder:text-slate-600"
                            />

                        </div>

                    </div>

                </div>

                {/* RANGOS */}

                <div
                    className="grid grid-cols-1 lg:grid-cols-2
                        gap-5 mt-5"
                >

                    {/* MONTO */}

                    <div>

                        <div className="flex justify-between text-xs">

                            <span className="text-slate-400">
                                Monto
                            </span>

                            <span className="text-white">

                                {montoMin > 0
                                    ? fmtMoney(montoMin)
                                    : 'Sin mínimo'}

                                {' — '}

                                {montoMax > 0
                                    ? fmtMoney(montoMax)
                                    : 'Sin máximo'}

                            </span>

                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">

                            <input
                                type="number"
                                min="0"
                                value={montoMin}
                                onChange={e => {
                                    const valor =
                                        Number(
                                            e.target.value
                                        ) || 0;

                                    setMontoMin(valor);
                                    setPagina(1);
                                }}
                                placeholder="Mínimo"
                                className="w-full bg-slate-950
                                    border border-slate-700 rounded-lg
                                    px-3 py-2 text-sm text-white"
                            />

                            <input
                                type="number"
                                min="0"
                                value={montoMax}
                                onChange={e => {
                                    const valor =
                                        Number(
                                            e.target.value
                                        ) || 0;

                                    setMontoMax(valor);
                                    setPagina(1);
                                }}
                                placeholder="Máximo"
                                className="w-full bg-slate-950
                                    border border-slate-700 rounded-lg
                                    px-3 py-2 text-sm text-white"
                            />

                        </div>

                    </div>

                    {/* Z SCORE */}

                    <div>

                        <div className="flex justify-between text-xs">

                            <span className="text-slate-400">
                                Rango Z-Score
                            </span>

                            <span className="text-white">

                                {zscoreMin !== 0
                                    ? `${zscoreMin.toFixed(2)}σ`
                                    : 'Sin mínimo'}

                                {' — '}

                                {zscoreMax !== 0
                                    ? `${zscoreMax.toFixed(2)}σ`
                                    : 'Sin máximo'}

                            </span>

                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-2">

                            <input
                                type="number"
                                step="0.1"
                                value={zscoreMin}
                                onChange={e => {
                                    const valor =
                                        Number(
                                            e.target.value
                                        ) || 0;

                                    setZscoreMin(valor);
                                    setPagina(1);
                                }}
                                placeholder="Mínimo"
                                className="w-full bg-slate-950
                                    border border-slate-700 rounded-lg
                                    px-3 py-2 text-sm text-white"
                            />

                            <input
                                type="number"
                                step="0.1"
                                value={zscoreMax}
                                onChange={e => {
                                    const valor =
                                        Number(
                                            e.target.value
                                        ) || 0;

                                    setZscoreMax(valor);
                                    setPagina(1);
                                }}
                                placeholder="Máximo"
                                className="w-full bg-slate-950
                                    border border-slate-700 rounded-lg
                                    px-3 py-2 text-sm text-white"
                            />

                        </div>

                    </div>

                </div>

                {/* CHECKBOXES */}

                <div className="flex flex-wrap gap-5 mt-5">

                    <label
                        className="flex items-center gap-2
                            text-xs text-slate-300 cursor-pointer"
                    >

                        <input
                            type="checkbox"
                            checked={soloAnomalias}
                            onChange={e => {
                                setSoloAnomalias(
                                    e.target.checked
                                );
                                setPagina(1);
                            }}
                            className="accent-red-500"
                        />

                        Solo anomalías

                    </label>

                    <label
                        className="flex items-center gap-2
                            text-xs text-slate-300 cursor-pointer"
                    >

                        <input
                            type="checkbox"
                            checked={soloDuplicados}
                            onChange={e => {
                                setSoloDuplicados(
                                    e.target.checked
                                );
                                setPagina(1);
                            }}
                            className="accent-amber-500"
                        />

                        <Copy className="w-3.5 h-3.5" />

                        Solo posibles duplicados

                    </label>

                    <span className="text-xs text-slate-500">

                        Mostrando{' '}

                        <strong className="text-white">
                            {fmtNumber(
                                transacciones.length
                            )}
                        </strong>

                        {' '}de{' '}

                        <strong className="text-white">
                            {fmtNumber(
                                paginacion.total
                            )}
                        </strong>

                        {' '}transacciones

                    </span>

                </div>

            </div>

            {/* ====================================================
                KPIS
            ==================================================== */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* TEA */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl relative"
                >

                    <div
                        className="flex items-center
                            justify-between mb-2"
                    >

                        <div className="flex items-center">

                            <span
                                className="text-xs font-semibold
                                    text-slate-400 uppercase"
                            >
                                Tasa Exposición Anomalías (TEA)
                            </span>

                            <TooltipInfo>
                                Porcentaje de transacciones identificadas
                                como anómalas según los resultados del
                                análisis.
                            </TooltipInfo>

                        </div>

                        <AlertTriangle
                            className="w-5 h-5 text-amber-500"
                        />

                    </div>

                    <div className="flex items-baseline gap-2">

                        <span
                            className="text-3xl font-extrabold text-white"
                        >
                            {metricas.tea.toFixed(2)}%
                        </span>

                        <span className="text-xs text-slate-400">
                            / Meta: &lt; 3.0%
                        </span>

                    </div>

                    <div className="mt-3 text-xs">

                        {metricas.tea <= 3 ? (

                            <span
                                className="text-emerald-400
                                    flex items-center gap-1"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Dentro de la meta
                            </span>

                        ) : (

                            <span
                                className="text-red-400
                                    flex items-center gap-1"
                            >
                                <XCircle className="w-4 h-4" />
                                Excede el umbral
                            </span>

                        )}

                    </div>

                    <div className="mt-2 text-[11px] text-slate-600">
                        API: {teaBase.toFixed(2)}%
                    </div>

                </div>

                {/* ISC */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl"
                >

                    <div
                        className="flex items-center
                            justify-between mb-2"
                    >

                        <div className="flex items-center">

                            <span
                                className="text-xs font-semibold
                                    text-slate-400 uppercase"
                            >
                                Índice Severidad Crítica (ISC)
                            </span>

                            <TooltipInfo>
                                Proporción de registros clasificados
                                como críticos.
                            </TooltipInfo>

                        </div>

                        <ShieldCheck
                            className="w-5 h-5 text-blue-500"
                        />

                    </div>

                    <div className="flex items-baseline gap-2">

                        <span
                            className="text-3xl font-extrabold text-white"
                        >
                            {metricas.isc.toFixed(2)}%
                        </span>

                        <span className="text-xs text-slate-400">
                            / Meta: &lt; 10.0%
                        </span>

                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                        Hallazgos críticos según el análisis actual.
                    </p>

                    <div className="mt-2 text-[11px] text-slate-600">
                        API: {iscBase.toFixed(2)}%
                    </div>

                </div>

                {/* MONTO */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl"
                >

                    <div
                        className="flex items-center
                            justify-between mb-2"
                    >

                        <div className="flex items-center">

                            <span
                                className="text-xs font-semibold
                                    text-slate-400 uppercase"
                            >
                                Monto Total en Riesgo
                            </span>

                            <TooltipInfo>
                                Suma de los montos asociados a
                                transacciones identificadas como
                                anómalas.
                            </TooltipInfo>

                        </div>

                        <DollarSign
                            className="w-5 h-5 text-emerald-500"
                        />

                    </div>

                    <div
                        className="text-3xl font-extrabold text-white"
                    >
                        {fmtMoney(
                            metricas.montoRiesgo
                        )}
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                        Volumen acumulado bajo investigación.
                    </p>

                    <div className="mt-2 text-[11px] text-slate-600">
                        API: {fmtMoney(montoBase)}
                    </div>

                </div>

            </div>

            {/* ====================================================
                GRAFICOS PRINCIPALES
            ==================================================== */}

            <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >

                {/* SCATTER */}

                <div
                    className="lg:col-span-2 bg-slate-900
                        border border-slate-800 p-5 rounded-2xl"
                >

                    <div
                        className="flex items-start
                            justify-between gap-3"
                    >

                        <div>

                            <div className="flex items-center">

                                <h3
                                    className="text-sm font-bold text-white"
                                >
                                    Matriz de Dispersión de Riesgo
                                </h3>

                                <TooltipInfo>
                                    Cada punto representa una
                                    transacción devuelta por el
                                    endpoint de análisis Scatter.
                                    El eje X representa el Z-Score
                                    y el eje Y el monto absoluto.
                                </TooltipInfo>

                            </div>

                            <p className="text-xs text-slate-400 mt-1">
                                Z-Score vs monto transaccionado
                            </p>

                        </div>

                        <span className="text-xs text-slate-500">
                            Muestras: {scatter.length}
                        </span>

                    </div>

                    <div className="h-80 mt-3">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <ScatterChart
                                margin={{
                                    top: 15,
                                    right: 25,
                                    bottom: 25,
                                    left: 20
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#334155"
                                />

                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name="Z-Score"
                                    unit="σ"
                                    stroke="#94A3B8"
                                    domain={['auto', 'auto']}
                                    tick={{ fontSize: 11 }}
                                />

                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name="Monto"
                                    stroke="#94A3B8"
                                    domain={['auto', 'auto']}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={value =>
                                        `$${Number(
                                            value
                                        ).toLocaleString(
                                            'es-NI'
                                        )}`
                                    }
                                />

                                <ZAxis
                                    type="number"
                                    range={[50, 350]}
                                />

                                <Tooltip
                                    cursor={{
                                        stroke: '#64748B',
                                        strokeDasharray: '4 4'
                                    }}
                                    content={({
                                        active,
                                        payload
                                    }) => (

                                        <ChartTooltip
                                            active={active}
                                            payload={payload}
                                        >

                                            {data => (
                                                <>
                                                    <p
                                                        className="font-bold
                                                            text-white mb-2"
                                                    >
                                                        {data.cuenta ||
                                                            'Sin cuenta'}
                                                    </p>

                                                    <p className="text-slate-300">
                                                        Sector:{' '}
                                                        {data.sector ||
                                                            'Sin sector'}
                                                    </p>

                                                    <p className="text-slate-300">
                                                        Monto:{' '}
                                                        {fmtMoney(
                                                            data.y
                                                        )}
                                                    </p>

                                                    <p className="text-slate-300">
                                                        Z-Score:{' '}
                                                        {Number(
                                                            data.x || 0
                                                        ).toFixed(2)}
                                                        σ
                                                    </p>

                                                    <p className="text-slate-300">
                                                        Score:{' '}
                                                        {Number(
                                                            data.puntuacion_anomalia ||
                                                            0
                                                        ).toFixed(2)}
                                                    </p>

                                                    <p
                                                        className="font-semibold mt-1"
                                                        style={{
                                                            color:
                                                                COLORES_RIESGO[
                                                                data.nivel_riesgo
                                                                ] ||
                                                                '#94A3B8'
                                                        }}
                                                    >
                                                        Riesgo:{' '}
                                                        {data.nivel_riesgo ||
                                                            'Bajo'}
                                                    </p>

                                                </>
                                            )}

                                        </ChartTooltip>

                                    )}
                                />

                                <Scatter
                                    name="Transacciones"
                                    data={scatter}
                                >

                                    {scatter.map(
                                        (entry, index) => (

                                            <Cell
                                                key={
                                                    `scatter-${entry.id || index}`
                                                }
                                                fill={
                                                    entry.es_anomalia
                                                        ? '#EF4444'
                                                        : '#93C5FD'
                                                }
                                            />

                                        )
                                    )}

                                </Scatter>

                            </ScatterChart>

                        </ResponsiveContainer>

                    </div>

                    <div
                        className="flex justify-center gap-6
                            text-xs mt-2"
                    >

                        <span
                            className="flex items-center gap-2
                                text-slate-300"
                        >
                            <span
                                className="w-3 h-3 rounded-full
                                    bg-blue-300"
                            />
                            Transacción normal
                        </span>

                        <span
                            className="flex items-center gap-2
                                text-slate-300"
                        >
                            <span
                                className="w-3 h-3 rounded-full
                                    bg-red-500"
                            />
                            Anomalía
                        </span>

                    </div>

                </div>

                {/* PIE */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl"
                >

                    <div className="flex items-center">

                        <h3
                            className="text-sm font-bold text-white"
                        >
                            Composición por Nivel de Riesgo
                        </h3>

                        <TooltipInfo>
                            Distribución de las transacciones según
                            el nivel de riesgo calculado por la API.
                        </TooltipInfo>

                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                        Distribución actual
                    </p>

                    <div className="h-72 mt-2">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <PieChart>

                                <Pie
                                    data={datosPie}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                >

                                    {datosPie.map(
                                        entry => (

                                            <Cell
                                                key={entry.name}
                                                fill={
                                                    COLORES_RIESGO[
                                                    entry.name
                                                    ] ||
                                                    '#64748B'
                                                }
                                            />

                                        )
                                    )}

                                </Pie>

                                <Tooltip
                                    content={({
                                        active,
                                        payload
                                    }) => (

                                        <ChartTooltip
                                            active={active}
                                            payload={payload}
                                        >

                                            {data => (
                                                <>
                                                    <p
                                                        className="font-semibold
                                                            text-white"
                                                    >
                                                        {data.name}
                                                    </p>

                                                    <p
                                                        className="text-slate-300
                                                            mt-1"
                                                    >
                                                        Registros:{' '}
                                                        {fmtNumber(
                                                            data.value
                                                        )}
                                                    </p>
                                                </>
                                            )}

                                        </ChartTooltip>

                                    )}
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{
                                        fontSize: '11px'
                                    }}
                                />

                            </PieChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>

            {/* ====================================================
                GRAFICOS SECUNDARIOS
            ==================================================== */}

            <div
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >

                {/* CREDITO VS DEBITO */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl"
                >

                    <div className="flex items-center">

                        <h3
                            className="text-sm font-bold text-white"
                        >
                            Crédito vs Débito por Sector
                        </h3>

                        <TooltipInfo>
                            Compara el volumen monetario de créditos
                            y débitos por sector.
                        </TooltipInfo>

                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                        Volumen transaccional por sector
                    </p>

                    <div className="h-72 mt-4">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <BarChart
                                data={datosSector}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 10,
                                    bottom: 5
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#334155"
                                />

                                <XAxis
                                    dataKey="sector"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11 }}
                                />

                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={value =>
                                        `$${Number(
                                            value
                                        ).toLocaleString(
                                            'es-NI'
                                        )}`
                                    }
                                />

                                <Tooltip
                                    content={({
                                        active,
                                        payload
                                    }) => (

                                        <ChartTooltip
                                            active={active}
                                            payload={payload}
                                        >

                                            {data => (
                                                <>
                                                    <p
                                                        className="font-semibold
                                                            text-white mb-2"
                                                    >
                                                        {data.sector}
                                                    </p>

                                                    <p className="text-blue-300">
                                                        Crédito:{' '}
                                                        {fmtMoney(
                                                            data.credito
                                                        )}
                                                    </p>

                                                    <p className="text-indigo-300">
                                                        Débito:{' '}
                                                        {fmtMoney(
                                                            data.debito
                                                        )}
                                                    </p>
                                                </>
                                            )}

                                        </ChartTooltip>

                                    )}
                                />

                                <Legend
                                    wrapperStyle={{
                                        fontSize: '11px'
                                    }}
                                />

                                <Bar
                                    dataKey="credito"
                                    name="Crédito"
                                    fill="#93C5FD"
                                    radius={[4, 4, 0, 0]}
                                />

                                <Bar
                                    dataKey="debito"
                                    name="Débito"
                                    fill="#94A3D0"
                                    radius={[4, 4, 0, 0]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                {/* ANOMALIAS POR SECTOR */}

                <div
                    className="bg-slate-900 border border-slate-800
                        p-5 rounded-2xl"
                >

                    <div className="flex items-center">

                        <h3
                            className="text-sm font-bold text-white"
                        >
                            Anomalías por Sector
                        </h3>

                        <TooltipInfo>
                            Cantidad de transacciones identificadas
                            como anomalías por sector.
                        </TooltipInfo>

                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                        Concentración de hallazgos
                    </p>

                    <div className="h-72 mt-4">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <BarChart
                                data={datosAnomaliasSector}
                                layout="vertical"
                                margin={{
                                    top: 5,
                                    right: 20,
                                    left: 20,
                                    bottom: 5
                                }}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#334155"
                                />

                                <XAxis
                                    type="number"
                                    allowDecimals={false}
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11 }}
                                />

                                <YAxis
                                    type="category"
                                    dataKey="sector"
                                    stroke="#94A3B8"
                                    width={100}
                                    tick={{ fontSize: 11 }}
                                />

                                <Tooltip
                                    content={({
                                        active,
                                        payload
                                    }) => (

                                        <ChartTooltip
                                            active={active}
                                            payload={payload}
                                        >

                                            {data => (
                                                <>
                                                    <p
                                                        className="font-semibold
                                                            text-white"
                                                    >
                                                        {data.sector}
                                                    </p>

                                                    <p
                                                        className="text-red-400
                                                            mt-1"
                                                    >
                                                        Anomalías:{' '}
                                                        {data.cantidad}
                                                    </p>
                                                </>
                                            )}

                                        </ChartTooltip>

                                    )}
                                />

                                <Bar
                                    dataKey="cantidad"
                                    name="Anomalías"
                                    fill="#EF4444"
                                    radius={[
                                        0,
                                        5,
                                        5,
                                        0
                                    ]}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>

            {/* ====================================================
                RESUMEN
            ==================================================== */}

            <div
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >

                <div
                    className="bg-slate-900 border border-slate-800
                        rounded-xl p-4"
                >

                    <p className="text-xs text-slate-500">
                        Registros filtrados
                    </p>

                    <p
                        className="text-xl font-bold
                            text-white mt-1"
                    >
                        {fmtNumber(
                            paginacion.total
                        )}
                    </p>

                </div>

                <div
                    className="bg-slate-900 border border-slate-800
                        rounded-xl p-4"
                >

                    <p className="text-xs text-slate-500">
                        Anomalías
                    </p>

                    <p
                        className="text-xl font-bold
                            text-red-400 mt-1"
                    >
                        {fmtNumber(
                            metricas.anomalías
                        )}
                    </p>

                </div>

                <div
                    className="bg-slate-900 border border-slate-800
                        rounded-xl p-4"
                >

                    <p className="text-xs text-slate-500">
                        Críticas
                    </p>

                    <p
                        className="text-xl font-bold
                            text-orange-400 mt-1"
                    >
                        {fmtNumber(
                            metricas.críticas
                        )}
                    </p>

                </div>

                <div
                    className="bg-slate-900 border border-slate-800
                        rounded-xl p-4"
                >

                    <p className="text-xs text-slate-500">
                        Monto investigado
                    </p>

                    <p
                        className="text-xl font-bold
                            text-emerald-400 mt-1"
                    >
                        {fmtMoney(
                            metricas.montoRiesgo
                        )}
                    </p>

                </div>

            </div>

            {/* ====================================================
                TABLA
            ==================================================== */}

            <div
                className="bg-slate-900 border border-slate-800
                    rounded-2xl overflow-hidden"
            >

                <div
                    className="p-5 border-b border-slate-800"
                >

                    <div
                        className="flex items-center
                            justify-between"
                    >

                        <div>

                            <h3
                                className="text-sm font-bold text-white"
                            >
                                Transacciones
                            </h3>

                            <p
                                className="text-xs text-slate-500 mt-1"
                            >
                                Resultados devueltos por la API
                                según los filtros actuales.
                            </p>

                        </div>

                        <span
                            className="text-xs text-slate-500"
                        >
                            Página {paginacion.page} de{' '}
                            {paginacion.total_paginas || 0}
                        </span>

                    </div>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full text-xs">

                        <thead className="bg-slate-950">

                            <tr className="text-slate-400">

                                <th className="px-4 py-3 text-left">
                                    ID
                                </th>

                                <th className="px-4 py-3 text-left">
                                    Sector
                                </th>

                                <th className="px-4 py-3 text-left">
                                    Tipo
                                </th>

                                <th className="px-4 py-3 text-right">
                                    Monto
                                </th>

                                <th className="px-4 py-3 text-right">
                                    Z-Score
                                </th>

                                <th className="px-4 py-3 text-right">
                                    Iso Score
                                </th>

                                <th className="px-4 py-3 text-left">
                                    Estado
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {transacciones.map(t => (

                                <tr
                                    key={t.id}
                                    className="border-t border-slate-800
                                        hover:bg-slate-800/50 transition"
                                >

                                    <td
                                        className="px-4 py-3
                                            text-white font-semibold"
                                    >
                                        TX-
                                        {String(
                                            t.id
                                        ).padStart(
                                            3,
                                            '0'
                                        )}
                                    </td>

                                    <td
                                        className="px-4 py-3
                                            text-slate-300"
                                    >
                                        {t.sector}
                                    </td>

                                    <td
                                        className="px-4 py-3
                                            text-slate-300"
                                    >
                                        {t.tipo_movimiento}
                                    </td>

                                    <td
                                        className="px-4 py-3
                                            text-right text-white"
                                    >
                                        {fmtMoney(
                                            t.monto_abs
                                        )}
                                    </td>

                                    <td
                                        className="px-4 py-3
                                            text-right text-slate-300"
                                    >
                                        {t.z_score_monto.toFixed(
                                            2
                                        )}
                                    </td>

                                    <td
                                        className="px-4 py-3
                                            text-right text-slate-300"
                                    >
                                        {t.puntuacion_anomalia.toFixed(
                                            2
                                        )}
                                    </td>

                                    <td className="px-4 py-3">

                                        <span
                                            className="inline-flex px-2 py-1
                                                rounded-full text-[10px]
                                                font-semibold"
                                            style={{
                                                color:
                                                    COLORES_RIESGO[
                                                    t.nivel_riesgo
                                                    ] ||
                                                    '#F8FAFC',

                                                backgroundColor:
                                                    `${COLORES_RIESGO[
                                                    t.nivel_riesgo
                                                    ] ||
                                                    '#64748B'}22`
                                            }}
                                        >

                                            {t.es_anomalia
                                                ? 'Anomalía'
                                                : t.nivel_riesgo}

                                        </span>

                                    </td>

                                </tr>

                            ))}

                            {!transacciones.length && (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className="px-4 py-10
                                            text-center text-slate-500"
                                    >
                                        No hay transacciones con
                                        los filtros actuales.
                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>

                {/* ====================================================
                    PAGINACION
                ==================================================== */}

                <div
                    className="flex items-center
                        justify-between p-4
                        border-t border-slate-800"
                >

                    <span
                        className="text-xs text-slate-500"
                    >
                        Mostrando{' '}

                        <strong className="text-slate-300">
                            {transacciones.length}
                        </strong>

                        {' '}registros de{' '}

                        <strong className="text-slate-300">
                            {fmtNumber(
                                paginacion.total
                            )}
                        </strong>
                    </span>

                    <div className="flex items-center gap-2">

                        <button
                            onClick={() =>
                                cambiarPagina(
                                    paginacion.page - 1
                                )
                            }
                            disabled={
                                !paginacion.tiene_anterior
                            }
                            className="flex items-center gap-1
                                px-3 py-2 rounded-lg
                                border border-slate-700
                                text-slate-300
                                hover:bg-slate-800
                                disabled:opacity-40
                                disabled:cursor-not-allowed
                                text-xs"
                        >

                            <ChevronLeft className="w-4 h-4" />

                            Anterior

                        </button>

                        <span
                            className="px-3 py-2
                                text-xs text-slate-400"
                        >
                            {paginacion.page}
                            {' / '}
                            {paginacion.total_paginas || 0}
                        </span>

                        <button
                            onClick={() =>
                                cambiarPagina(
                                    paginacion.page + 1
                                )
                            }
                            disabled={
                                !paginacion.tiene_siguiente
                            }
                            className="flex items-center gap-1
                                px-3 py-2 rounded-lg
                                border border-slate-700
                                text-slate-300
                                hover:bg-slate-800
                                disabled:opacity-40
                                disabled:cursor-not-allowed
                                text-xs"
                        >

                            Siguiente

                            <ChevronRight className="w-4 h-4" />

                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}


