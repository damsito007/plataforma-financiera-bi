// src/Login.jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import {
  User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2,
  AlertCircle, TrendingUp, Cpu, Sparkles, Activity
} from 'lucide-react';

// Fórmulas matemáticas y conceptos reales de Isolation Forest
const FORMULAS_ISOLATION_FOREST = [
  "s(x, n) = 2^(-E(h(x)) / c(n))",
  "c(n) = 2*(ln(n-1) + 0.5772) - 2(n-1)/n",
  "h(x) -> Path length in iTree",
  "E(h(x)) << c(n) => Anomaly",
  "Isolation Forest: s(x, n) >= 0.6",
  "iTree: split(attr_i, p_split)",
  "Score > 0.5 => Potential Outlier",
  "Subsample Size: n = 256",
  "Anomaly Score S(x, n) in [0, 1]",
  "Partitioning: Random Hyperplane Split"
];

// Componente para formulas tecleadas en los bordes exteriores de la pantalla (fuera del card de login)
function FloatingFormulaOutsideCard({ formula, delay }) {
  const [displayedText, setDisplayedText] = useState("");
  const [opacity, setOpacity] = useState(0);
  const [coords, setCoords] = useState({ top: "10%", left: "10%" });

  // Distribución en la periferia de la pantalla (evita el centro donde está la tarjeta de login)
  const getRandomCoordsAroundCard = () => {
    const esLadoIzquierdoODerecho = Math.random() > 0.5;
    let top, left;

    if (esLadoIzquierdoODerecho) {
      // Posicionar en franjas laterales (izquierda < 22% o derecha > 75%)
      left = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 3 : Math.floor(Math.random() * 18) + 78;
      top = Math.floor(Math.random() * 85) + 5;
    } else {
      // Posicionar en franjas superior o inferior (top < 15% o top > 85%)
      top = Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 3 : Math.floor(Math.random() * 10) + 86;
      left = Math.floor(Math.random() * 80) + 10;
    }

    return { top: `${top}%`, left: `${left}%` };
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const runTypewriterSequence = async () => {
      await new Promise(r => setTimeout(r, delay));

      while (isMounted) {
        setCoords(getRandomCoordsAroundCard());
        setDisplayedText("");
        setOpacity(0.55);

        for (let i = 0; i <= formula.length; i++) {
          if (!isMounted) return;
          setDisplayedText(formula.slice(0, i));
          await new Promise(r => setTimeout(r, 40 + Math.random() * 25));
        }

        await new Promise(r => setTimeout(r, 2200));

        if (!isMounted) return;
        setOpacity(0);
        await new Promise(r => setTimeout(r, 1000));
      }
    };

    runTypewriterSequence();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [formula, delay]);

  return (
    <div
      className="fixed font-mono text-[11px] md:text-xs select-none pointer-events-none transition-opacity duration-1000 tracking-wider font-bold z-0"
      style={{
        top: coords.top,
        left: coords.left,
        opacity: opacity,
        color: '#F4A7BD',
        textShadow: '0 0 14px rgba(139, 13, 55, 0.9)',
      }}
    >
      <span>{displayedText}</span>
      <span className="inline-block w-1.5 h-3 bg-[#8B0D37] ml-1 animate-pulse" />
    </div>
  );
}

