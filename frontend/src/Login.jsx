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

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const respuesta = await api.post('/api/token', formData);

      if (respuesta.data && respuesta.data.access_token) {
        const token = respuesta.data.access_token;
        const rol = respuesta.data.rol || 'User';
        const codigo_cliente = respuesta.data.codigo_cliente || '';

        localStorage.setItem('token', token);
        localStorage.setItem('rol', rol);
        localStorage.setItem('codigo_cliente', codigo_cliente);
        localStorage.setItem('username', username);

        onLoginSuccess({ username, rol, codigo_cliente });
      } else {
        setError('El servidor devolvió un formato de respuesta inválido.');
      }
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.detail ||
          'Usuario o contraseña incorrectos.'
        );
      } else {
        setError(
          'No se pudo conectar con el servidor backend (FastAPI). Verifica que esté encendido.'
        );
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans"
      style={{
        backgroundColor: '#1E293B',
        color: '#FDF2F5'
      }}
    >
      {/* Fondo corporativo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#8B0D37 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.20
        }}
      />

      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: '#8B0D37', opacity: 0.25 }}
      />

      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: '#5C0924', opacity: 0.45 }}
      />

      <div
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 backdrop-blur-xl border rounded-3xl shadow-2xl overflow-hidden relative z-10"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.96)',
          borderColor: 'rgba(253, 242, 245, 0.12)'
        }}
      >

        {/* COLUMNA IZQUIERDA: IDENTIDAD CORPORATIVA */}
        <div
          className="md:col-span-5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r"
          style={{
            background:
              'linear-gradient(145deg, #8B0D37 0%, #5C0924 58%, #1E293B 100%)',
            borderColor: 'rgba(253, 242, 245, 0.15)'
          }}
        >
          <div>
            {/* Logo / Header */}
            <div className="flex items-center gap-2.5 mb-8">
              <div
                className="p-2.5 rounded-2xl shadow-lg"
                style={{
                  backgroundColor: '#FDF2F5',
                  color: '#8B0D37',
                  boxShadow: '0 8px 24px rgba(30, 41, 59, 0.25)'
                }}
              >
                <TrendingUp size={22} />
              </div>

              <span className="font-extrabold text-lg text-white">
                Plataforma BI
              </span>
            </div>

            <h2 className="text-2xl font-black text-white leading-tight mb-3">
              Suite de Inteligencia Financiera
            </h2>

            <p
              className="text-xs leading-relaxed mb-6"
              style={{ color: '#FDF2F5', opacity: 0.82 }}
            >
              Plataforma de auditoría contable avanzada con detección de anomalías mediante Isolation Forest.
            </p>

            <div className="space-y-3.5">

              <div className="flex items-center gap-3 text-xs text-white">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor: 'rgba(253, 242, 245, 0.12)',
                    color: '#FDF2F5'
                  }}
                >
                  <ShieldCheck size={16} />
                </div>
                <span>Acceso seguro basado en roles (RBAC)</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-white">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor: 'rgba(253, 242, 245, 0.12)',
                    color: '#FDF2F5'
                  }}
                >
                  <Cpu size={16} />
                </div>
                <span>Auditoría en tiempo real con FastAPI</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-white">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor: 'rgba(253, 242, 245, 0.12)',
                    color: '#FDF2F5'
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <span>Consolidación automática de saldos</span>
              </div>

            </div>
          </div>

          <div
            className="mt-8 pt-4 border-t"
            style={{ borderColor: 'rgba(253, 242, 245, 0.20)' }}
          >
            <p
              className="text-[11px]"
              style={{ color: '#FDF2F5', opacity: 0.72 }}
            >
              © {new Date().getFullYear()} Sistema Financiero BI • Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center">

          <div className="mb-6">
            <h3
              className="text-xl font-bold mb-1"
              style={{ color: '#FDF2F5' }}
            >
              Iniciar Sesión
            </h3>

            <p
              className="text-xs"
              style={{ color: '#CBD5E1' }}
            >
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              className="mb-5 p-3.5 border text-xs rounded-2xl flex items-start gap-2.5 animate-shake"
              style={{
                backgroundColor: 'rgba(139, 13, 55, 0.18)',
                borderColor: 'rgba(139, 13, 55, 0.65)',
                color: '#FDF2F5'
              }}
            >
              <AlertCircle
                size={16}
                className="shrink-0 mt-0.5"
                style={{ color: '#F4A7BD' }}
              />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={ejecutarFormulario} className="space-y-4">

            {/* Campo usuario */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#FDF2F5' }}
              >
                Usuario Corporativo
              </label>

              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                  style={{ color: '#94A3B8' }}
                >
                  <User size={16} />
                </div>

                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    color: '#FDF2F5',
                    '--tw-ring-color': '#8B0D37'
                  }}
                  placeholder="ej. marjourie o admin"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8B0D37';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139, 13, 55, 0.22)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#475569';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Campo contraseña */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: '#FDF2F5' }}
              >
                Contraseña
              </label>

              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                  style={{ color: '#94A3B8' }}
                >
                  <Lock size={16} />
                </div>

                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    color: '#FDF2F5'
                  }}
                  placeholder="••••••••"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#8B0D37';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139, 13, 55, 0.22)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#475569';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                  style={{ color: '#94A3B8' }}
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword
                    ? <EyeOff size={16} />
                    : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón ingresar */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 px-4 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2 group disabled:opacity-50"
              style={{
                backgroundColor: '#8B0D37',
                boxShadow: '0 8px 20px rgba(139, 13, 55, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (!cargando) {
                  e.currentTarget.style.backgroundColor = '#5C0924';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#8B0D37';
              }}
            >
              {cargando ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Autenticando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

