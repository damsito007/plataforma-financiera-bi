// src/UserDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from './api';
import './App.css';

import BurbujaComentarios from './components/BurbujasComentarios';
import AnaliticaAvanzada from './components/AnaliticaAvanzada';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';

import {
  LogOut, BarChart2, ShieldCheck, Cpu, Activity, DollarSign,
  Layers, AlertCircle, Folder, ChevronLeft, ChevronRight, RefreshCw,
  FileSpreadsheet, FileText, Search, User, Clock, Eye, TrendingUp,
  Briefcase, PieChart as PieIcon, HelpCircle, Sun, Moon
} from 'lucide-react';

export default function UserDashboard({ usuarioSesion, onLogout }) {
  // Tema Claro / Oscuro
  const [modoClaro, setModoClaro] = useState(false);

  // Carpetas disponibles
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);

  // Historial de archivos de la carpeta
  const [historialArchivos, setHistorialArchivos] = useState([]);
  const [archivoSeleccionadoAnálisis, setArchivoSeleccionadoAnálisis] = useState(null);

  // Buscador y Paginación de Archivos (Límite 10)
  const [busquedaArchivo, setBusquedaArchivo] = useState('');
  const [paginaArchivos, setPaginaArchivos] = useState(1);
  const LIMITE_ARCHIVOS = 10;

  // Resumen contable y analítica de registros
  const [resumenData, setResumenData] = useState(null);
  const [dataAnaliticaRegistros, setDataAnaliticaRegistros] = useState({
    evolucion_mensual: [],
    top_cuentas: [],
    centros_costo: []
  });

  const [cargandoCarpetas, setCargandoCarpetas] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');

  // Paginación interna del dashboard
  const [paginaDashboard, setPaginaDashboard] = useState(1);

  // Formateadores de Moneda (Dólares y Córdobas)
  const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const formatCordobas = (val) =>
    new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 0 }).format(val || 0).replace('NIO', 'C$');

  const formatNumber = (val) =>
    new Intl.NumberFormat('en-US').format(val || 0);

  const formatFechaHora = (fechaIso) => {
    if (!fechaIso) return 'Fecha no disp.';
    const date = new Date(fechaIso);
    return date.toLocaleString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Cargar las carpetas disponibles al montar
  useEffect(() => {
    const cargarCarpetas = async () => {
      try {
        setCargandoCarpetas(true);
        setErrorCarga('');

        const respuesta = await api.get('/api/carpetas');
        const lista = Array.isArray(respuesta.data) ? respuesta.data : [];

        setCarpetas(lista);

        if (lista.length > 0) {
          setCarpetaSeleccionada(lista[0]);
        } else {
          setCarpetaSeleccionada(null);
          setResumenData(null);
        }
      } catch (error) {
        console.error('Error al obtener carpetas:', error);
        setErrorCarga('No se pudieron cargar las carpetas disponibles.');
      } finally {
        setCargandoCarpetas(false);
      }
    };

    cargarCarpetas();
  }, []);

  // Cargar el historial de archivos y resumen cuando cambia la carpeta o el archivo seleccionado
  useEffect(() => {
    if (!carpetaSeleccionada?.id) {
      setResumenData(null);
      setHistorialArchivos([]);
      return;
    }

    cargarHistorialDeCarpeta(carpetaSeleccionada.id);
    cargarAnaliticaRegistros(carpetaSeleccionada.id, archivoSeleccionadoAnálisis?.id);
    setPaginaDashboard(1);
    setBusquedaArchivo('');
    setPaginaArchivos(1);
  }, [carpetaSeleccionada, archivoSeleccionadoAnálisis]);

  const cargarHistorialDeCarpeta = async (carpetaId) => {
    try {
      setCargandoResumen(true);
      setErrorCarga('');

      const respuesta = await api.get(`/api/historial?carpeta_id=${carpetaId}`);
      const historial = Array.isArray(respuesta.data) ? respuesta.data : [];
      setHistorialArchivos(historial);

      if (historial.length > 0) {
        const totalRegistros = historial.reduce((acc, a) => acc + (a.total_registros || 0), 0);
        const totalAnomalias = historial.reduce((acc, a) => acc + (a.total_anomalias || 0), 0);
        const totalDebito = historial.reduce((acc, a) => acc + (a.total_debito || 0), 0);
        const totalCredito = historial.reduce((acc, a) => acc + (a.total_credito || 0), 0);

        setResumenData({
          total_registros: totalRegistros,
          total_anomalias: totalAnomalias,
          total_debito: totalDebito,
          total_credito: totalCredito
        });
      } else {
        setResumenData(null);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setErrorCarga('No se pudieron cargar los datos de esta carpeta.');
      setResumenData(null);
    } finally {
      setCargandoResumen(false);
    }
  };

  const cargarAnaliticaRegistros = async (carpetaId, archivoId = null) => {
    try {
      const query = archivoId ? `?archivo_id=${archivoId}` : '';
      const res = await api.get(`/api/carpetas/${carpetaId}/analitica-registros${query}`);
      setDataAnaliticaRegistros(res.data);
    } catch (err) {
      console.error("Error al cargar analítica de registros:", err);
    }
  };

  // Filtrado de archivos por el buscador
  const archivosFiltrados = useMemo(() => {
    return historialArchivos.filter(a =>
      a.nombre_archivo.toLowerCase().includes(busquedaArchivo.toLowerCase())
    );
  }, [historialArchivos, busquedaArchivo]);

  const totalPaginasArchivos = Math.ceil(archivosFiltrados.length / LIMITE_ARCHIVOS) || 1;
  const archivosPaginados = useMemo(() => {
    const inicio = (paginaArchivos - 1) * LIMITE_ARCHIVOS;
    return archivosFiltrados.slice(inicio, inicio + LIMITE_ARCHIVOS);
  }, [archivosFiltrados, paginaArchivos]);

  // Datos para los gráficos
  const chartSaldosData = resumenData ? [
    { name: 'Balance General', Débito: resumenData.total_debito, Crédito: resumenData.total_credito }
  ] : [];

  const totalNormales = resumenData ? Math.max(0, resumenData.total_registros - resumenData.total_anomalias) : 0;
  const chartPieAnomalias = resumenData ? [
    { name: 'Normales', value: totalNormales, color: '#10b981' },
    { name: 'Alertas IA', value: resumenData.total_anomalias, color: '#ef4444' }
  ] : [];

  const saludPorcentaje = resumenData && resumenData.total_registros > 0
    ? ((1 - (resumenData.total_anomalias / resumenData.total_registros)) * 100).toFixed(1)
    : '100.0';

  const porcentajeAnomaliaNum = resumenData && resumenData.total_registros > 0
    ? ((resumenData.total_anomalias / resumenData.total_registros) * 100).toFixed(1)
    : 0;

  // Estilo personalizado para Tooltips en Recharts
  const customTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
    padding: '10px 14px'
  };

  const customLabelStyle = {
    color: '#1e293b', // Azul Grafito / Dark Charcoal
    fontWeight: 'bold',
    fontSize: '12px',
    marginBottom: '4px'
  };

  const cambiarCarpeta = (evento) => {
    const id = Number(evento.target.value);
    const encontrada = carpetas.find(c => Number(c.id) === id);
    if (encontrada) {
      setCarpetaSeleccionada(encontrada);
      setArchivoSeleccionadoAnálisis(null);
    }
  };

  // Clases CSS dinámicas según el tema
  const bgMain = modoClaro ? 'bg-slate-100 text-slate-900' : 'bg-[#1E293B] text-slate-100';
  const cardBg = modoClaro ? 'bg-white border-slate-200 text-slate-800 shadow-lg' : 'bg-[#1E293B]/70 border-slate-800 text-slate-100 shadow-xl';
  const subCardBg = modoClaro ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B] border-slate-800';
  const inputBg = modoClaro ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1E293B] border-slate-800 text-white';

  return (
    <div className={`min-h-screen ${bgMain} p-4 md:p-8 font-sans relative transition-colors duration-300`}>

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#5C0924]/80 backdrop-blur-md p-4 px-6 rounded-2xl border border-slate-800/80 shadow-2xl relative z-10 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#8B0D37] to-[#5C0924] rounded-xl shadow-lg shadow-[#8B0D37]/30">
            <Cpu size={22} className="text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">
              Panel de Inteligencia Financiera
            </h1>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs text-slate-300 font-medium">
                Usuario: <span className="text-white font-bold">{usuarioSesion?.username || 'Usuario'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* TOGGLE MODO CLARO / OSCURO */}
          <button
            onClick={() => setModoClaro(!modoClaro)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all border border-white/20"
            title="Cambiar tema"
          >
            {modoClaro ? <Moon size={15} /> : <Sun size={15} />}
            <span>{modoClaro ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-semibold rounded-xl transition-all"
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* SELECTOR DE CARPETAS */}
      <div className={`max-w-7xl mx-auto mb-8 ${cardBg} p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10`}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Folder className="text-[#8B0D37]" size={22} />
          <div className="w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
              Consultar Carpeta / Proyecto
            </span>

            <select
              id="carpeta-usuario"
              value={carpetaSeleccionada?.id || ''}
              onChange={cambiarCarpeta}
              disabled={cargandoCarpetas || carpetas.length === 0}
              className={`${inputBg} font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B0D37] w-full sm:w-auto disabled:opacity-50`}
            >
              {cargandoCarpetas ? (
                <option value="">Cargando carpetas...</option>
              ) : carpetas.length === 0 ? (
                <option value="">No hay carpetas disponibles</option>
              ) : (
                carpetas.map((carpeta) => (
                  <option key={carpeta.id} value={carpeta.id}>
                    {carpeta.nombre} ({carpeta.sector})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {carpetaSeleccionada && (
            <span className="text-xs px-3 py-1.5 bg-[#8B0D37]/10 border border-[#8B0D37]/30 rounded-xl font-semibold text-[#8B0D37]">
              Sector: {carpetaSeleccionada.sector || 'No especificado'}
            </span>
          )}

          {cargandoResumen && <RefreshCw size={16} className="text-[#8B0D37] animate-spin" />}
        </div>
      </div>

      {/* MENSAJES DE ERROR */}
      {errorCarga && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs relative z-10 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{errorCarga}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

        {/* COLUMNA IZQUIERDA: LISTA DE ARCHIVOS PARA CONSULTA INDIVIDUAL */}
        <div className="lg:col-span-4 space-y-6">
          {historialArchivos.length > 0 ? (
            <div className={`${cardBg} rounded-2xl p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <FileText size={15} className="text-[#8B0D37]" />
                  Archivos en esta Carpeta ({historialArchivos.length})
                </h3>

                {archivoSeleccionadoAnálisis && (
                  <button
                    onClick={() => setArchivoSeleccionadoAnálisis(null)}
                    className="text-[11px] font-semibold text-[#8B0D37] hover:underline flex items-center gap-1"
                  >
                    <Eye size={12} /> Ver resumen general
                  </button>
                )}
              </div>

              {/* BUSCADOR */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar archivo por nombre..."
                  value={busquedaArchivo}
                  onChange={(e) => {
                    setBusquedaArchivo(e.target.value);
                    setPaginaArchivos(1);
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl ${inputBg} focus:outline-none focus:border-[#8B0D37]`}
                />
              </div>

              {/* LISTA PAGINADA DE ARCHIVOS */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {archivosPaginados.map((a) => {
                  const esSeleccionado = archivoSeleccionadoAnálisis?.id === a.id;

                  return (
                    <div
                      key={a.id}
                      onClick={() => setArchivoSeleccionadoAnálisis(a)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        esSeleccionado
                          ? 'bg-[#8B0D37]/15 border-[#8B0D37] shadow-sm'
                          : `${subCardBg} hover:border-slate-500`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold truncate pr-2 flex items-center gap-1.5">
                          <FileSpreadsheet size={13} className={esSeleccionado ? 'text-[#8B0D37]' : 'text-slate-400'} />
                          <span className="truncate">{a.nombre_archivo}</span>
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{a.total_registros} reg • {a.total_anomalias} alertas</span>
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-rose-400">{formatCordobas(a.total_debito)}</span>
                          <span className="font-semibold text-emerald-400">{formatMoney(a.total_credito)}</span>
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-700/40 text-[9px] text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          <span>{a.usuario?.username || 'Sistema'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{formatFechaHora(a.fecha_subida)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {archivosFiltrados.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">No se encontraron archivos.</p>
                )}
              </div>

              {/* PAGINACIÓN DE ARCHIVOS */}
              {totalPaginasArchivos > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                  <span className="text-[10px] text-slate-400">
                    Pág. {paginaArchivos} de {totalPaginasArchivos}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPaginaArchivos(p => Math.max(1, p - 1))}
                      disabled={paginaArchivos === 1}
                      className="p-1 rounded-lg border border-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPaginaArchivos(p => Math.min(totalPaginasArchivos, p + 1))}
                      disabled={paginaArchivos === totalPaginasArchivos}
                      className="p-1 rounded-lg border border-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`${cardBg} rounded-2xl p-6 text-center text-xs text-slate-400`}>
              No hay libros cargados en esta carpeta.
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: DASHBOARD Y ANALÍTICA */}
        <div className="lg:col-span-8">
          {resumenData ? (
            <div className="space-y-4">

              {/* ENCABEZADO DE SELECCIÓN DE VISTA */}
              <div className={`${cardBg} p-3 px-4 rounded-xl flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-[#8B0D37]" />
                  <span className="text-xs font-bold">
                    {archivoSeleccionadoAnálisis
                      ? `Análisis de: ${archivoSeleccionadoAnálisis.nombre_archivo}`
                      : `Resumen General del Proyecto (${historialArchivos.length} archivos)`}
                  </span>
                </div>

                {archivoSeleccionadoAnálisis && (
                  <button
                    onClick={() => setArchivoSeleccionadoAnálisis(null)}
                    className="px-2.5 py-1 bg-[#8B0D37] text-white rounded-lg text-[11px] font-semibold hover:bg-[#5C0924] transition-all"
                  >
                    Ver resumen general del proyecto
                  </button>
                )}
              </div>

              <div className="min-h-[580px]">
                {paginaDashboard === 1 && (
                  <div className="space-y-6">

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`${cardBg} p-4 rounded-2xl relative`}>
                        <span className="text-xs text-slate-400 font-medium">Registros Ingestados</span>
                        <h4 className="text-2xl font-black text-[#1591EA] mt-2">
                          {formatNumber(archivoSeleccionadoAnálisis ? archivoSeleccionadoAnálisis.total_registros : resumenData.total_registros)}
                        </h4>
                      </div>

                      <div className={`${cardBg} p-4 rounded-2xl relative`}>
                        <span className="text-xs text-slate-400 font-medium">Anomalías Detectadas</span>
                        <h4 className="text-2xl font-black text-red-500 mt-2">
                          {formatNumber(archivoSeleccionadoAnálisis ? archivoSeleccionadoAnálisis.total_anomalias : resumenData.total_anomalias)}
                        </h4>
                      </div>

                      <div className={`${cardBg} p-4 rounded-2xl relative`}>
                        <span className="text-xs text-slate-400 font-medium">Salud del Libro</span>
                        <h4 className="text-2xl font-black text-emerald-500 mt-2">
                          {saludPorcentaje}%
                        </h4>
                      </div>
                    </div>

                    {/* SECCIÓN 1: EVOLUCIÓN MENSUAL */}
                    <div className={`${cardBg} p-5 rounded-2xl relative`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold flex items-center gap-1.5">
                          <TrendingUp size={18} className="text-blue-400" />
                          <span>Evolución Mensual de Ingesta y Anomalías</span>
                          <span title="Muestra el volumen total de transacciones procesadas mes a mes frente al número de irregularidades detectadas por la IA.">
                            <HelpCircle size={14} className="text-slate-400 hover:text-blue-400 cursor-pointer ml-1" />
                          </span>
                        </h4>
                        <BurbujaComentarios graficoId="admin_evolucion_mensual" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                      </div>

                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dataAnaliticaRegistros.evolucion_mensual}>
                            <defs>
                              <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorAno" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={customTooltipStyle} labelStyle={customLabelStyle} />
                            <Legend />
                            <Area type="monotone" dataKey="total_registros" name="Total Registros" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReg)" />
                            <Area type="monotone" dataKey="anomalias" name="Anomalías / Alertas" stroke="#ef4444" fillOpacity={1} fill="url(#colorAno)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* SECCIÓN 2: CONSOLIDADO CONTABLE + ANÁLISIS DE ANOMALÍAS */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                      {/* CONSOLIDADO CONTABLE */}
                      <div className={`md:col-span-7 ${cardBg} p-5 rounded-2xl relative`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold flex items-center gap-1.5">
                            <DollarSign size={18} className="text-emerald-500" />
                            <span>Balance General (Débito C$ vs Crédito $)</span>
                            <span title="Compara el monto total de Débitos (en Córdobas C$) frente a los Créditos (en Dólares $USD) cargados en el proyecto.">
                              <HelpCircle size={14} className="text-slate-400 hover:text-emerald-400 cursor-pointer ml-1" />
                            </span>
                          </h4>
                          <BurbujaComentarios graficoId="admin_consolidado_contable" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartSaldosData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip
                                contentStyle={customTooltipStyle}
                                labelStyle={customLabelStyle}
                                formatter={(val, name) => [
                                  name === 'Débito' ? formatCordobas(val) : formatMoney(val),
                                  name
                                ]}
                              />
                              <Legend />
                              <Bar dataKey="Débito" name="Débito (C$)" stackId="a" fill="#8B0D37" radius={[0, 0, 4, 4]} barSize={45} />
                              <Bar dataKey="Crédito" name="Crédito ($)" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} barSize={45} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* TASA DE ANOMALÍAS */}
                      <div className={`md:col-span-5 ${cardBg} p-5 rounded-2xl relative flex flex-col justify-between`}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold flex items-center gap-1.5">
                            <PieIcon size={18} className="text-red-400" />
                            <span>Tasa de Anomalías</span>
                            <span title="Muestra la proporción porcentual entre transacciones contables normales y registros marcados con bandera de alerta por la IA.">
                              <HelpCircle size={14} className="text-slate-400 hover:text-red-400 cursor-pointer ml-1" />
                            </span>
                          </h4>
                          <BurbujaComentarios graficoId="admin_analisis_anomalias" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-44 relative my-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartPieAnomalias}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={68}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {chartPieAnomalias.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={customTooltipStyle} labelStyle={customLabelStyle} />
                            </PieChart>
                          </ResponsiveContainer>

                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-red-500">{porcentajeAnomaliaNum}%</span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Riesgo</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* SECCIÓN 3: TOP 10 CUENTAS Y CENTROS DE COSTO */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                      {/* TOP 10 CUENTAS */}
                      <div className={`md:col-span-7 ${cardBg} p-5 rounded-2xl relative`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold flex items-center gap-1.5">
                            <Layers size={18} className="text-[#8B0D37]" />
                            <span>Top 10 Cuentas Contables Afectadas</span>
                            <span title="Ranking de las 10 cuentas del catálogo contable que concentran la mayor cantidad de registros con anomalías.">
                              <HelpCircle size={14} className="text-slate-400 hover:text-[#8B0D37] cursor-pointer ml-1" />
                            </span>
                          </h4>
                          <BurbujaComentarios graficoId="admin_top_cuentas" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataAnaliticaRegistros.top_cuentas} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                              <XAxis type="number" stroke="#64748b" fontSize={10} />
                              <YAxis dataKey="cuenta" type="category" stroke="#94a3b8" fontSize={10} width={130} tickFormatter={(v) => v.length > 18 ? `${v.substring(0, 18)}...` : v} />
                              <Tooltip contentStyle={customTooltipStyle} labelStyle={customLabelStyle} />
                              <Bar dataKey="anomalias" name="Anomalías" fill="#8B0D37" radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* CENTROS DE COSTO */}
                      <div className={`md:col-span-5 ${cardBg} p-5 rounded-2xl relative`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold flex items-center gap-1.5">
                            <Briefcase size={18} className="text-emerald-400" />
                            <span>Centros de Costo</span>
                            <span title="Distribución del número de anomalías contables detectadas agrupadas por centro de costo o departamento operativo.">
                              <HelpCircle size={14} className="text-slate-400 hover:text-emerald-400 cursor-pointer ml-1" />
                            </span>
                          </h4>
                          <BurbujaComentarios graficoId="admin_centros_costo" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataAnaliticaRegistros.centros_costo}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="centro" stroke="#64748b" fontSize={9} tickFormatter={(v) => v.length > 10 ? `${v.substring(0, 10)}...` : v} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip contentStyle={customTooltipStyle} labelStyle={customLabelStyle} />
                              <Bar dataKey="anomalias" name="Anomalías" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {paginaDashboard === 2 && carpetaSeleccionada?.id && (
                  <AnaliticaAvanzada carpetaId={carpetaSeleccionada.id} />
                )}
              </div>

              {/* CONTROLES DE NAVEGACIÓN DERECHA */}
              <div className={`${cardBg} p-3 rounded-2xl flex items-center justify-between`}>
                <span className="text-xs text-slate-400 font-semibold">Vista {paginaDashboard} de 2</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaDashboard(1)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${paginaDashboard === 1 ? 'bg-[#8B0D37] text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    1. Resumen Consolidado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaDashboard(2)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${paginaDashboard === 2 ? 'bg-[#5C0924] text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    2. Analítica Avanzada
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`${cardBg} border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[380px]`}>
              <ShieldCheck size={48} className="text-slate-400 mb-3" />
              <h3 className="text-base font-bold mb-1">Sin Registros Disponibles</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Seleccione una carpeta o proyecto activo para explorar su consolidado contable y alertas de IA.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}