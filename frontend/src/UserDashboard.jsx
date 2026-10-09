
import React, { useState, useEffect } from 'react';
import api from './api';
import './App.css';

import BurbujaComentarios from './components/BurbujasComentarios';
import AnaliticaAvanzada from './components/AnaliticaAvanzada';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  LogOut,
  BarChart2,
  ShieldCheck,
  Cpu,
  Activity,
  DollarSign,
  Layers,
  AlertCircle,
  Folder,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function UserDashboard({ usuarioSesion, onLogout }) {
  // Carpetas disponibles
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(null);

  // Resumen contable
  const [resumenData, setResumenData] = useState(null);
  const [cargandoCarpetas, setCargandoCarpetas] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');

  // Paginación interna
  const [paginaDashboard, setPaginaDashboard] = useState(1);
  const totalPaginasDashboard = 2;

  // Formateadores
  const formatMoney = (valor) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(valor || 0);

  const formatNumber = (valor) =>
    new Intl.NumberFormat('en-US').format(valor || 0);

  const formatCordobas = (valor) =>
    new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor || 0);

  // Cargar las carpetas disponibles
  useEffect(() => {
    const cargarCarpetas = async () => {
      try {
        setCargandoCarpetas(true);
        setErrorCarga('');

        const respuesta = await api.get('/api/carpetas');
        const lista = Array.isArray(respuesta.data)
          ? respuesta.data
          : [];

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

  // Cargar el resumen cuando cambia la carpeta
  useEffect(() => {
    if (!carpetaSeleccionada?.id) {
      setResumenData(null);
      return;
    }

    let cancelado = false;

    const cargarResumen = async () => {
      try {
        setCargandoResumen(true);
        setErrorCarga('');
        setResumenData(null);

        const respuesta = await api.get(
          `/api/historial?carpeta_id=${carpetaSeleccionada.id}`
        );

        if (cancelado) return;

        const historial = Array.isArray(respuesta.data)
          ? respuesta.data
          : [];

        if (historial.length === 0) {
          setResumenData(null);
          return;
        }

        const resumen = historial.reduce(
          (acumulado, archivo) => ({
            total_registros:
              acumulado.total_registros +
              Number(archivo.total_registros || 0),

            total_anomalias:
              acumulado.total_anomalias +
              Number(archivo.total_anomalias || 0),

            total_debito:
              acumulado.total_debito +
              Number(archivo.total_debito || 0),

            total_credito:
              acumulado.total_credito +
              Number(archivo.total_credito || 0)
          }),
          {
            total_registros: 0,
            total_anomalias: 0,
            total_debito: 0,
            total_credito: 0
          }
        );

        setResumenData(resumen);
      } catch (error) {
        if (cancelado) return;

        console.error('Error al cargar el resumen:', error);
        setErrorCarga('No se pudieron cargar los datos de esta carpeta.');
        setResumenData(null);
      } finally {
        if (!cancelado) {
          setCargandoResumen(false);
        }
      }
    };

    cargarResumen();

    // Reiniciar la navegación para cada carpeta
    setPaginaDashboard(1);

    return () => {
      cancelado = true;
    };
  }, [carpetaSeleccionada]);

  // Datos de los gráficos
  const chartSaldosData = resumenData
    ? [
        {
          name: 'Saldos Globales',
          Débito: resumenData.total_debito,
          Crédito: resumenData.total_credito
        }
      ]
    : [];

  const totalNormales = resumenData
    ? Math.max(
        0,
        resumenData.total_registros - resumenData.total_anomalias
      )
    : 0;

  const chartPieAnomalias = resumenData
    ? [
        {
          name: 'Transacciones Normales',
          value: totalNormales,
          color: '#8B0D37'
        },
        {
          name: 'Anomalías / Alertas',
          value: resumenData.total_anomalias,
          color: '#ef4444'
        }
      ]
    : [];

  const saludPorcentaje =
    resumenData && resumenData.total_registros > 0
      ? (
          (1 -
            resumenData.total_anomalias /
              resumenData.total_registros) *
          100
        ).toFixed(1)
      : '100.0';

  const cambiarCarpeta = (evento) => {
    const id = Number(evento.target.value);

    const encontrada = carpetas.find(
      (carpeta) => Number(carpeta.id) === id
    );

    if (encontrada) {
      setCarpetaSeleccionada(encontrada);
    }
  };

  const cambiarPagina = (pagina) => {
    setPaginaDashboard(
      Math.max(1, Math.min(totalPaginasDashboard, pagina))
    );
  };

  return (
    <div className="min-h-screen bg-[#1E293B] text-slate-100 p-4 md:p-8 font-sans relative">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-[#5C0924]/60 backdrop-blur-md p-4 px-6 rounded-2xl border border-[#5C0924]/60 shadow-2xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#8B0D37] to-[#5C0924] rounded-xl shadow-lg shadow-[#8B0D37]/30">
            <Cpu size={22} className="text-white" />
          </div>

          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Panel de Inteligencia Financiera
            </h1>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

              <p className="text-xs text-slate-400 font-medium">
                Usuario:{' '}
                <span className="text-slate-200">
                  {usuarioSesion?.username || 'Usuario'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-red-500/10 text-emerald-400 hover:text-red-400 border border-emerald-500/30 hover:border-red-500/30 text-xs font-semibold rounded-xl transition-all duration-200"
        >
          <LogOut size={15} />
          Cerrar Sesión
        </button>
      </nav>

      {/* SELECTOR DE CARPETAS */}
      <section className="max-w-7xl mx-auto mb-8 bg-[#1E293B]/80 backdrop-blur-md p-4 rounded-2xl border border-[#5C0924]/50 shadow-xl shadow-[#5C0924]/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-[#8B0D37]/20 rounded-xl">
            <Folder className="text-[#FDF2F5]" size={20} />
          </div>

          <div className="w-full">
            <label
              htmlFor="carpeta-usuario"
              className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1"
            >
              Consultar carpeta / proyecto
            </label>

            <select
              id="carpeta-usuario"
              value={carpetaSeleccionada?.id || ''}
              onChange={cambiarCarpeta}
              disabled={cargandoCarpetas || carpetas.length === 0}
              className="bg-[#8B0D37]/20 border border-[#5C0924]/60 text-white font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#8B0D37] focus:ring-1 focus:ring-[#8B0D37]/50 w-full sm:min-w-64 disabled:opacity-50"
            >
              {cargandoCarpetas ? (
                <option value="">Cargando carpetas...</option>
              ) : carpetas.length === 0 ? (
                <option value="">No hay carpetas disponibles</option>
              ) : (
                carpetas.map((carpeta) => (
                  <option
                    key={carpeta.id}
                    value={carpeta.id}
                    className="bg-[#1E293B]"
                  >
                    {carpeta.nombre} ({carpeta.sector})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {carpetaSeleccionada && (
            <span className="text-xs px-3 py-2 bg-[#1E293B] border border-[#5C0924]/60 rounded-xl font-semibold text-[#FDF2F5]">
              Sector: {carpetaSeleccionada.sector || 'No especificado'}
            </span>
          )}

          {cargandoResumen && (
            <RefreshCw
              size={16}
              className="text-[#FDF2F5] animate-spin"
            />
          )}
        </div>
      </section>

      {/* MENSAJES DE ERROR */}
      {errorCarga && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm relative z-10">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorCarga}</span>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: ANCHO COMPLETO */}
      <main className="max-w-7xl mx-auto relative z-10">
        <section className="bg-[#1E293B]/20 rounded-2xl relative">
          {/* CONTENEDOR DE VISTAS */}
          <div className="min-h-[540px]">
            {/* PÁGINA 1: RESUMEN FINANCIERO */}
            {paginaDashboard === 1 && (
              <div className="space-y-6 animate-fade-in">
                {cargandoResumen ? (
                  <div className="min-h-[380px] flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw
                      size={36}
                      className="animate-spin text-[#FDF2F5] mb-4"
                    />
                    <p className="text-sm">
                      Cargando resumen financiero...
                    </p>
                  </div>
                ) : resumenData ? (
                  <>
                    {/* KPI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {/* KPI 1 */}
                      <div className="bg-[#1E293B]/70 backdrop-blur-md border border-[#5C0924]/50 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-300 text-sm font-medium">
                            Total de registros
                          </span>

                          <div className="p-2 bg-[#8B0D37]/15 text-[#FDF2F5] rounded-lg">
                            <Layers size={18} />
                          </div>
                        </div>

                        <h4 className="text-2xl font-black text-[#FDF2F5] mt-3 tracking-tight">
                          {formatNumber(resumenData.total_registros)}
                        </h4>

                        <p className="text-[10px] text-slate-500 mt-1">
                          Transacciones registradas
                        </p>
                      </div>

                      {/* KPI 2 */}
                      <div className="bg-[#1E293B]/70 backdrop-blur-md border border-[#5C0924]/50 p-5 rounded-2xl shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-300 text-sm font-medium">
                            Anomalías detectadas
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
                          Alertas identificadas
                        </p>
                      </div>

                      {/* KPI 3 */}
                      <div className="bg-[#1E293B]/70 backdrop-blur-md border border-[#5C0924]/50 p-5 rounded-2xl shadow-xl relative overflow-hidden sm:col-span-2 xl:col-span-1">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-slate-300 text-sm font-medium">
                            Salud del libro
                          </span>

                          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                            <Activity size={18} />
                          </div>
                        </div>

                        <h4 className="text-2xl font-black text-emerald-400 mt-3 tracking-tight">
                          {saludPorcentaje}%
                        </h4>

                        <p className="text-[10px] text-slate-500 mt-1">
                          Registros sin anomalías detectadas
                        </p>
                      </div>
                    </div>

                    {/* GRÁFICOS */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* DÉBITO Y CRÉDITO */}
                      <div className="xl:col-span-7 bg-[#1E293B]/70 backdrop-blur-md border border-[#5C0924]/50 p-5 rounded-2xl shadow-xl relative">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign
                              size={18}
                              className="text-emerald-400"
                            />

                            <h4 className="text-sm font-bold text-white">
                              Consolidado contable
                            </h4>
                          </div>

                          <BurbujaComentarios
                            graficoId="admin_consolidado_contable"
                            carpetaId={carpetaSeleccionada?.id}
                            usuarioActual={usuarioSesion}
                          />
                        </div>

                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartSaldosData}
                              barGap={12}
                              margin={{
                                top: 10,
                                right: 8,
                                left: 8,
                                bottom: 4
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#334155"
                                vertical={false}
                              />

                              <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                              />

                              <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                tickFormatter={(valor) =>
                                  `$${(valor / 1000).toFixed(0)}k`
                                }
                              />

                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f172a',
                                  borderColor: '#5C0924',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  color: '#fff'
                                }}
                                formatter={(valor, nombre) => [
                                  nombre === 'Débito'
                                    ? formatCordobas(valor)
                                    : formatMoney(valor),
                                  nombre
                                ]}
                              />

                              <Bar
                                dataKey="Débito"
                                fill="#c21c48"
                                radius={[8, 8, 0, 0]}
                                barSize={40}
                              />

                              <Bar
                                dataKey="Crédito"
                                fill="#0fb880"
                                radius={[8, 8, 0, 0]}
                                barSize={40}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-4 border-t border-slate-700/70 text-xs">
                          <div>
                            <span className="text-slate-400 text-[11px]">
                              Total débito
                            </span>

                            <p className="font-bold text-[#f4729b] mt-1">
                              {formatCordobas(resumenData.total_debito)}
                            </p>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[11px]">
                              Total crédito
                            </span>

                            <p className="font-bold text-emerald-400 mt-1">
                              {formatMoney(resumenData.total_credito)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DISTRIBUCIÓN DE ANOMALÍAS */}
                      <div className="xl:col-span-5 bg-[#1E293B]/70 backdrop-blur-md border border-[#5C0924]/50 p-5 rounded-2xl shadow-xl flex flex-col relative">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <BarChart2
                              size={18}
                              className="text-red-400"
                            />

                            <h4 className="text-sm font-bold text-white">
                              Análisis de anomalías
                            </h4>
                          </div>

                          <BurbujaComentarios
                            graficoId="admin_analisis_anomalias"
                            carpetaId={carpetaSeleccionada?.id}
                            usuarioActual={usuarioSesion}
                          />
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Distribución de transacciones normales y alertas
                        </p>

                        <div className="h-60 my-3">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartPieAnomalias}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {chartPieAnomalias.map((entrada, indice) => (
                                  <Cell
                                    key={`celda-${indice}`}
                                    fill={entrada.color}
                                    stroke="#0f172a"
                                    strokeWidth={2}
                                  />
                                ))}
                              </Pie>

                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f172a',
                                  borderColor: '#5C0924',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  color: '#fff'
                                }}
                                formatter={(valor) => [
                                  formatNumber(valor),
                                  'Transacciones'
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-700/70 text-[11px] mt-auto">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#8B0D37]" />
                              Transacciones normales
                            </span>

                            <span className="font-bold text-white">
                              {formatNumber(totalNormales)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-slate-300">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              Anomalías
                            </span>

                            <span className="font-bold text-red-400">
                              {formatNumber(resumenData.total_anomalias)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#1E293B]/40 border border-[#5C0924]/50 border-dashed rounded-2xl p-8 md:p-12 text-center min-h-[380px] flex flex-col items-center justify-center">
                    <div className="p-4 bg-[#5C0924]/20 rounded-2xl text-[#FDF2F5] mb-4 border border-[#5C0924]/50">
                      <ShieldCheck size={44} strokeWidth={1.5} />
                    </div>

                    <h3 className="text-base font-bold text-slate-200 mb-2">
                      No hay datos disponibles
                    </h3>

                    <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                      {carpetaSeleccionada
                        ? 'Esta carpeta todavía no tiene registros para mostrar. Selecciona otra carpeta para consultar sus resultados.'
                        : 'Selecciona una carpeta disponible para consultar el resumen financiero y las analíticas.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PÁGINA 2: ANALÍTICA AVANZADA */}
            {paginaDashboard === 2 && (
              <div className="animate-fade-in">
                {carpetaSeleccionada?.id ? (
                  <AnaliticaAvanzada
                    carpetaId={carpetaSeleccionada.id}
                  />
                ) : (
                  <div className="min-h-[380px] flex flex-col items-center justify-center text-center bg-[#1E293B]/40 border border-dashed border-[#5C0924]/50 rounded-2xl p-8">
                    <BarChart2
                      size={40}
                      className="text-[#FDF2F5] mb-4"
                    />

                    <h3 className="text-base font-bold text-slate-200 mb-2">
                      Selecciona una carpeta
                    </h3>

                    <p className="text-xs text-slate-400 max-w-sm">
                      Selecciona un proyecto en la parte superior para consultar su analítica avanzada.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PAGINACIÓN */}
          <div className="mt-6 bg-[#1E293B]/80 backdrop-blur-md border border-[#5C0924]/50 rounded-2xl p-3 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#5C0924]/30 text-[#FDF2F5] rounded-lg">
                  <BarChart2 size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold text-white">
                    {paginaDashboard === 1
                      ? 'Resumen financiero'
                      : 'Analítica avanzada'}
                  </p>

                  <p className="text-[10px] text-slate-400">
                    Vista {paginaDashboard} de {totalPaginasDashboard}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cambiarPagina(paginaDashboard - 1)}
                  disabled={paginaDashboard === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#5C0924]/60 bg-[#1E293B] text-slate-300 text-xs font-semibold transition-all hover:bg-[#5C0924]/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                  Anterior
                </button>

                <button
                  type="button"
                  aria-label="Ir al resumen financiero"
                  aria-current={paginaDashboard === 1 ? 'page' : undefined}
                  onClick={() => cambiarPagina(1)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    paginaDashboard === 1
                      ? 'bg-[#8B0D37] text-white shadow-lg shadow-[#5C0924]/30'
                      : 'bg-[#1E293B] border border-slate-700 text-slate-400 hover:bg-[#5C0924]/30 hover:text-white'
                  }`}
                >
                  1
                </button>

                <button
                  type="button"
                  aria-label="Ir a analítica avanzada"
                  aria-current={paginaDashboard === 2 ? 'page' : undefined}
                  onClick={() => cambiarPagina(2)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    paginaDashboard === 2
                      ? 'bg-[#8B0D37] text-white shadow-lg shadow-[#5C0924]/30'
                      : 'bg-[#1E293B] border border-slate-700 text-slate-400 hover:bg-[#5C0924]/30 hover:text-white'
                  }`}
                >
                  2
                </button>

                <button
                  type="button"
                  onClick={() => cambiarPagina(paginaDashboard + 1)}
                  disabled={paginaDashboard === totalPaginasDashboard}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#5C0924]/60 bg-[#1E293B] text-slate-300 text-xs font-semibold transition-all hover:bg-[#5C0924]/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

