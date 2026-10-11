// src/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  FolderPlus, Folder, Trash2, ChevronLeft, ChevronRight, Search, Sun, Moon, Lock, User, Clock, Eye, FileText
} from 'lucide-react';

export default function AdminDashboard({ usuarioSesion, onLogout }) {
  // Tema Claro / Oscuro
  const [modoClaro, setModoClaro] = useState(false);

  // Estados para Carpetas / Proyectos
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState('');
  const [nuevaCarpetaSector, setNuevaCarpetaSector] = useState('Telecomunicaciones');
  const [mostrarModalNuevaCarpeta, setMostrarModalNuevaCarpeta] = useState(false);

  // Modal Eliminar Carpeta con Contraseña
  const [mostrarModalEliminarCarpeta, setMostrarModalEliminarCarpeta] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [eliminandoCarpeta, setEliminandoCarpeta] = useState(false);

  // Estados para Carga de Archivos e Ingesta
  const [archivo, setArchivo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [procesando, setProcesando] = useState(false);
  const [faseCarga, setFaseCarga] = useState(false);

  // Buscador y Paginación de Archivos (Límite 10)
  const [busquedaArchivo, setBusquedaArchivo] = useState('');
  const [paginaArchivos, setPaginaArchivos] = useState(1);
  const LIMITE_ARCHIVOS = 10;

  // Selección de Archivo para Análisis Específico
  const [archivoSeleccionadoAnálisis, setArchivoSeleccionadoAnálisis] = useState(null);

  // Datos devueltos desde Supabase
  const [historialArchivos, setHistorialArchivos] = useState([]);
  const [resumenData, setResumenData] = useState(null);

  // Formateadores
  const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

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

  // Paginación interna del dashboard derecho
  const [paginaDashboard, setPaginaDashboard] = useState(1);

  // Cargar carpetas al montar
  useEffect(() => {
    cargarCarpetas();
  }, []);

  // Cargar historial de la carpeta seleccionada
  useEffect(() => {
    if (carpetaSeleccionada) {
      cargarHistorialDeCarpeta(carpetaSeleccionada.id);
      setPaginaDashboard(1);
      setArchivoSeleccionadoAnálisis(null);
      setBusquedaArchivo('');
      setPaginaArchivos(1);
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

  // Validar eliminación de carpeta con contraseña
  const confirmarEliminarCarpeta = async (e) => {
    e.preventDefault();
    if (!passwordConfirm.trim()) return;

    setEliminandoCarpeta(true);
    setErrorPassword('');

    try {
      // 1. Verificar contraseña
      await api.post('/api/verify-password', {
        username: usuarioSesion?.username || '',
        password: passwordConfirm
      });

      // 2. Eliminar carpeta
      await api.delete(`/api/carpetas/${carpetaSeleccionada.id}`);

      const carpetasRestantes = carpetas.filter(c => c.id !== carpetaSeleccionada.id);
      setCarpetas(carpetasRestantes);
      setCarpetaSeleccionada(carpetasRestantes.length > 0 ? carpetasRestantes[0] : null);

      setPasswordConfirm('');
      setMostrarModalEliminarCarpeta(false);
    } catch (err) {
      setErrorPassword(err.response?.data?.detail || 'Contraseña incorrecta o error al eliminar.');
    } finally {
      setEliminandoCarpeta(false);
    }
  };

  // Validación de archivo duplicado por nombre
  const validarYSetearArchivo = (file) => {
    if (!file) return;

    // Verificar si ya existe un archivo con el mismo nombre en esta carpeta
    const existeDuplicado = historialArchivos.some(
      a => a.nombre_archivo.trim().toLowerCase() === file.name.trim().toLowerCase()
    );

    if (existeDuplicado) {
      setMensaje({
        texto: `El archivo "${file.name}" ya fue subido en este proyecto. Cambia el nombre o selecciona otro.`,
        tipo: 'error'
      });
      setArchivo(null);
      return;
    }

    setArchivo(file);
    setMensaje({ texto: '', tipo: '' });
  };

  const manejarCambioArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      validarYSetearArchivo(e.target.files[0]);
    }
  };

  const manejarDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const manejarDragLeave = () => {
    setIsDragging(false);
  };

  const manejarDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validarYSetearArchivo(e.dataTransfer.files[0]);
    }
  };

  const enviarExcelAlPipeline = async (e) => {
    e.preventDefault();
    if (!archivo || !carpetaSeleccionada) return;

    setProcesando(true);
    setMensaje({ texto: '', tipo: '' });

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('usuario_id', usuarioSesion?.id || 1);
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
      if (archivoSeleccionadoAnálisis?.id === archivoId) {
        setArchivoSeleccionadoAnálisis(null);
      }
      cargarHistorialDeCarpeta(carpetaSeleccionada.id);
    } catch (err) {
      alert("Error al eliminar el archivo");
    }
  };

  // Filtrado de archivos por buscador
  const archivosFiltrados = useMemo(() => {
    return historialArchivos.filter(a =>
      a.nombre_archivo.toLowerCase().includes(busquedaArchivo.toLowerCase())
    );
  }, [historialArchivos, busquedaArchivo]);

  // Paginación limitada a 10 archivos
  const totalPaginasArchivos = Math.ceil(archivosFiltrados.length / LIMITE_ARCHIVOS) || 1;
  const archivosPaginados = useMemo(() => {
    const inicio = (paginaArchivos - 1) * LIMITE_ARCHIVOS;
    return archivosFiltrados.slice(inicio, inicio + LIMITE_ARCHIVOS);
  }, [archivosFiltrados, paginaArchivos]);

  // Pantalla de Carga
  if (faseCarga) {
    return (
      <div className={`min-h-screen ${modoClaro ? 'bg-slate-100 text-slate-800' : 'bg-[#1E293B] text-white'} flex flex-col items-center justify-center relative overflow-hidden font-sans`}>
        <div className="absolute w-96 h-96 bg-[#8B0D37]/20 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
        <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-slate-800 p-10 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full z-10 text-center text-white">
          <RefreshCw className="animate-spin text-[#FDF2F5] mb-4" size={56} />
          <h3 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-[#FDF2F5] to-teal-300 bg-clip-text text-transparent mb-2">
            Ejecutando Pipeline de IA
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Sincronizando con Supabase PostgreSQL y ejecutando modelo Isolation Forest.
          </p>
        </div>
      </div>
    );
  }

  // Preparación de datos de gráficos
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

  // Clases CSS según el tema
  const bgMain = modoClaro ? 'bg-slate-100 text-slate-900' : 'bg-[#1E293B] text-slate-100';
  const cardBg = modoClaro ? 'bg-white border-slate-200 text-slate-800 shadow-lg' : 'bg-[#1E293B]/70 border-slate-800 text-slate-100 shadow-xl';
  const subCardBg = modoClaro ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B] border-slate-800';
  const inputBg = modoClaro ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1E293B] border-slate-800 text-white';

  return (
    <div className={`min-h-screen ${bgMain} p-4 md:p-8 font-sans relative transition-colors duration-300`}>

      {/* NAVBAR */}
      <nav className={`max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#5C0924]/80 backdrop-blur-md p-4 px-6 rounded-2xl border border-slate-800/80 shadow-2xl relative z-10 text-white`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#8B0D37] to-[#5C0924] rounded-xl shadow-lg shadow-[#8B0D37]/30">
            <Cpu size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Panel de Control y Pipeline de Auditoría
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs text-slate-300 font-medium">
                Admin: <span className="text-white font-bold">{usuarioSesion?.username || 'Administrador'}</span>
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
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-semibold rounded-xl transition-all"
          >
            <LogOut size={15} /> Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* BARRA DE SELECCIÓN DE PROYECTO / CARPETA CON OPCIÓN DE ELIMINAR */}
      <div className={`max-w-7xl mx-auto mb-8 ${cardBg} p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10`}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Folder className="text-[#8B0D37]" size={22} />
          <div className="w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
              Carpeta / Proyecto Activo
            </span>
            <div className="flex items-center gap-2">
              <select
                value={carpetaSeleccionada?.id || ''}
                onChange={(e) => {
                  const encontrada = carpetas.find(c => c.id === parseInt(e.target.value));
                  setCarpetaSeleccionada(encontrada);
                }}
                className={`${inputBg} font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B0D37] w-full sm:w-auto`}
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

              {/* BOTÓN ELIMINAR CARPETA */}
              {carpetaSeleccionada && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorPassword('');
                    setPasswordConfirm('');
                    setMostrarModalEliminarCarpeta(true);
                  }}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/30 transition-all shrink-0"
                  title="Eliminar esta carpeta"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {carpetaSeleccionada && (
            <span className="text-xs px-3 py-1.5 bg-[#8B0D37]/10 border border-[#8B0D37]/30 rounded-xl font-semibold text-[#8B0D37]">
              Sector: {carpetaSeleccionada.sector}
            </span>
          )}

          <button
            onClick={() => setMostrarModalNuevaCarpeta(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#8B0D37] hover:bg-[#5C0924] text-white rounded-xl text-xs font-semibold transition-all shadow-md"
          >
            <FolderPlus size={16} />
            <span>Nueva Carpeta</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

        {/* COLUMNA IZQUIERDA: INGESTA Y LISTA DE ARCHIVOS */}
        <div className="lg:col-span-4 space-y-6">

          {/* TARJETA DE INGESTA */}
          <div className={`${cardBg} rounded-2xl p-6 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Database size={18} className="text-[#8B0D37]" />
                Ingesta de Libros
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#8B0D37]/10 text-[#8B0D37] border border-[#8B0D37]/30 rounded-md">
                .xlsx / .csv
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Cargue los libros contables para disparar la ingesta en Supabase y la evaluación con IA.
            </p>

            {mensaje.texto && (
              <div
                className={`mb-4 p-3.5 rounded-xl flex items-start gap-3 border text-xs transition-all ${
                  mensaje.tipo === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                    : 'bg-red-500/10 border-red-500/30 text-red-500'
                }`}
              >
                {mensaje.tipo === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
                )}
                <span className="leading-tight">{mensaje.texto}</span>
              </div>
            )}

            <form onSubmit={enviarExcelAlPipeline} className="space-y-4">
              <div
                onDragOver={manejarDragOver}
                onDragLeave={manejarDragLeave}
                onDrop={manejarDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-200 relative cursor-pointer ${
                  isDragging
                    ? 'border-[#8B0D37] bg-[#8B0D37]/10 scale-[1.01]'
                    : archivo
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={manejarCambioArchivo}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                  disabled={procesando || !carpetaSeleccionada}
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className={`p-3 rounded-full ${archivo ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800/40 text-slate-400'}`}>
                    {archivo ? <FileSpreadsheet size={24} /> : <Upload size={24} />}
                  </div>
                  {archivo ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-emerald-500 truncate max-w-[200px]">{archivo.name}</p>
                      <p className="text-[10px] text-slate-400">{(archivo.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium">Arrastra tu archivo aquí</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Soporta Excel (.xlsx) y CSV</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!archivo || procesando || !carpetaSeleccionada}
                className="w-full py-3 bg-gradient-to-r from-[#5C0924] via-[#8B0D37] to-[#5C0924] hover:from-[#8B0D37] hover:to-[#5C0924] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
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

          {/* TABLA / LISTA DE ARCHIVOS CON BUSCADOR Y LIMITE DE 10 */}
          {historialArchivos.length > 0 && (
            <div className={`${cardBg} rounded-2xl p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <FileText size={15} className="text-[#8B0D37]" />
                  Archivos en este Proyecto ({historialArchivos.length})
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

              {/* BUSCADOR DE ARCHIVOS */}
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

              {/* LISTA DE ARCHIVOS (MÁXIMO 10 VISIBLES POR PÁGINA) */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarArchivo(a.id);
                          }}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 shrink-0"
                          title="Eliminar archivo"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>{a.total_registros} reg • {a.total_anomalias} alertas</span>
                        <span className="font-semibold text-emerald-500">{formatMoney(a.total_debito || a.total_credito)}</span>
                      </div>

                      {/* METADATOS: USUARIO, FECHA Y HORA */}
                      <div className="mt-1.5 pt-1.5 border-t border-slate-700/40 text-[9px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <User size={10} className="text-slate-400" />
                          <span>{a.usuario?.username || 'Usuario no registrado'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-slate-400" />
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

              {/* PAGINACIÓN DE ARCHIVOS (SI HAY MÁS DE 10) */}
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
          )}
        </div>

        {/* COLUMNA DERECHA: DASHBOARD / ANALÍTICA */}
        <div className="lg:col-span-8">
          {resumenData ? (
            <div className="space-y-4">

              {/* ENCABEZADO DE VISTA SELECCIONADA */}
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

                    {/* TARJETAS KPI */}
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

                    {/* GRÁFICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className={`md:col-span-7 ${cardBg} p-5 rounded-2xl relative`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                            <DollarSign size={18} className="text-emerald-500" /> Consolidado Contable
                          </h4>
                          <BurbujaComentarios graficoId="admin_consolidado_contable" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartSaldosData} barGap={12}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                              <YAxis stroke="#116ff3ff" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(val) => [formatMoney(val), '']} />
                              <Bar dataKey="Débito" fill="#c21c48" radius={[8, 8, 0, 0]} barSize={40} />
                              <Bar dataKey="Crédito" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className={`md:col-span-5 ${cardBg} p-5 rounded-2xl flex flex-col justify-between relative`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                            <BarChart2 size={18} className="text-red-400" /> Análisis de Anomalías
                          </h4>
                          <BurbujaComentarios graficoId="admin_analisis_anomalias" carpetaId={carpetaSeleccionada?.id} usuarioActual={usuarioSesion} />
                        </div>

                        <div className="h-44 my-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartPieAnomalias} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                                {chartPieAnomalias.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
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
                    1. Resumen
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
              <h3 className="text-base font-bold mb-1">Servidor en Espera de Ingesta</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Seleccione o cree una carpeta y cargue un archivo (.xlsx o .csv) para iniciar el análisis.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CREAR CARPETA */}
      {mostrarModalNuevaCarpeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${modoClaro ? 'bg-white text-slate-800' : 'bg-[#1E293B] text-white'} border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl`}>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <FolderPlus size={18} className="text-[#8B0D37]" />
              Crear Nueva Carpeta / Proyecto
            </h3>

            <form onSubmit={crearCarpeta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre de la Carpeta</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Auditoría Telecom Q3"
                  value={nuevaCarpetaNombre}
                  onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs ${inputBg} focus:outline-none focus:border-[#8B0D37]`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Sector Empresarial</label>
                <select
                  value={nuevaCarpetaSector}
                  onChange={(e) => setNuevaCarpetaSector(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs ${inputBg} focus:outline-none focus:border-[#8B0D37]`}
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
                  className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B0D37] text-white rounded-xl text-xs font-semibold hover:bg-[#5C0924]"
                >
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR CARPETA CONFIRMACIÓN POR CONTRASEÑA */}
      {mostrarModalEliminarCarpeta && carpetaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${modoClaro ? 'bg-white text-slate-800' : 'bg-[#1E293B] text-white'} border border-red-500/40 p-6 rounded-2xl w-full max-w-md shadow-2xl`}>
            <div className="flex items-center gap-3 mb-3 text-red-500">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-500">Eliminar Carpeta</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs mb-4 leading-relaxed">
              Estás a punto de eliminar la carpeta <strong className="text-red-500">{carpetaSeleccionada.nombre}</strong> y todos los excels, transacciones e historiales asociados.
            </p>

            {errorPassword && (
              <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{errorPassword}</span>
              </div>
            )}

            <form onSubmit={confirmarEliminarCarpeta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 flex items-center gap-1">
                  <Lock size={12} /> Confirma tu contraseña de usuario
                </label>
                <input
                  type="password"
                  required
                  placeholder="Introduce tu contraseña"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs ${inputBg} focus:outline-none focus:border-red-500`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalEliminarCarpeta(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={eliminandoCarpeta}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {eliminandoCarpeta ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  <span>Confirmar Eliminación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}