// src/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import './App.css';
import BurbujaComentarios from './components/BurbujasComentarios';
import AnaliticaAvanzada from './components/AnaliticaAvanzada';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, LogOut, RefreshCw,
  BarChart2, ShieldCheck, Database, Cpu, Activity, DollarSign, Layers, Check,
  FolderPlus, Folder, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function AdminDashboard({ usuarioSesion, onLogout }) {
  // Estados para Carpetas / Proyectos
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState('');
  const [nuevaCarpetaSector, setNuevaCarpetaSector] = useState('Telecomunicaciones');
  const [mostrarModalNuevaCarpeta, setMostrarModalNuevaCarpeta] = useState(false);

  // Estados para Carga de Archivos e Ingesta
  const [archivo, setArchivo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [procesando, setProcesando] = useState(false);
  const [faseCarga, setFaseCarga] = useState(false);

  // Datos devueltos desde Supabase
  const [historialArchivos, setHistorialArchivos] = useState([]);
  const [resumenData, setResumenData] = useState(null);

  // Formateadores monetarios y numéricos
  const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const formatNumber = (val) =>
    new Intl.NumberFormat('en-US').format(val || 0);

  // Paginación interna del dashboard derecho
  const [paginaDashboard, setPaginaDashboard] = useState(1);
  const totalPaginasDashboard = 2;
  // Cargar carpetas al montar el componente
  useEffect(() => {
    cargarCarpetas();
  }, []);

  // Cargar historial de la carpeta seleccionada
 useEffect(() => {
  if (carpetaSeleccionada) {
    cargarHistorialDeCarpeta(carpetaSeleccionada.id);

    // Cada proyecto comienza mostrando el dashboard principal
    setPaginaDashboard(1);
  }
}, [carpetaSeleccionada]);

  const cargarCarpetas = async () => {
    try {
      const res = await api.get('/api/carpetas');
      setCarpetas(res.data);
      if (res.data.length > 0 && !carpetaSeleccionada) {
        setCarpetaSeleccionada(res.data[0]);
      }
    } catch (err) {
      console.error("Error al obtener carpetas:", err);
    }
  };

  const cargarHistorialDeCarpeta = async (carpetaId) => {
    try {
      const res = await api.get(`/api/historial?carpeta_id=${carpetaId}`);
      setHistorialArchivos(res.data);

      // Calcular totales acumulados para los gráficos
      if (res.data.length > 0) {
        const totalRegistros = res.data.reduce((acc, a) => acc + (a.total_registros || 0), 0);
        const totalAnomalias = res.data.reduce((acc, a) => acc + (a.total_anomalias || 0), 0);
        const totalDebito = res.data.reduce((acc, a) => acc + (a.total_debito || 0), 0);
        const totalCredito = res.data.reduce((acc, a) => acc + (a.total_credito || 0), 0);

        setResumenData({
          total_registros: totalRegistros,
          total_anomalias: totalAnomalias,
          total_debito: totalDebito,
          total_credito: totalCredito
        });
      } else {
        setResumenData(null);
      }
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  };

  const crearCarpeta = async (e) => {
    e.preventDefault();
    if (!nuevaCarpetaNombre.trim()) return;

    try {
      const formData = new FormData();
      formData.append('nombre', nuevaCarpetaNombre);
      formData.append('sector', nuevaCarpetaSector);

      const res = await api.post('/api/carpetas', formData);
      setCarpetas([res.data, ...carpetas]);
      setCarpetaSeleccionada(res.data);
      setNuevaCarpetaNombre('');
      setMostrarModalNuevaCarpeta(false);
    } catch (err) {
      alert("No se pudo crear la carpeta");
    }
  };

  const manejarCambioArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setMensaje({ texto: '', tipo: '' });
    }
  };

  const manejarDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const manejarDragLeave = () => {
    setIsDragging(false);
  };

  const formatCordobas = (valor) =>
  new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor || 0);
  
  const manejarDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivo(e.dataTransfer.files[0]);
      setMensaje({ texto: '', tipo: '' });
    }
  };

