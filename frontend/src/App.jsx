// src/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

export default function App() {
  const [sesion, setSesion] = useState(null);

  // Recupera la sesión guardada en localStorage si el usuario refresca la pantalla
  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    const codigo_cliente = localStorage.getItem('codigo_cliente');
    const username = localStorage.getItem('username');
    
    if (token && rol) {
      setSesion({ username, rol, codigo_cliente });
    }
  }, []);

  const manejarLoginExitoso = (datosUsuario) => {
    setSesion(datosUsuario);
  };

  const manejarCerrarSesion = () => {
    localStorage.clear();
    setSesion(null);
  };

  // 1. Si no hay sesión activa -> Muestra el Login
  if (!sesion) {
    return <Login onLoginSuccess={manejarLoginExitoso} />;
  }

  // 2. Si es Admin -> Carga el AdminDashboard con soporte de carpetas y Supabase
  if (sesion.rol === 'Admin') {
    return <AdminDashboard usuarioSesion={sesion} onLogout={manejarCerrarSesion} />;
  }

  // 3. Si es Usuario Lector -> Carga el UserDashboard (solo lectura y comentarios)
  return <UserDashboard usuarioSesion={sesion} onLogout={manejarCerrarSesion} />;
}
