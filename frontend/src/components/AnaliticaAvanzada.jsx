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
    SlidersHorizontal, Copy, Info, Filter,
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
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            <div
                className="pointer-events-none absolute z-50 bottom-full left-1/2
                    -translate-x-1/2 mb-2 w-64 rounded-xl border border-slate-700
                    bg-[#0F172A] p-3 text-xs text-slate-300 opacity-0 shadow-2xl
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
        <div className="rounded-xl border border-slate-700 bg-[#0F172A] p-3 text-xs shadow-2xl">
            {children(payload[0].payload)}
        </div>
    );
}

export default function AnaliticaAvanzada({ carpetaId }) {
    // ============================================================
    // ESTADOS DE DATOS
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
    const [pagina, setPagina] = useState(1);
    const LIMIT = 25;

    // Buscador local en tiempo real para la tabla
    const [busquedaTabla, setBusquedaTabla] = useState('');

    // ============================================================
    // ESTADOS TEMPORALES DE FILTROS (Formulario superior)
    // ============================================================
    const [sectorTemp, setSectorTemp] = useState('Todos');
    const [tipoTemp, setTipoTemp] = useState('Todos');
    const [riesgoTemp, setRiesgoTemp] = useState('Todos');
    const [soloAnomaliasTemp, setSoloAnomaliasTemp] = useState(false);
    const [soloDuplicadosTemp, setSoloDuplicadosTemp] = useState(false);
    const [busquedaTemp, setBusquedaTemp] = useState('');
    const [montoMinTemp, setMontoMinTemp] = useState(0);
    const [montoMaxTemp, setMontoMaxTemp] = useState(0);
    const [zscoreMinTemp, setZscoreMinTemp] = useState(0);
    const [zscoreMaxTemp, setZscoreMaxTemp] = useState(0);

    // ============================================================
    // ESTADOS ACTIVOS DE FILTROS (Consumidos por la API)
    // ============================================================
    const [filtrosActivos, setFiltrosActivos] = useState({
        sector: 'Todos',
        tipo: 'Todos',
        riesgo: 'Todos',
        soloAnomalias: false,
        soloDuplicados: false,
        busqueda: '',
        montoMin: 0,
        montoMax: 0,
        zscoreMin: 0,
        zscoreMax: 0
    });

    // ============================================================
    // APLICAR Y REINICIAR FILTROS
    // ============================================================
    const aplicarFiltros = () => {
        setPagina(1);
        setFiltrosActivos({
            sector: sectorTemp,
            tipo: tipoTemp,
            riesgo: riesgoTemp,
            soloAnomalias: soloAnomaliasTemp,
            soloDuplicados: soloDuplicadosTemp,
            busqueda: busquedaTemp,
            montoMin: montoMinTemp,
            montoMax: montoMaxTemp,
            zscoreMin: zscoreMinTemp,
            zscoreMax: zscoreMaxTemp
        });
    };

    const reiniciarFiltros = () => {
        setSectorTemp('Todos');
        setTipoTemp('Todos');
        setRiesgoTemp('Todos');
        setSoloAnomaliasTemp(false);
        setSoloDuplicadosTemp(false);
        setBusquedaTemp('');
        setMontoMinTemp(0);
        setMontoMaxTemp(0);
        setZscoreMinTemp(0);
        setZscoreMaxTemp(0);
        setBusquedaTabla('');

        setPagina(1);
        setFiltrosActivos({
            sector: 'Todos',
            tipo: 'Todos',
            riesgo: 'Todos',
            soloAnomalias: false,
            soloDuplicados: false,
            busqueda: '',
            montoMin: 0,
            montoMax: 0,
            zscoreMin: 0,
            zscoreMax: 0
        });
    };

    // ============================================================
    // CONSTRUIR PARAMETROS HTTP
    // ============================================================
    const construirParametros = () => {
        const params = {
            page: pagina,
            limit: LIMIT
        };

        if (filtrosActivos.sector !== 'Todos') params.sector = filtrosActivos.sector;
        if (filtrosActivos.tipo !== 'Todos') params.tipo = filtrosActivos.tipo;
        if (filtrosActivos.riesgo !== 'Todos') params.riesgo = filtrosActivos.riesgo;
        if (filtrosActivos.soloAnomalias) params.solo_anomalias = true;
        if (filtrosActivos.soloDuplicados) params.solo_duplicados = true;
        if (filtrosActivos.busqueda.trim()) params.busqueda = filtrosActivos.busqueda.trim();
        if (filtrosActivos.montoMin > 0) params.monto_min = filtrosActivos.montoMin;
        if (filtrosActivos.montoMax > 0) params.monto_max = filtrosActivos.montoMax;
        if (filtrosActivos.zscoreMin !== 0) params.zscore_min = filtrosActivos.zscoreMin;
        if (filtrosActivos.zscoreMax !== 0) params.zscore_max = filtrosActivos.zscoreMax;

        return params;
    };

    // ============================================================
    // CARGAR ANALÍTICA API
    // ============================================================
    const cargarAnalitica = async () => {
        if (!carpetaId) return;

        setCargando(true);
        setError(null);

        try {
            const params = construirParametros();

            const resResumen = await api.get(`/api/analytics/resumen/${carpetaId}`, { params });
            const resTransacciones = await api.get(`/api/analytics/transacciones/${carpetaId}`, { params });

            const paramsScatter = { ...params, max_puntos: 500 };
            delete paramsScatter.page;
            delete paramsScatter.limit;

            const resScatter = await api.get(`/api/analytics/scatter/${carpetaId}`, { params: paramsScatter });

            setKpis(resResumen.data);

            const items = Array.isArray(resTransacciones.data?.items) ? resTransacciones.data.items : [];
            const datos = items.map(t => ({
                id: t.id,
                archivo_id: t.archivo_id,
                carpeta_id: t.carpeta_id,
                sector: t.sector || 'Sin sector',
                fecha: t.fecha || '',
                codigo_cuenta: t.codigo_cuenta || '',
                cuenta: t.cuenta || 'Sin cuenta',
                proveedor_o_cliente: t.proveedor_o_cliente || '',
                descripcion: t.descripcion || '',
                debito: Number(t.debito || 0),
                credito: Number(t.credito || 0),
                monto_abs: Number(t.monto_abs || 0),
                categoria_predicha: t.categoria_predicha || '',
                es_anomalia: Boolean(t.es_anomalia),
                puntuacion_anomalia: Number(t.puntuacion_anomalia || 0),
                nivel_riesgo: t.nivel_riesgo || 'Bajo',
                z_score_monto: Number(t.z_score_monto || 0),
                tipo_movimiento: t.tipo_movimiento || 'Sin especificar',
                es_sospecha_duplicado: Boolean(t.es_sospecha_duplicado),
                segmento_monto: t.segmento_monto || '',
                x: Number(t.x ?? t.z_score_monto ?? 0),
                y: Number(t.y ?? t.monto_abs ?? 0)
            }));

            setTransacciones(datos);

            if (resTransacciones.data?.paginacion) {
                setPaginacion(resTransacciones.data.paginacion);
            }

            const puntos = Array.isArray(resScatter.data?.puntos) ? resScatter.data.puntos : [];
            setScatter(
                puntos.map(t => ({
                    ...t,
                    id: t.id,
                    x: Number(t.x ?? t.z_score_monto ?? 0),
                    y: Number(t.y ?? t.monto_abs ?? 0),
                    z_score_monto: Number(t.z_score_monto ?? t.x ?? 0),
                    monto_abs: Number(t.monto_abs ?? t.y ?? 0),
                    puntuacion_anomalia: Number(t.puntuacion_anomalia || 0),
                    es_anomalia: Boolean(t.es_anomalia),
                    nivel_riesgo: t.nivel_riesgo || 'Bajo',
                    sector: t.sector || 'Sin sector',
                    cuenta: t.cuenta || 'Sin cuenta'
                }))
            );
        } catch (err) {
            console.error('Error cargando analítica:', err);
            setError(err.response?.data?.detail || err.message || 'No fue posible cargar la analítica.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (!carpetaId) return;
        cargarAnalitica();
    }, [carpetaId, pagina, filtrosActivos]);

    // ============================================================
    // FILTRADO LOCAL DE TRANSACCIONES PARA LA TABLA
    // ============================================================
    const transaccionesMostradas = useMemo(() => {
        if (!busquedaTabla.trim()) return transacciones;
        const q = busquedaTabla.toLowerCase().trim();

        return transacciones.filter(t =>
            `tx-${t.id}`.toLowerCase().includes(q) ||
            String(t.id).includes(q) ||
            t.sector.toLowerCase().includes(q) ||
            t.tipo_movimiento.toLowerCase().includes(q) ||
            t.cuenta.toLowerCase().includes(q) ||
            t.descripcion.toLowerCase().includes(q) ||
            t.nivel_riesgo.toLowerCase().includes(q)
        );
    }, [transacciones, busquedaTabla]);

    // ============================================================
    // MEMOS DE GRÁFICOS
    // ============================================================
    const sectores = useMemo(() => {
        const lista = kpis?.por_sector ? kpis.por_sector.map(item => item.sector).filter(Boolean) : [];
        return ['Todos', ...new Set(lista)];
    }, [kpis]);

    const tipos = useMemo(() => {
        const lista = kpis?.por_tipo_movimiento ? kpis.por_tipo_movimiento.map(item => item.tipo_movimiento).filter(Boolean) : [];
        return ['Todos', ...new Set(lista)];
    }, [kpis]);

    const riesgos = useMemo(() => ['Todos', ...Object.keys(COLORES_RIESGO)], []);

    const datosPie = useMemo(() => {
        if (!kpis?.distribucion_riesgo) return [];
        if (Array.isArray(kpis.distribucion_riesgo)) {
            return kpis.distribucion_riesgo.map(item => ({
                name: item.nivel_riesgo ?? item.riesgo ?? item.name,
                value: Number(item.total ?? item.cantidad ?? item.value ?? 0)
            }));
        }
        return Object.entries(kpis.distribucion_riesgo).map(([name, value]) => ({
            name,
            value: Number(value || 0)
        }));
    }, [kpis]);

    const metricas = useMemo(() => {
        const datosKpi = kpis?.kpis || {};
        return {
            total: Number(kpis?.total_transacciones ?? datosKpi.total_transacciones ?? datosKpi.total ?? paginacion.total ?? 0),
            anomalías: Number(datosKpi.total_anomalias ?? datosKpi.anomalias ?? 0),
            críticas: Number(datosKpi.total_criticas ?? datosKpi.criticas ?? 0),
            montoRiesgo: Number(datosKpi.monto_en_riesgo ?? 0),
            tea: Number(datosKpi.tea ?? 0),
            isc: Number(datosKpi.isc ?? 0)
        };
    }, [kpis, paginacion.total]);

    const cambiarPagina = nuevaPagina => {
        if (nuevaPagina < 1 || nuevaPagina > paginacion.total_paginas) return;
        setPagina(nuevaPagina);
    };

    if (cargando) {
        return (
            <div className="p-10 text-center text-slate-400">
                <Activity className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8B0D37]" />
                <p>Procesando indicadores ejecutivos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
                <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Error cargando analítica
                </div>
                <p className="text-sm mt-2">{error}</p>
                <button
                    onClick={cargarAnalitica}
                    className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    if (!kpis) return null;

    return (
        <div className="space-y-6 my-6">
            {/* PANEL DE FILTROS SUPERIOR */}
            <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-[#8B0D37]" />
                            <h2 className="text-sm font-bold text-white">Filtros de análisis</h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Selecciona las variables y presiona "Aplicar Filtros" para actualizar los resultados.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={reiniciarFiltros}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restablecer
                        </button>

                        <button
                            onClick={aplicarFiltros}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B0D37] hover:bg-[#5C0924] text-white text-xs font-bold transition-all shadow-md shadow-[#5C0924]/30"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Aplicar Filtros
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-300">Sector</label>
                        <select
                            value={sectorTemp}
                            onChange={e => setSectorTemp(e.target.value)}
                            className="w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                        >
                            {sectores.map(sector => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300">Tipo de movimiento</label>
                        <select
                            value={tipoTemp}
                            onChange={e => setTipoTemp(e.target.value)}
                            className="w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                        >
                            {tipos.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300">Nivel de riesgo</label>
                        <select
                            value={riesgoTemp}
                            onChange={e => setRiesgoTemp(e.target.value)}
                            className="w-full mt-1 bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                        >
                            {riesgos.map(riesgo => (
                                <option key={riesgo} value={riesgo}>{riesgo}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300">Buscar en API</label>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                value={busquedaTemp}
                                onChange={e => setBusquedaTemp(e.target.value)}
                                placeholder="Cuenta, descripción..."
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B0D37]"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Rango de Monto</span>
                            <span className="text-slate-200 font-semibold">
                                {montoMinTemp > 0 ? fmtMoney(montoMinTemp) : 'Min'} — {montoMaxTemp > 0 ? fmtMoney(montoMaxTemp) : 'Max'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                min="0"
                                value={montoMinTemp}
                                onChange={e => setMontoMinTemp(Number(e.target.value) || 0)}
                                placeholder="Mínimo"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                            />
                            <input
                                type="number"
                                min="0"
                                value={montoMaxTemp}
                                onChange={e => setMontoMaxTemp(Number(e.target.value) || 0)}
                                placeholder="Máximo"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Rango Z-Score</span>
                            <span className="text-slate-200 font-semibold">
                                {zscoreMinTemp !== 0 ? `${zscoreMinTemp.toFixed(2)}σ` : 'Min'} — {zscoreMaxTemp !== 0 ? `${zscoreMaxTemp.toFixed(2)}σ` : 'Max'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                step="0.1"
                                value={zscoreMinTemp}
                                onChange={e => setZscoreMinTemp(Number(e.target.value) || 0)}
                                placeholder="Mínimo"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                            />
                            <input
                                type="number"
                                step="0.1"
                                value={zscoreMaxTemp}
                                onChange={e => setZscoreMaxTemp(Number(e.target.value) || 0)}
                                placeholder="Máximo"
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-3 border-t border-slate-800">
                    <div className="flex flex-wrap gap-5">
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={soloAnomaliasTemp}
                                onChange={e => setSoloAnomaliasTemp(e.target.checked)}
                                className="accent-[#8B0D37]"
                            />
                            Solo anomalías
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={soloDuplicadosTemp}
                                onChange={e => setSoloDuplicadosTemp(e.target.checked)}
                                className="accent-[#8B0D37]"
                            />
                            <Copy className="w-3.5 h-3.5 text-amber-500" />
                            Solo posibles duplicados
                        </label>
                    </div>

                    <span className="text-xs text-slate-400">
                        Mostrando <strong className="text-white">{fmtNumber(transacciones.length)}</strong> de <strong className="text-white">{fmtNumber(paginacion.total)}</strong> transacciones
                    </span>
                </div>
            </div>

            {/* TARJETAS DE KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1E293B]/70 border border-slate-800 p-5 rounded-2xl shadow-xl relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">TEA (Exposición Anomalías)</span>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white">{metricas.tea.toFixed(2)}%</span>
                        <span className="text-xs text-slate-400">/ Meta: &lt; 3.0%</span>
                    </div>
                    <div className="mt-3 text-xs">
                        {metricas.tea <= 3 ? (
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Dentro de meta</span>
                        ) : (
                            <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Excede umbral</span>
                        )}
                    </div>
                </div>

                <div className="bg-[#1E293B]/70 border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">ISC (Severidad Crítica)</span>
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white">{metricas.isc.toFixed(2)}%</span>
                        <span className="text-xs text-slate-400">/ Meta: &lt; 10.0%</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Hallazgos críticos sobre total anómalos.</p>
                </div>

                <div className="bg-[#1E293B]/70 border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Monto Total en Riesgo</span>
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-extrabold text-white">{fmtMoney(metricas.montoRiesgo)}</div>
                    <p className="mt-3 text-xs text-slate-400">Volumen bajo investigación.</p>
                </div>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#1E293B]/70 border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-white">Matriz de Dispersión de Riesgo</h3>
                            <p className="text-xs text-slate-400 mt-1">Z-Score vs monto transaccionado</p>
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">Muestras: {scatter.length}</span>
                    </div>

                    <div className="h-80 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 15, right: 25, bottom: 25, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" dataKey="x" name="Z-Score" unit="σ" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                                <YAxis type="number" dataKey="y" name="Monto" stroke="#94A3B8" tick={{ fontSize: 11 }} tickFormatter={v => `$${Number(v).toLocaleString('es-NI')}`} />
                                <ZAxis type="number" range={[50, 350]} />
                                <Tooltip cursor={{ stroke: '#64748B', strokeDasharray: '4 4' }} content={({ active, payload }) => (
                                    <ChartTooltip active={active} payload={payload}>
                                        {data => (
                                            <>
                                                <p className="font-bold text-white mb-1">{data.cuenta || 'Sin cuenta'}</p>
                                                <p className="text-slate-300">Sector: {data.sector || 'Sin sector'}</p>
                                                <p className="text-slate-300">Monto: {fmtMoney(data.y)}</p>
                                                <p className="text-slate-300">Z-Score: {Number(data.x || 0).toFixed(2)}σ</p>
                                                <p className="font-semibold mt-1" style={{ color: COLORES_RIESGO[data.nivel_riesgo] || '#94A3B8' }}>
                                                    Riesgo: {data.nivel_riesgo || 'Bajo'}
                                                </p>
                                            </>
                                        )}
                                    </ChartTooltip>
                                )} />
                                <Scatter name="Transacciones" data={scatter}>
                                    {scatter.map((entry, index) => (
                                        <Cell key={`scatter-${entry.id || index}`} fill={entry.es_anomalia ? '#EF4444' : '#60A5FA'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#1E293B]/70 border border-slate-800 p-5 rounded-2xl shadow-xl">
                    <h3 className="text-sm font-bold text-white">Composición por Nivel de Riesgo</h3>
                    <p className="text-xs text-slate-400 mt-1">Distribución actual</p>
                    <div className="h-72 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={datosPie} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {datosPie.map(entry => (
                                        <Cell key={entry.name} fill={COLORES_RIESGO[entry.name] || '#64748B'} />
                                    ))}
                                </Pie>
                                <Tooltip content={({ active, payload }) => (
                                    <ChartTooltip active={active} payload={payload}>
                                        {data => (
                                            <>
                                                <p className="font-semibold text-white">{data.name}</p>
                                                <p className="text-slate-300 mt-1">Registros: {fmtNumber(data.value)}</p>
                                            </>
                                        )}
                                    </ChartTooltip>
                                )} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS CON BUSCADOR INCORPORADO */}
            <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-white">Transacciones Filtradas</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Registros obtenidos según los filtros activos.</p>
                    </div>

                    {/* BUSCADOR DENTRO DE LA TABLA */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={busquedaTabla}
                                onChange={e => setBusquedaTabla(e.target.value)}
                                placeholder="Filtrar en tabla (ID, sector, tipo...)"
                                className="bg-[#1E293B] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#8B0D37] w-60"
                            />
                        </div>

                        <span className="text-xs text-slate-400 shrink-0">
                            Pág. {paginacion.page} de {paginacion.total_paginas || 0}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-[#0F172A] text-slate-400">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Sector</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3 text-right">Z-Score</th>
                                <th className="px-4 py-3 text-right">Iso Score</th>
                                <th className="px-4 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {transaccionesMostradas.map(t => (
                                <tr key={t.id} className="hover:bg-slate-800/50 transition">
                                    <td className="px-4 py-3 font-semibold text-white">TX-{String(t.id).padStart(3, '0')}</td>
                                    <td className="px-4 py-3 text-slate-300">{t.sector}</td>
                                    <td className="px-4 py-3 text-slate-300">{t.tipo_movimiento}</td>
                                    <td className="px-4 py-3 text-right text-white font-semibold">{fmtMoney(t.monto_abs)}</td>
                                    <td className="px-4 py-3 text-right text-slate-300">{t.z_score_monto.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-slate-300">{t.puntuacion_anomalia.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                            style={{
                                                color: COLORES_RIESGO[t.nivel_riesgo] || '#F8FAFC',
                                                backgroundColor: `${COLORES_RIESGO[t.nivel_riesgo] || '#64748B'}22`
                                            }}
                                        >
                                            {t.es_anomalia ? 'Anomalía' : t.nivel_riesgo}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {!transaccionesMostradas.length && (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                        No se encontraron transacciones que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                <div className="flex items-center justify-between p-4 border-t border-slate-800">
                    <span className="text-xs text-slate-400">
                        Mostrando <strong className="text-white">{transaccionesMostradas.length}</strong> de <strong className="text-white">{fmtNumber(paginacion.total)}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => cambiarPagina(paginacion.page - 1)}
                            disabled={!paginacion.tiene_anterior}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold"
                        >
                            <ChevronLeft className="w-4 h-4" /> Anterior
                        </button>

                        <span className="text-xs text-slate-400 px-2">{paginacion.page} / {paginacion.total_paginas || 0}</span>

                        <button
                            onClick={() => cambiarPagina(paginacion.page + 1)}
                            disabled={!paginacion.tiene_siguiente}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold"
                        >
                            Siguiente <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}