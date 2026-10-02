// src/Login.jsx
import React, { useState } from 'react';
import api from './api';
import { 
  User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, 
  AlertCircle, TrendingUp, Cpu, Sparkles 
} from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const ejecutarFormulario = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    // FastAPI requiere enviar credenciales como Form Data
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const respuesta = await api.post('/api/token', formData);
      
      if (respuesta.data && respuesta.data.access_token) {
        const token = respuesta.data.access_token;
        const rol = respuesta.data.rol || 'User';
        const codigo_cliente = respuesta.data.codigo_cliente || '';
        
        // 1. Guardar en localStorage para mantener sesión al recargar
        localStorage.setItem('token', token);
        localStorage.setItem('rol', rol);
        localStorage.setItem('codigo_cliente', codigo_cliente);
        localStorage.setItem('username', username);

        // 2. Notificar a App.jsx para cambiar de pantalla
        onLoginSuccess({ username, rol, codigo_cliente });
      } else {
        setError('El servidor devolvió un formato de respuesta inválido.');
      }
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'Usuario o contraseña incorrectos.');
      } else {
        setError('No se pudo conectar con el servidor backend (FastAPI). Verifica que esté encendido.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Luces y patrones de fondo (Efecto Glow & Grid) */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN Y BRANDING (5 Cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-900/40 via-indigo-950/60 to-slate-900 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            {/* Logo / Header */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/20">
                <TrendingUp size={22} className="text-white" />
              </div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Plataforma BI
              </span>
            </div>

            <h2 className="text-2xl font-black text-white leading-tight mb-3">
              Suite de Inteligencia Financiera & IA
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Plataforma de auditoría contable avanzada con detección de anomalías mediante Isolation Forest.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <span>Acceso seguro basado en roles (RBAC)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Cpu size={16} />
                </div>
                <span>Auditoría en tiempo real con FastAPI</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <span>Consolidación automática de saldos</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} Sistema Financiero BI • Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO DE ACCESO (7 Cols) */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Iniciar Sesión</h3>
            <p className="text-xs text-slate-400">Ingresa tus credenciales para acceder a la plataforma</p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={ejecutarFormulario} className="space-y-4">
            
            {/* Campo Usuario */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Usuario Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text" 
                  required
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="ej. marjourie o admin"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={mostrarPassword ? "text" : "password"} 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón de Submit */}
            <button
              type="submit" 
              disabled={cargando}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2 group"
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Autenticando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}