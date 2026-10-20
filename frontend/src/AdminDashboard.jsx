// src/AdminDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from './api';
import './App.css';
import BurbujaComentarios from './components/BurbujasComentarios';
import AnaliticaAvanzada from './components/AnaliticaAvanzada';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, LogOut, RefreshCw,
  BarChart2, ShieldCheck, Database, Cpu, Activity, DollarSign, Layers, Check,
  FolderPlus, Folder, Trash2, ChevronLeft, ChevronRight, Search, Sun, Moon, Lock, User, Clock, Eye, FileText, TrendingUp, Briefcase, PieChart as PieIcon, HelpCircle, Download, FileCheck2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard({ usuarioSesion, onLogout }) {
  // Tema Claro / Oscuro
  const [modoClaro, setModoClaro] = useState(false);

  // Referencia para la captura del informe PDF
  const reportRef = useRef(null);

  // Estados para Generación de Reporte PDF
  const [mostrarModalConfirmarReporte, setMostrarModalConfirmarReporte] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

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

  // Datos analíticos de registros contables
  const [dataAnaliticaRegistros, setDataAnaliticaRegistros] = useState({
    evolucion_mensual: [],
    top_cuentas: [],
    centros_costo: []
  });

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

  // Paginación interna del dashboard derecho
  const [paginaDashboard, setPaginaDashboard] = useState(1);

  useEffect(() => {
    cargarCarpetas();
  }, []);

  useEffect(() => {
    if (carpetaSeleccionada) {
      cargarHistorialDeCarpeta(carpetaSeleccionada.id);
      cargarAnaliticaRegistros(carpetaSeleccionada.id, archivoSeleccionadoAnálisis?.id);
      setPaginaDashboard(1);
      setBusquedaArchivo('');
      setPaginaArchivos(1);
    }
  }, [carpetaSeleccionada, archivoSeleccionadoAnálisis]);

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

  const cargarAnaliticaRegistros = async (carpetaId, archivoId = null) => {
    try {
      const query = archivoId ? `?archivo_id=${archivoId}` : '';
      const res = await api.get(`/api/carpetas/${carpetaId}/analitica-registros${query}`);
      setDataAnaliticaRegistros(res.data);
    } catch (err) {
      console.error("Error al cargar analítica de registros:", err);
    }
  };

 // Función para generar Reporte Ejecutivo NATIVO con jsPDF y jsPDF-AutoTable
  const generarReportePDF = async () => {
    setMostrarModalConfirmarReporte(false);
    setGenerandoPDF(true);

    try {
      // 1. Crear documento PDF A4 en milímetros
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // ~210 mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // ~297 mm
      const margin = 14;

      // Paleta Corporativa
      const colorVino = [139, 13, 55];     // #8B0D37
      const colorGrisOscuro = [30, 41, 59]; // #1E293B
      const colorGrisTexto = [100, 116, 139];
      const colorRojoAlerta = [239, 68, 68];
      const colorVerdeSalud = [16, 185, 129];

      // Determinar alcance del reporte (Archivo individual o Proyecto completo)
      const esArchivoIndividual = !!archivoSeleccionadoAnálisis;
      const tituloAlcance = esArchivoIndividual
        ? `Archivo: ${archivoSeleccionadoAnálisis.nombre_archivo}`
        : `Proyecto Completo: ${carpetaSeleccionada?.nombre || 'General'}`;

      // Datos dinámicos a utilizar
      const totalRegs = esArchivoIndividual
        ? archivoSeleccionadoAnálisis.total_registros
        : resumenData?.total_registros || 0;

      const totalAnomalias = esArchivoIndividual
        ? archivoSeleccionadoAnálisis.total_anomalias
        : resumenData?.total_anomalias || 0;

      const totalDebito = esArchivoIndividual
        ? archivoSeleccionadoAnálisis.total_debito
        : resumenData?.total_debito || 0;

      const totalCredito = esArchivoIndividual
        ? archivoSeleccionadoAnálisis.total_credito
        : resumenData?.total_credito || 0;

      const saludLibro = totalRegs > 0
        ? ((1 - totalAnomalias / totalRegs) * 100).toFixed(1)
        : '100.0';

      const tasaRiesgo = totalRegs > 0
        ? ((totalAnomalias / totalRegs) * 100).toFixed(1)
        : '0.0';

      // ==========================================
      // ENCABEZADO INSTITUCIONAL
      // ==========================================
      pdf.setFillColor(...colorVino);
      pdf.rect(0, 0, pageWidth, 8, 'F'); // Franja superior decorativa

      let y = 18;

      // Título Principal
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...colorVino);
      pdf.text('PLATAFORMA FINANCIERA BI', margin, y);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colorGrisTexto);
      pdf.text('Informe Ejecutivo de Auditoría & Detección de Anomalías', margin, y + 5);

      // Fecha y Datos de emisión a la derecha
      pdf.setFontSize(8);
      pdf.text(`Emisión: ${new Date().toLocaleDateString('es-NI')}`, pageWidth - margin, y, { align: 'right' });
      pdf.text(`Usuario: ${usuarioSesion?.username || 'Admin'}`, pageWidth - margin, y + 4, { align: 'right' });

      y += 12;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;

      // ==========================================
      // 1. ALCANCE Y CONTEXTO DEL PROYECTO
      // ==========================================
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colorGrisOscuro);
      pdf.text('1. Alcance y Contexto del Análisis', margin, y);
      y += 5;

      autoTable(pdf, {
        startY: y,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, textColor: [51, 65, 85], cellPadding: 2 },
        body: [
          [
            { content: 'Proyecto / Carpeta:', fontStyle: 'bold' }, carpetaSeleccionada?.nombre || 'N/A',
            { content: 'Sector Empresarial:', fontStyle: 'bold' }, carpetaSeleccionada?.sector || 'N/A'
          ],
          [
            { content: 'Alcance del Reporte:', fontStyle: 'bold' }, tituloAlcance,
            { content: 'Modelo de Evaluación:', fontStyle: 'bold' }, 'Isolation Forest (IA)'
          ]
        ]
      });

      y = pdf.lastAutoTable.finalY + 8;

      // ==========================================
      // 2. INDICADORES CLAVE Y RESUMEN GENERAL (KPIs)
      // ==========================================
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colorGrisOscuro);
      pdf.text('2. Resumen General e Indicadores Clave (KPIs)', margin, y);
      y += 5;

      autoTable(pdf, {
        startY: y,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: colorVino,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8.5
        },
        bodyStyles: { fontSize: 8.5, halign: 'center', cellPadding: 3 },
        head: [['Total Registros', 'Anomalías / Alertas', 'Salud del Libro', 'Tasa de Riesgo', 'Total Débito (C$)', 'Total Crédito ($)']],
        body: [
          [
            formatNumber(totalRegs),
            { content: formatNumber(totalAnomalias), fontStyle: 'bold', textColor: totalAnomalias > 0 ? colorRojoAlerta : colorGrisOscuro },
            { content: `${saludPorcentaje}%`, fontStyle: 'bold', textColor: colorVerdeSalud },
            `${tasaRiesgo}%`,
            formatCordobas(totalDebito),
            formatMoney(totalCredito)
          ]
        ]
      });

      y = pdf.lastAutoTable.finalY + 8;

      // ==========================================
      // 3. TOP 10 CUENTAS AFECTADAS Y CENTROS DE COSTO
      // ==========================================
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colorGrisOscuro);
      pdf.text('3. Desglose de Anomalías por Cuentas y Centros de Costo', margin, y);
      y += 5;

      // Generar datos para las tablas en bruto
      const filasCuentas = (dataAnaliticaRegistros.top_cuentas || []).slice(0, 10).map((item, idx) => [
        `#${idx + 1}`,
        item.cuenta || 'Sin especificación',
        formatNumber(item.anomalias)
      ]);

      const filasCentros = (dataAnaliticaRegistros.centros_costo || []).slice(0, 10).map((item, idx) => [
        `#${idx + 1}`,
        item.centro || 'General / Operativo',
        formatNumber(item.anomalias)
      ]);

      // Renderizar Tabla Cuentas Top
      autoTable(pdf, {
        startY: y,
        theme: 'striped',
        margin: { left: margin, right: margin },
        headStyles: { fillColor: colorGrisOscuro, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
        head: [['No.', 'Cuenta Contable Afectada', 'Anomalías Detectadas']],
        body: filasCuentas.length > 0 ? filasCuentas : [['-', 'No se registraron anomalías en cuentas', '0']]
      });

      y = pdf.lastAutoTable.finalY + 6;

      // Renderizar Tabla Centros de Costo
      autoTable(pdf, {
        startY: y,
        theme: 'striped',
        margin: { left: margin, right: margin },
        headStyles: { fillColor: colorGrisTexto, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } },
        head: [['No.', 'Centro de Costo / Departamento', 'Alertas IA']],
        body: filasCentros.length > 0 ? filasCentros : [['-', 'No hay datos de centros de costo', '0']]
      });

      y = pdf.lastAutoTable.finalY + 8;

      // ==========================================
      // 4. EVOLUCIÓN MENSUAL DE REGISTROS
      // ==========================================
      if (y + 40 > pageHeight) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colorGrisOscuro);
      pdf.text('4. Histórico Mensual de Ingesta y Riesgo', margin, y);
      y += 5;

      const filasMensual = (dataAnaliticaRegistros.evolucion_mensual || []).map((m) => [
        m.mes || 'Mes N/A',
        formatNumber(m.total_registros),
        formatNumber(m.anomalias),
        m.total_registros > 0 ? `${((m.anomalias / m.total_registros) * 100).toFixed(1)}%` : '0%'
      ]);

      autoTable(pdf, {
        startY: y,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: { fillColor: colorVino, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2 },
        head: [['Período / Mes', 'Total Transacciones', 'Anomalías Detectadas', 'Índice de Alerta']],
        body: filasMensual.length > 0 ? filasMensual : [['Sin histórico', '0', '0', '0%']]
      });

      // ==========================================
      // PIE DE PÁGINA INSTITUCIONAL
      // ==========================================
      const totalPaginas = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7.5);
        pdf.setTextColor(...colorGrisTexto);
        pdf.text(
          `Plataforma Financiera BI — Reporte Confidencial de Auditoría | Página ${i} de ${totalPaginas}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
      }

      // Descargar PDF
      const nombrePDF = `Reporte_Ejecutivo_${carpetaSeleccionada?.nombre || 'Auditoria'}.pdf`;
      pdf.save(nombrePDF);

    } catch (err) {
      console.error("Error al generar el PDF nativo:", err);
      alert(`Ocurrió un error al compilar el informe: ${err.message}`);
    } finally {
      setGenerandoPDF(false);
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

  const confirmarEliminarCarpeta = async (e) => {
    e.preventDefault();
    if (!passwordConfirm.trim()) return;

    setEliminandoCarpeta(true);
    setErrorPassword('');

    try {
      await api.post('/api/verify-password', {
        username: usuarioSesion?.username || '',
        password: passwordConfirm
      });

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

  const validarYSetearArchivo = (file) => {
    if (!file) return;

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
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setTimeout(() => {
        setMensaje({
          texto: respuesta.data.mensaje || 'Pipeline ejecutado con éxito.',
          tipo: 'success'
        });

        setArchivo(null);
        cargarHistorialDeCarpeta(carpetaSeleccionada.id);
        cargarAnaliticaRegistros(carpetaSeleccionada.id);

        setFaseCarga(false);
        setProcesando(false);
      }, 1800);

    } catch (err) {
      setFaseCarga(false);
      setProcesando(false);

      setMensaje({
        texto: err.response?.data?.detail || err.message || 'Error desconocido ejecutando el pipeline.',
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
      cargarAnaliticaRegistros(carpetaSeleccionada.id);
    } catch (err) {
      alert("Error al eliminar el archivo");
    }
  };

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

  // Prepara datos formateados para los gráficos
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
    : 100;

  const porcentajeAnomaliaNum = resumenData && resumenData.total_registros > 0
    ? ((resumenData.total_anomalias / resumenData.total_registros) * 100).toFixed(1)
    : 0;

  const customTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
    padding: '10px 14px'
  };

  const customLabelStyle = {
    color: '#1e293b',
    fontWeight: 'bold',
    fontSize: '12px',
    marginBottom: '4px'
  };

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

      {/* BARRA DE SELECCIÓN DE PROYECTO */}
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

        {/* COLUMNA IZQUIERDA: INGESTA Y ARCHIVOS */}
        <div className="lg:col-span-4 space-y-6">
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
              <div className={`mb-4 p-3.5 rounded-xl flex items-start gap-3 border text-xs transition-all ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                {mensaje.tipo === 'success' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />}
                <span className="leading-tight">{mensaje.texto}</span>
              </div>
            )}

            <form onSubmit={enviarExcelAlPipeline} className="space-y-4">
              <div
                onDragOver={manejarDragOver}
                onDragLeave={manejarDragLeave}
                onDrop={manejarDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-200 relative cursor-pointer ${isDragging ? 'border-[#8B0D37] bg-[#8B0D37]/10 scale-[1.01]' : archivo ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700/80 hover:border-slate-500'}`}
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

          {/* LISTA DE ARCHIVOS */}
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

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {archivosPaginados.map((a) => {
                  const esSeleccionado = archivoSeleccionadoAnálisis?.id === a.id;

                  return (
                    <div
                      key={a.id}
                      onClick={() => setArchivoSeleccionadoAnálisis(a)}
                      className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${esSeleccionado ? 'bg-[#8B0D37]/15 border-[#8B0D37] shadow-sm' : `${subCardBg} hover:border-slate-500`}`}
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
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-rose-400">{formatCordobas(a.total_debito)}</span>
                          <span className="font-semibold text-emerald-400">{formatMoney(a.total_credito)}</span>
                        </div>
                      </div>

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
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: DASHBOARD / ANALÍTICA Y REPORTE */}
        <div className="lg:col-span-8">
          {resumenData ? (
            <div className="space-y-4">

              {/* ENCABEZADO Y BARRA DE ACCIÓN PARA GENERAR REPORTE */}
              <div className={`${cardBg} p-3 px-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md`}>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <BarChart2 size={16} className="text-[#8B0D37]" />
                  <span className="text-xs font-bold truncate">
                    {archivoSeleccionadoAnálisis
                      ? `Análisis de: ${archivoSeleccionadoAnálisis.nombre_archivo}`
                      : `Resumen General del Proyecto (${historialArchivos.length} archivos)`}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  {archivoSeleccionadoAnálisis && (
                    <button
                      onClick={() => setArchivoSeleccionadoAnálisis(null)}
                      className="px-2.5 py-1.5 bg-slate-700 text-white rounded-xl text-[11px] font-semibold hover:bg-slate-600 transition-all flex items-center gap-1"
                    >
                      <Eye size={12} />
                      <span className="hidden md:inline">Ver resumen general</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setMostrarModalConfirmarReporte(true)}
                    className="px-3 py-1.5 bg-[#8B0D37] hover:bg-[#5C0924] text-white rounded-xl text-[11px] font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Generar Reporte PDF</span>
                  </button>
                </div>
              </div>

              {/* CONTENEDOR CAPTURABLE PARA EL REPORTE PDF */}
              <div ref={reportRef} className="min-h-[580px] p-2 space-y-6">
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

                      {/* DONUT CON KPI CENTRAL */}
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
                    1. Resumen & Ingesta
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

      {/* MODAL CONFIRMACIÓN GENERAR REPORTE */}
      {mostrarModalConfirmarReporte && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${modoClaro ? 'bg-white text-slate-800' : 'bg-[#1E293B] text-white'} border border-[#8B0D37]/40 p-6 rounded-2xl w-full max-w-md shadow-2xl`}>
            <div className="flex items-center gap-3 mb-3 text-[#8B0D37]">
              <div className="p-2.5 bg-[#8B0D37]/10 rounded-xl">
                <FileCheck2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold">Generar Reporte Ejecutivo PDF</h3>
                <p className="text-xs text-slate-400">Exportación oficial de auditoría</p>
              </div>
            </div>

            <p className="text-xs mb-4 leading-relaxed text-slate-300">
              Se compilará un documento formal en formato PDF con la síntesis ejecutiva, KPIs, gráficos de evolución, consolidado contable y tasa de anomalías del proyecto <strong className="text-white">{carpetaSeleccionada?.nombre}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmarReporte(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={generarReportePDF}
                className="px-4 py-2 bg-[#8B0D37] hover:bg-[#5C0924] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <Download size={14} />
                <span>Confirmar y Exportar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANIMACIÓN DE CARGA AL COMPILAR PDF */}
      {generandoPDF && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-xs w-full text-white">
            <RefreshCw className="animate-spin text-[#8B0D37] mb-4" size={48} />
            <h4 className="text-base font-extrabold mb-1">Compilando Reporte PDF</h4>
            <p className="text-xs text-slate-400">Procesando gráficos estáticos y tablas de balance...</p>
          </div>
        </div>
      )}

      {/* MODALES CREAR Y ELIMINAR CARPETA */}
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
                  <option value="Proyectos de Construcción">Proyectos de Construcción</option>
                  <option value="Saneamiento de aguas residuales">Saneamiento de aguas residuales</option>
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
              Estás a punto de eliminar la carpeta <strong className="text-red-500">{carpetaSeleccionada.nombre}</strong> y todos sus datos asociados.
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
                  <Lock size={12} /> Confirma tu contraseña
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
                  {eliminandoCarpeta ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
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