const enviarExcelAlPipeline = async (e) => {
  e.preventDefault();

  if (!archivo || !carpetaSeleccionada) return;

  setProcesando(true);
  setMensaje({ texto: '', tipo: '' });

  const formData = new FormData();
  formData.append('file', archivo);

  try {
    setFaseCarga(true);

    const respuesta = await api.post(
      `/api/carpetas/${carpetaSeleccionada.id}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    setTimeout(() => {
      setMensaje({
        texto: respuesta.data.mensaje || 'Pipeline ejecutado con éxito.',
        tipo: 'success'
      });

      setArchivo(null);
      cargarHistorialDeCarpeta(carpetaSeleccionada.id);

      setFaseCarga(false);
      setProcesando(false);
    }, 1800);

  } catch (err) {
    console.error('ERROR COMPLETO:', err);
    console.error('RESPUESTA DEL BACKEND:', err.response?.data);

    setFaseCarga(false);
    setProcesando(false);

    setMensaje({
      texto:
        err.response?.data?.detail ||
        err.message ||
        'Error desconocido ejecutando el pipeline.',
      tipo: 'error'
    });
  }
};



  const eliminarArchivo = async (archivoId) => {
    if (!confirm("¿Deseas eliminar este archivo y sus datos en Supabase?")) return;

    try {
      await api.delete(`/api/historial/${archivoId}`);
      cargarHistorialDeCarpeta(carpetaSeleccionada.id);
    } catch (err) {
      alert("Error al eliminar el archivo");
    }
  };

  // --- PANTALLA DE CARGA / PIPELINE DE ML ---
  if (faseCarga) {
    return (
      <div className="min-h-screen bg-[#1E293B] flex flex-col items-center justify-center text-white relative overflow-hidden font-sans">
        <div className="absolute w-96 h-96 bg-[#8B0D37]/20 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
        <div className="absolute w-96 h-96 bg-[#5C0924]/20 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none" />

        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-800 p-10 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full z-10 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-40 animate-pulse" />
            <RefreshCw className="animate-spin text-[#FDF2F5] relative z-10" size={56} />
          </div>

          <h3 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-[#FDF2F5] to-teal-300 bg-clip-text text-transparent mb-2">
            Ejecutando Pipeline de IA
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Sincronizando con Supabase PostgreSQL y ejecutando modelo Isolation Forest.
          </p>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-[#5C0924] h-full w-full animate-pulse" />
          </div>

          <div className="space-y-2 text-left w-full text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check size={14} /> Ingesta e higienización de libro contable
            </div>
            <div className="flex items-center gap-2 text-[#FDF2F5] animate-pulse">
              <Cpu size={14} /> Evaluación con Isolation Forest ({carpetaSeleccionada?.sector})
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Activity size={14} /> Inyección en Supabase y compilación de KPIs
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PREPARACIÓN DE DATOS PARA GRÁFICOS ---
  const chartSaldosData = resumenData ? [
    { name: 'Saldos Globales', Débito: resumenData.total_debito, Crédito: resumenData.total_credito }
  ] : [];

  const totalNormales = resumenData ? Math.max(0, resumenData.total_registros - resumenData.total_anomalias) : 0;
  const chartPieAnomalias = resumenData ? [
    { name: 'Transacciones Normales', value: totalNormales, color: '#8B0D37' },
    { name: 'Anomalías / Alertas', value: resumenData.total_anomalias, color: '#ef4444' }
  ] : [];

  const saludPorcentaje = resumenData && resumenData.total_registros > 0
    ? ((1 - (resumenData.total_anomalias / resumenData.total_registros)) * 100).toFixed(1)
    : 100;

  return (
    <div className="min-h-screen bg-[#1E293B] text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#5C0924]/60 backdrop-blur-md p-4 px-6 rounded-2xl border border-slate-800/80 shadow-2xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#8B0D37] to-[#5C0924] rounded-xl shadow-lg shadow-[#8B0D37]/30">
            <Cpu size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Panel de Control y Pipeline de Auditoría
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs text-slate-400 font-medium">
                Admin: <span className="text-slate-200">{usuarioSesion?.username || 'Administrador'}</span>
              </p>
            </div>
          </div>
        </div>

        <button
  onClick={onLogout}
  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-red-500/10 text-emerald-400 hover:text-red-400 border border-emerald-500/30 hover:border-red-500/30 text-xs font-semibold rounded-xl transition-all duration-200"
>
  <LogOut size={15} /> Cerrar Sesión
</button>
      </nav>

      {/* BARRA DE SELECCIÓN DE PROYECTO / CARPETA */}
     
      <div className="max-w-7xl mx-auto mb-8 bg-[#1E293B]/80 backdrop-blur-md p-4 rounded-2xl border shadow-xl shadow-[#5C0924]/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Folder className="text-[#FDF2F5]" size={20} />
          <div className="w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
              Carpeta / Proyecto Activo
            </span>
            <select
              value={carpetaSeleccionada?.id || ''}
              onChange={(e) => {
                const encontrada = carpetas.find(c => c.id === parseInt(e.target.value));
                setCarpetaSeleccionada(encontrada);
              }}
              
className="bg-[#8B0D37]/20 border text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B0D37] focus:ring-1 focus:ring-[#8B0D37]/50 w-full sm:w-auto"
            >
              {carpetas.length === 0 ? (
                <option value="">No hay proyectos creados</option>
              ) : (
                carpetas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.sector})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {carpetaSeleccionada && (
            <span className="text-xs px-3 py-1.5 bg-[#1E293B] border border-slate-800 rounded-xl font-semibold text-[#FDF2F5]">
              Sector: {carpetaSeleccionada.sector}
            </span>
          )}

          <button
            onClick={() => setMostrarModalNuevaCarpeta(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#8B0D37]/20 hover:bg-[#8B0D37]/30 text-[#FDF2F5] border border-[#8B0D37]/50 rounded-xl text-xs font-semibold transition-all"
          >
            <FolderPlus size={16} />
            <span>Nueva Carpeta</span>
          </button>
        </div>
      </div>

     {/* ============================================================
    MAIN CONTAINER
    ============================================================ */}
<main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

  {/* ============================================================
      COLUMNA IZQUIERDA: CARGA DE ARCHIVO
      ============================================================ */}
  <div className="lg:col-span-4 space-y-6">

    {/* TARJETA DE INGESTA */}
    <div className="bg-[#1E293B]/70 backdrop-blur-md border  rounded-2xl p-6 shadow-xl shadow-[#5C0924]/10 relative overflow-hidden">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Database size={18} className="text-[#FDF2F5]" />
          Ingesta de Libros
        </h2>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#8B0D37]/15 text-[#FDF2F5] border border-[#8B0D37]/30 rounded-md">
          .xlsx / .csv
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        Cargue los libros contables para disparar la ingesta en Supabase y la evaluación con Isolation Forest.
      </p>

      {mensaje.texto && (
        <div
          className={`mb-5 p-3.5 rounded-xl flex items-start gap-3 border text-xs shadow-inner transition-all ${
            mensaje.tipo === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {mensaje.tipo === 'success' ? (
            <CheckCircle2
              size={18}
              className="shrink-0 text-emerald-400 mt-0.5"
            />
          ) : (
            <AlertCircle
              size={18}
              className="shrink-0 text-red-400 mt-0.5"
            />
          )}

          <span className="leading-tight">
            {mensaje.texto}
          </span>
        </div>
      )}

      <form
        onSubmit={enviarExcelAlPipeline}
        className="space-y-4"
      >

        <div
          onDragOver={manejarDragOver}
          onDragLeave={manejarDragLeave}
          onDrop={manejarDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 relative group cursor-pointer ${
            isDragging
              ? 'border-[#8B0D37] bg-[#8B0D37]/15 scale-[1.01]'
              : archivo
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700/80 hover:border-slate-500 bg-[#1E293B]/40'
          }`}
        >

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={manejarCambioArchivo}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
            disabled={procesando || !carpetaSeleccionada}
          />

          <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">

            <div
              className={`p-3 rounded-full transition-transform group-hover:scale-110 ${
                archivo
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {archivo ? (
                <FileSpreadsheet size={28} />
              ) : (
                <Upload size={28} />
              )}
            </div>

            {archivo ? (
              <div className="space-y-1 max-w-full px-2">
                <p className="text-xs font-semibold text-emerald-400 truncate">
                  {archivo.name}
                </p>

                <p className="text-[10px] text-slate-500">
                  {(archivo.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-300">
                  Arrastra tu archivo aquí
                </p>

                <p className="text-[10px] text-slate-500 mt-1">
                  Soporta Excel (.xlsx) y CSV
                </p>
              </div>
            )}

          </div>
        </div>

       <button
  type="submit"
  disabled={!archivo || procesando || !carpetaSeleccionada}
  className="w-full py-3 bg-gradient-to-r from-[#5C0924] via-[#8B0D37] to-[#5C0924] hover:from-[#8B0D37] hover:via-[#A31345] hover:to-[#8B0D37] border border-[#8B0D37]/70 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-[#5C0924]/30 transition-all duration-300 flex items-center justify-center gap-2"
>
  {procesando ? (
    <>
      <RefreshCw className="animate-spin" size={16} />
      <span>Inyectando Pipeline...</span>
    </>
  ) : (
    <>
      <Cpu size={16} />
      <span>Ejecutar Pipeline de IA</span>
    </>
  )}
</button>

      </form>
    </div>


    {/* ============================================================
        TABLA DE ARCHIVOS
        ============================================================ */}
    {historialArchivos.length > 0 && (
      <div className="bg-[#1E293B]/70 backdrop-blur-md border  rounded-2xl p-4 shadow-xl">

        <h3 className="text-xs font-bold text-white mb-3">
          Archivos en este Proyecto
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">

          {historialArchivos.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-2.5 bg-[#1E293B] border  rounded-xl text-xs"
            >

              <div className="truncate pr-2">

                <p className="font-semibold text-slate-200 truncate">
                  {a.nombre_archivo}
                </p>

                <p className="text-[10px] text-slate-500">
                  {a.total_registros} reg • {a.total_anomalias} alertas
                </p>

              </div>

              <button
                onClick={() => eliminarArchivo(a.id)}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 shrink-0"
              >
                <Trash2 size={13} />
              </button>

            </div>
          ))}

        </div>
      </div>
    )}

  </div>


  {/* ============================================================
      COLUMNA DERECHA
      AQUÍ ESTÁ LA PAGINACIÓN
      ============================================================ */}
  <div className="lg:col-span-8">

    {resumenData ? (

      <div className="bg-[#1E293B]/20 rounded-2xl relative">

        {/* ========================================================
            CONTENEDOR DE LA VISTA
            ======================================================== */}
        <div className="min-h-[620px]">

          {/* ======================================================
              PÁGINA 1 — DASHBOARD PRINCIPAL
              ====================================================== */}
          {paginaDashboard === 1 && (

            <div className="space-y-6 animate-fade-in">

              {/* =========================
                  TARJETAS KPI
                  ========================= */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* KPI 1 */}
                <div className="bg-[#1E293B]/70 backdrop-blur-md border p-5 rounded-2xl shadow-xl relative overflow-hidden">

                  <div className="flex justify-between items-start">

                    <span className="text-white text-slate-400 font-medium">
                      Registros Ingestados
                    </span>

                    <div className="p-2 bg-[#8B0D37]/15 text-[#FDF2F5] rounded-lg">
                      <Layers size={18} />
                    </div>

                  </div>

                  <h4 className="text-2xl font-black text-[#8B0D37]/100 mt-3 tracking-tight">
                    {formatNumber(resumenData.total_registros)}
                  </h4>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Transacciones procesadas
                  </p>

                </div>


                {/* KPI 2 */}
                <div className="bg-[#1E293B]/70 backdrop-blur-md border p-5 rounded-2xl shadow-xl relative overflow-hidden">

                  <div className="flex justify-between items-start">

                    <span className="text-white text-slate-400 font-medium">
                      Anomalías Detectadas
                    </span>

                    <div
                      className={`p-2 rounded-lg ${
                        resumenData.total_anomalias > 0
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <AlertCircle size={18} />
                    </div>

                  </div>

                  <h4
                    className={`text-2xl font-black mt-3 tracking-tight ${
                      resumenData.total_anomalias > 0
                        ? 'text-red-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {formatNumber(resumenData.total_anomalias)}
                  </h4>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Evaluadas por Isolation Forest
                  </p>

                </div>


                {/* KPI 3 */}
                <div className="bg-[#1E293B]/70 backdrop-blur-md border  p-5 rounded-2xl shadow-xl relative overflow-hidden">

                  <div className="flex justify-between items-start">

                    <span className="text-white text-slate-400 font-medium">
                      Salud del Libro
                    </span>

                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Activity size={18} />
                    </div>

                  </div>

                  <h4 className="text-2xl font-black text-emerald-400 mt-3 tracking-tight">
                    {saludPorcentaje}%
                  </h4>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Registros libres de anomalías
                  </p>

                </div>

              </div>


              {/* ==================================================
                  GRÁFICOS PRINCIPALES
                  ================================================== */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* =================================================
                    GRÁFICO 1 — DÉBITO VS CRÉDITO
                    ================================================= */}
                <div className="md:col-span-7 bg-[#1E293B]/70 backdrop-blur-md border p-5 rounded-2xl shadow-xl relative">

                  <div className="flex items-center justify-between mb-4">

                    <div className="flex items-center gap-2">


                      <DollarSign
                        size={18}
                        className="text-[#0fb880ff]"
                      />

                      <h4 className="text-sm font-bold text-white">
                        Consolidado Contable
                      </h4>

                    </div>

                    <BurbujaComentarios
                      graficoId="admin_consolidado_contable"
                      carpetaId={carpetaSeleccionada?.id}
                      usuarioActual={usuarioSesion}
                    />

                  </div>


                  <div className="h-56">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <BarChart
                        data={chartSaldosData}
                        barGap={12}
                      >

                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#1e293b"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                        />

                        <YAxis
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) =>
                            `$${(v / 1000).toFixed(0)}k`
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [
                            formatMoney(value),
                            ''
                          ]}
                        />

                        <Bar
                          dataKey="Débito"
                          fill="#c21c48ff"
                          radius={[8, 8, 0, 0]}
                          barSize={40}
                        />

                        <Bar
                          dataKey="Crédito"
                          fill="#0fb880ff"
                          radius={[8, 8, 0, 0]}
                          barSize={40}
                        />

                      </BarChart>

                    </ResponsiveContainer>

                  </div>


                  <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800 text-xs">

                    <div>

                      <span className="text-slate-400 text-[11px]">
                        Total Débito:
                      </span>

                      <p className="font-bold text-[#c21c48ff]">
                      {`C$ ${Number(resumenData.total_debito || 0).toLocaleString('es-NI', {
                       minimumFractionDigits: 2,
                       maximumFractionDigits: 2
                      })}`}
                      </p>

                    </div>

                    <div>

                      <span className="text-slate-400 text-[11px]">
                        Total Crédito:
                      </span>

                      <p className="font-bold text-emerald-400">
                        {formatMoney(resumenData.total_credito)}
                      </p>

                    </div>

                  </div>

                </div>


                {/* =================================================
                    GRÁFICO 2 — ANOMALÍAS
                    ================================================= */}
                <div className="md:col-span-5 bg-[#1E293B]/70 backdrop-blur-md border p-5 rounded-2xl shadow-xl flex flex-col justify-between relative">

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <div className="flex items-center gap-2">

                        <BarChart2
                          size={18}
                          className="text-red-400"
                        />

                        <h4 className="text-sm font-bold text-white">
                          Análisis de Anomalías
                        </h4>

                      </div>

                      <BurbujaComentarios
                        graficoId="admin_analisis_anomalias"
                        carpetaId={carpetaSeleccionada?.id}
                        usuarioActual={usuarioSesion}
                      />

                    </div>

                    <p className="text-[11px] text-slate-400">
                      Isolation Forest ({carpetaSeleccionada?.sector})
                    </p>

                  </div>


                  <div className="h-44 my-2">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <PieChart>

                        <Pie
                          data={chartPieAnomalias}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={5}
                          dataKey="value"
                        >

                          {chartPieAnomalias.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="#0f172a"
                                strokeWidth={2}
                              />
                            )
                          )}

                        </Pie>

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            fontSize: '11px'
                          }}
                        />

                      </PieChart>

                    </ResponsiveContainer>

                  </div>


                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">

                    <div className="flex items-center justify-between">

                      <span className="flex items-center gap-1.5 text-slate-300">

                        <span className="w-2.5 h-2.5 rounded-full bg-[#8B0D37] inline-block" />

                        Normales

                      </span>

                      <span className="font-bold text-white">
                        {formatNumber(totalNormales)}
                      </span>

                    </div>


                    <div className="flex items-center justify-between">

                      <span className="flex items-center gap-1.5 text-slate-300">

                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />

                        Alertas

                      </span>

                      <span className="font-bold text-red-400">
                        {formatNumber(resumenData.total_anomalias)}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}


          {/* ======================================================
              PÁGINA 2 — ANALÍTICA AVANZADA
              ====================================================== */}
          {paginaDashboard === 2 && carpetaSeleccionada?.id && (

            <div className="animate-fade-in">

              <AnaliticaAvanzada
                carpetaId={carpetaSeleccionada.id}
              />

            </div>

          )}

        </div>


        {/* ========================================================
            NAVEGACIÓN / PAGINACIÓN
            ======================================================== */}
        <div className="mt-6 bg-[#1E293B]/80 backdrop-blur-md border rounded-2xl p-3 shadow-xl">

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

            {/* INFORMACIÓN DE LA VISTA */}
            <div className="flex items-center gap-2">

              <div className="p-2 bg-[#5C0924]/30 text-[#FDF2F5] rounded-lg">
                <BarChart2 size={16} />
              </div>

              <div>

                <p className="text-xs font-bold text-white">
                  {paginaDashboard === 1
                    ? 'Resumen del Proyecto'
                    : 'Analítica Avanzada'}
                </p>

                <p className="text-[10px] text-slate-500">
                  Vista {paginaDashboard} de 2
                </p>

              </div>

            </div>


            {/* BOTONES */}
            <div className="flex items-center gap-2">

              {/* ANTERIOR */}
              <button
                type="button"
                onClick={() =>
                  setPaginaDashboard(
                    Math.max(1, paginaDashboard - 1)
                  )
                }
                disabled={paginaDashboard === 1}
                className="px-3 py-2 rounded-xl border border-slate-700 bg-[#1E293B] text-slate-300 text-xs font-semibold transition-all hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>


              {/* PÁGINA 1 */}
              <button
                type="button"
                onClick={() => setPaginaDashboard(1)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  paginaDashboard === 1
                    ? 'bg-[#8B0D37] text-white shadow-lg shadow-[#5C0924]/30'
                    : 'bg-[#1E293B] border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                1
              </button>


              {/* PÁGINA 2 */}
              <button
                type="button"
                onClick={() => setPaginaDashboard(2)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  paginaDashboard === 2
                    ? 'bg-[#5C0924] text-white shadow-lg shadow-[#5C0924]/30'
                    : 'bg-[#1E293B] border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                2
              </button>


              {/* SIGUIENTE */}
              <button
                type="button"
                onClick={() =>
                  setPaginaDashboard(
                    Math.min(2, paginaDashboard + 1)
                  )
                }
                disabled={paginaDashboard === 2}
                className="px-3 py-2 rounded-xl border border-slate-700 bg-[#1E293B] text-slate-300 text-xs font-semibold transition-all hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>

            </div>

          </div>

        </div>

      </div>

    ) : (

      /* ==========================================================
         ESTADO VACÍO
         ========================================================== */
      <div className="bg-[#1E293B]/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center min-h-[380px]">

        <div className="p-4 bg-slate-800/50 rounded-2xl text-slate-500 mb-4 border border-slate-700/50">
          <ShieldCheck
            size={48}
            className="stroke-1"
          />
        </div>

        <h3 className="text-base font-bold text-slate-300 mb-1">
          Servidor en Espera de Ingesta
        </h3>

        <p className="text-xs text-slate-500 max-w-sm">
          Seleccione o cree una carpeta y cargue un archivo
          (.xlsx o .csv) para iniciar el análisis con
          Isolation Forest.
        </p>

      </div>

    )}

  </div>

</main>

      {/* MODAL CREAR CARPETA */}
      {mostrarModalNuevaCarpeta && (
        <div className="fixed inset-0 bg-[#1E293B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Crear Nueva Carpeta / Proyecto</h3>

            <form onSubmit={crearCarpeta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Carpeta</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Auditoría Telecom Q3"
                  value={nuevaCarpetaNombre}
                  onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#1E293B] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sector Empresarial</label>
                <select
                  value={nuevaCarpetaSector}
                  onChange={(e) => setNuevaCarpetaSector(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#1E293B] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#8B0D37]"
                >
                  <option value="Telecomunicaciones">Telecomunicaciones</option>
                  <option value="Arrocera">Arrocera / Agroindustria</option>
                  <option value="Cerveceria">Cervecería / Bebidas</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevaCarpeta(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B0D37] hover:bg-[#5C0924] text-white rounded-xl text-xs font-semibold"
                >
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}