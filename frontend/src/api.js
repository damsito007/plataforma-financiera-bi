// src/api.js
import axios from 'axios';

// Instancia base apuntando al servidor FastAPI
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 60000, // 60 segundos de tolerancia para procesar archivos grandes
});

// Interceptor para inyectar automáticamente el token de autorización JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para manejar errores de autenticación (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el token expiró o es inválido, expulsa al usuario al Login
      localStorage.clear();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