// Gráficos SVG decorativos flotando exteriormente alrededor de la caja
function ScreenChartsDecoration() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-25">
      {/* 1. Scatter Plot (Esquina Superior Izquierda) */}
      <svg className="absolute top-8 left-8 w-56 h-40 text-white" viewBox="0 0 200 150">
        <line x1="20" y1="130" x2="180" y2="130" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="20" y1="20" x2="20" y2="130" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="80" cy="80" r="4" fill="#10b981" />
        <circle cx="95" cy="70" r="3" fill="#10b981" />
        <circle cx="70" cy="90" r="4" fill="#10b981" />
        <circle cx="85" cy="95" r="3" fill="#10b981" />
        <circle cx="105" cy="85" r="4" fill="#10b981" />
        <circle cx="160" cy="30" r="5" fill="#ef4444" className="animate-ping" />
        <circle cx="160" cy="30" r="5" fill="#ef4444" />
        <line x1="85" y1="83" x2="160" y2="30" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
        <text x="120" y="25" fill="#ef4444" fontSize="10" className="font-mono font-bold">s(x)=0.84</text>
      </svg>

      {/* 2. Histograma / Distribución (Esquina Inferior Derecha) */}
      <svg className="absolute bottom-8 right-8 w-60 h-36 text-white" viewBox="0 0 200 120">
        <rect x="10" y="80" width="18" height="30" fill="#8B0D37" opacity="0.6" />
        <rect x="34" y="50" width="18" height="60" fill="#8B0D37" opacity="0.8" />
        <rect x="58" y="30" width="18" height="80" fill="#8B0D37" />
        <rect x="82" y="65" width="18" height="45" fill="#8B0D37" opacity="0.7" />
        <rect x="106" y="90" width="18" height="20" fill="#ef4444" />
        <path d="M 10 90 Q 58 10, 120 100 T 190 105" fill="none" stroke="#FDF2F5" strokeWidth="2" />
        <text x="105" y="82" fill="#ef4444" fontSize="9" className="font-mono font-bold">Umbral Alerta</text>
      </svg>

      {/* 3. Estructura de Árbol iTree (Esquina Superior Derecha) */}
      <svg className="absolute top-10 right-12 w-48 h-36 text-white" viewBox="0 0 150 100">
        <circle cx="75" cy="15" r="4" fill="#FDF2F5" />
        <line x1="75" y1="15" x2="45" y2="45" stroke="#475569" strokeWidth="1.5" />
        <line x1="75" y1="15" x2="105" y2="45" stroke="#475569" strokeWidth="1.5" />
        <circle cx="45" cy="45" r="4" fill="#FDF2F5" />
        <circle cx="105" cy="45" r="4" fill="#FDF2F5" />
        <line x1="45" y1="45" x2="25" y2="75" stroke="#ef4444" strokeWidth="1.5" />
        <circle cx="25" cy="75" r="5" fill="#ef4444" className="animate-pulse" />
        <text x="5" y="95" fill="#ef4444" fontSize="8" className="font-mono font-bold">Short Path (Outlier)</text>
      </svg>
    </div>
  );
}

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
        const datosUsuarioServer = respuesta.data.usuario || {};

        const id = datosUsuarioServer.id || 1;
        const rol = datosUsuarioServer.rol || respuesta.data.rol || 'User';
        const codigo_cliente = datosUsuarioServer.codigo_cliente || respuesta.data.codigo_cliente || '';
        const userNombre = datosUsuarioServer.username || username;

        localStorage.setItem('token', token);
        localStorage.setItem('id', id);
        localStorage.setItem('rol', rol);
        localStorage.setItem('codigo_cliente', codigo_cliente);
        localStorage.setItem('username', userNombre);

        onLoginSuccess({
          id,
          username: userNombre,
          rol,
          codigo_cliente
        });
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
      {/* 1. CAPA DE GRÁFICOS FLOTANTES EXTERIORES */}
      <ScreenChartsDecoration />

      {/* 2. CAPA DE FÓRMULAS TECLEADAS FLOTANDO FUERA DE LA CAJA */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {FORMULAS_ISOLATION_FOREST.map((formula, idx) => (
          <FloatingFormulaOutsideCard
            key={idx}
            formula={formula}
            delay={idx * 1300}
          />
        ))}
      </div>

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

      {/* TARJETA DE LOGIN PRINCIPAL */}
      <div
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 backdrop-blur-xl border rounded-3xl shadow-2xl overflow-hidden relative z-10"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.96)',
          borderColor: 'rgba(253, 242, 245, 0.12)'
        }}
      >

        {/* COLUMNA IZQUIERDA: IDENTIDAD CORPORATIVA */}
        <div
          className="md:col-span-5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r relative overflow-hidden"
          style={{
            background:
              'linear-gradient(145deg, #8B0D37 0%, #5C0924 58%, #1E293B 100%)',
            borderColor: 'rgba(253, 242, 245, 0.15)'
          }}
        >
          <div className="relative z-10">
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
            className="mt-8 pt-4 border-t relative z-10"
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
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center relative">

          <div className="mb-6 relative z-10">
            <h3
              className="text-xl font-bold mb-1 flex items-center gap-2"
              style={{ color: '#FDF2F5' }}
            >
              <span>Iniciar Sesión</span>
              <Activity size={18} className="text-[#8B0D37]" />
            </h3>

            <p
              className="text-xs"
              style={{ color: '#CBD5E1' }}
            >
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>

          {error && (
            <div
              className="mb-5 p-3.5 border text-xs rounded-2xl flex items-start gap-2.5 animate-shake relative z-10"
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

          <form onSubmit={ejecutarFormulario} className="space-y-4 relative z-10">
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
                    color: '#FDF2F5'
                  }}
                  placeholder="ej. marjourie o admin"
                />
              </div>
            </div>

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
                />

                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                  style={{ color: '#94A3B8' }}
                >
                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 px-4 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2 group disabled:opacity-50 shadow-lg"
              style={{
                backgroundColor: '#8B0D37',
                boxShadow: '0 8px 20px rgba(139, 13, 55, 0.35)'
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