// src/UserDashboard.jsx
import React, { useEffect, useState } from 'react';
import api from './api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldAlert, TrendingDown, TrendingUp, Landmark, LogOut, RefreshCw, FileText } from 'lucide-react';

export default function UserDashboard({ onLogout }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const respuesta = await api.get('/api/usuario/dashboard');
        setDatos(respuesta.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Error cargando los reportes bancarios.');
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  if (cargando) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <RefreshCw className="animate-spin mb-4 text-blue-500" size={40} />
      <p className="text-sm text-slate-400">Consultando base de datos segura...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
      <div className="bg-red-500/10 border border-red-500 p-6 rounded-xl text-center">
        <ShieldAlert className="text-red-500 mx-auto mb-2" size={32} />
        <p>{error}</p>
      </div>
    </div>
  );

  const chartData = [
    { 
      name: 'Saldos (C$)', 
      Débito: datos?.resumen?.total_debito || 0, 
      Crédito: datos?.resumen?.total_credito || 0 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      <nav className="border-b border-slate-800 bg-slate-800/50 backdrop-blur px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white"><Landmark size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-white">Portal de Consulta Bancaria</h1>
            <p className="text-xs text-slate-400">Cliente ID: {localStorage.getItem('codigo_cliente')}</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-sm font-medium rounded-lg border border-slate-700 transition-all">
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Total Débito</p>
              <h3 className="text-xl font-bold mt-1">C$ {datos?.resumen?.total_debito?.toLocaleString() || 0}</h3>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
          </div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Total Crédito</p>
              <h3 className="text-xl font-bold mt-1">C$ {datos?.resumen?.total_credito?.toLocaleString() || 0}</h3>
            </div>
            <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Transacciones</p>
              <h3 className="text-xl font-bold mt-1">{datos?.resumen?.total_registros || 0}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><FileText size={20} /></div>
          </div>
          <div className={`p-5 rounded-xl border flex justify-between items-center ${datos?.resumen?.total_anomalias > 0 ? 'bg-red-950/40 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
            <div>
              <p className="text-xs text-slate-400 uppercase font-medium">Alertas IA</p>
              <h3 className="text-xl font-bold mt-1">{datos?.resumen?.total_anomalias || 0}</h3>
            </div>
            <div className="p-3 rounded-lg bg-slate-700 text-slate-400"><ShieldAlert size={20} /></div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-base font-bold text-white mb-4">Balance Comparativo de Movimientos</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                <Legend />
                <Bar dataKey="Débito" fill="#ef4444" />
                <Bar dataKey="Crédito" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {datos?.anomalias?.length > 0 && (
          <div className="bg-slate-800 border border-red-500/30 rounded-xl overflow-hidden">
            <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/20 flex items-center gap-2">
              <ShieldAlert className="text-red-400" />
              <h4 className="font-bold text-red-400">Anomalías Detectadas por Isolation Forest</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-xs text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Cuenta</th>
                    <th className="px-6 py-3">Descripción</th>
                    <th className="px-6 py-3 text-right">Débito</th>
                    <th className="px-6 py-3 text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-sm">
                  {datos.anomalias.map((anomalia) => (
                    <tr key={anomalia.id} className="hover:bg-red-500/[0.01]">
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{anomalia.fecha}</td>
                      <td className="px-6 py-4 font-medium text-white">{anomalia.cuenta}</td>
                      <td className="px-6 py-4 text-slate-400">{anomalia.descripcion}</td>
                      <td className="px-6 py-4 text-right text-red-400">C$ {anomalia.debito?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-green-400">C$ {anomalia.credito?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

