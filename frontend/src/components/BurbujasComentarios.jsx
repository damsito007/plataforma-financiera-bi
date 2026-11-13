// src/components/BurbujasComentarios.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    MessageSquare, Send, X, CornerDownRight,
    MessageCircle, Clock, Check, User, Trash2
} from 'lucide-react';

export default function BurbujaComentarios({ graficoId, carpetaId, usuarioActual, modoClaro = false }) {
    const [abierto, setAbierto] = useState(false);
    const [comentarios, setComentarios] = useState([]);
    const [nuevoTexto, setNuevoTexto] = useState('');
    const [replyingToId, setReplyingToId] = useState(null);
    const [textoRespuesta, setTextoRespuesta] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (abierto) {
            cargarComentarios();
        }
    }, [abierto, graficoId, carpetaId]);

    const cargarComentarios = async () => {
        try {
            setCargando(true);
            const url = carpetaId
                ? `/api/comentarios/${graficoId}?carpeta_id=${carpetaId}`
                : `/api/comentarios/${graficoId}`;
            const res = await api.get(url);
            setComentarios(res.data);
        } catch (err) {
            console.error("Error al cargar comentarios:", err);
        } finally {
            setCargando(false);
        }
    };

    const enviarComentarioPrincipal = async (e) => {
        e.preventDefault();
        if (!nuevoTexto.trim()) return;

        try {
            const payload = {
                grafico_id: graficoId,
                carpeta_id: carpetaId || null,
                usuario_id: usuarioActual?.id || 1,
                texto: nuevoTexto,
                parent_id: null
            };

            await api.post('/api/comentarios', payload);
            setNuevoTexto('');
            cargarComentarios();
        } catch (err) {
            alert("Error al guardar la observación.");
        }
    };

    const enviarRespuestaHilo = async (parentId) => {
        if (!textoRespuesta.trim()) return;

        const currentUserId = usuarioActual?.id || usuarioActual?.usuario_id;

        if (!currentUserId) {
            alert("Error de sesión: No se pudo identificar al usuario actual.");
            return;
        }

        try {
            const payload = {
                grafico_id: graficoId,
                carpeta_id: carpetaId || null,
                usuario_id: currentUserId,
                texto: textoRespuesta,
                parent_id: parentId
            };

            await api.post('/api/comentarios', payload);
            setTextoRespuesta('');
            setReplyingToId(null);
            cargarComentarios();
        } catch (err) {
            alert("Error al enviar la respuesta.");
        }
    };

    const resolverObservacion = async (comentarioId) => {
        try {
            await api.patch(`/api/comentarios/${comentarioId}/resolver`);
            cargarComentarios();
        } catch (err) {
            alert("No se pudo cambiar el estado de la observación.");
        }
    };

    const eliminarComentario = async (comentarioId) => {
        if (!confirm("¿Deseas eliminar este comentario/respuesta?")) return;

        try {
            await api.delete(`/api/comentarios/${comentarioId}`);
            cargarComentarios();
        } catch (err) {
            alert("No se pudo eliminar el comentario.");
        }
    };

    const totalAbiertos = comentarios.filter(c => c.estado === 'abierto').length;

    return (
        <div className="relative inline-block z-30 font-sans">
            {/* BOTÓN BURBUJA EN EL HEADER DEL GRÁFICO */}
            <button
                onClick={() => setAbierto(!abierto)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all duration-200 group ${
                    modoClaro
                        ? 'bg-[#8B0D37]/10 hover:bg-[#8B0D37]/20 text-[#8B0D37] border-[#8B0D37]/30'
                        : 'bg-[#8B0D37]/20 hover:bg-[#8B0D37]/30 text-[#FDF2F5] border-[#8B0D37]/50 shadow-md'
                }`}
                title="Ver hilos de auditoría sobre este gráfico"
            >
                <MessageSquare
                    size={14}
                    className={`${modoClaro ? 'text-[#8B0D37]' : 'text-[#FDF2F5]'} group-hover:scale-110 transition-transform`}
                />
                <span>Auditoría</span>

                {totalAbiertos > 0 ? (
                    <span
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse border ${
                            modoClaro
                                ? 'bg-red-100 text-red-600 border-red-300'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                    >
                        {totalAbiertos}
                    </span>
                ) : comentarios.length > 0 ? (
                    <span
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            modoClaro
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                    >
                        ✓
                    </span>
                ) : null}
            </button>

            {/* PANEL DESPLEGABLE POPUP */}
            {abierto && (
                <div
                    className={`absolute right-0 mt-2 w-80 sm:w-96 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 transition-colors ${
                        modoClaro
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-[#1E293B] border-slate-700 text-slate-100'
                    }`}
                >
                    {/* Header del Modal (se mantiene institucional en tono vino en ambos modos) */}
                    <div
                        className={`p-3.5 border-b flex items-center justify-between ${
                            modoClaro
                                ? 'bg-[#8B0D37] border-[#5C0924] text-white'
                                : 'bg-[#5C0924]/60 border-slate-700/80 text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-[#FDF2F5]" />
                            <h4 className="text-xs font-bold text-white">Observaciones y Hallazgos</h4>
                        </div>
                        <button
                            onClick={() => setAbierto(false)}
                            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Formulario de Entrada Principal */}
                    <form
                        onSubmit={enviarComentarioPrincipal}
                        className={`p-3 border-b ${
                            modoClaro
                                ? 'border-slate-200 bg-slate-50'
                                : 'border-slate-800 bg-[#1E293B]/90'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Escribe una observación de auditoría..."
                                value={nuevoTexto}
                                onChange={(e) => setNuevoTexto(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-[#8B0D37] ${
                                    modoClaro
                                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                        : 'bg-slate-900 border-slate-700 text-white placeholder-slate-400'
                                }`}
                            />
                            <button
                                type="submit"
                                disabled={!nuevoTexto.trim()}
                                className="p-2 bg-[#8B0D37] hover:bg-[#5C0924] disabled:opacity-40 text-white rounded-xl transition-all shrink-0"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </form>

                    {/* Lista de Comentarios e Hilos */}
                    <div className={`p-3 max-h-80 overflow-y-auto space-y-3 ${modoClaro ? 'bg-white' : ''}`}>
                        {cargando ? (
                            <p className={`text-center text-xs py-4 ${modoClaro ? 'text-slate-500' : 'text-slate-400'}`}>
                                Sincronizando observaciones con Supabase...
                            </p>
                        ) : comentarios.length === 0 ? (
                            <div className={`text-center py-6 space-y-1 ${modoClaro ? 'text-slate-500' : 'text-slate-400'}`}>
                                <p className="text-xs font-medium">Sin observaciones registradas.</p>
                                <p className="text-[10px]">Agrega una nota para iniciar el hilo de auditoría.</p>
                            </div>
                        ) : (
                            comentarios.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                                        modoClaro
                                            ? item.estado === 'resuelto'
                                                ? 'bg-slate-50 border-slate-200 opacity-75'
                                                : 'bg-slate-50/80 border-slate-200 shadow-sm'
                                            : item.estado === 'resuelto'
                                                ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
                                                : 'bg-slate-900 border-slate-700/80'
                                    }`}
                                >
                                    {/* Encabezado: Usuario, Hora, Botón Resolver y Papelera */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <User size={12} className="text-[#8B0D37] shrink-0" />
                                            <span className={`font-bold truncate ${modoClaro ? 'text-slate-800' : 'text-slate-200'}`}>
                                                {item.username || `Usuario #${item.usuario_id}`}
                                            </span>
                                            <span className={`text-[10px] flex items-center gap-1 shrink-0 ${modoClaro ? 'text-slate-500' : 'text-slate-400'}`}>
                                                <Clock size={11} />
                                                {new Date(item.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {item.estado === 'abierto' ? (
                                                <button
                                                    onClick={() => resolverObservacion(item.id)}
                                                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                                                        modoClaro
                                                            ? 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                                            : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                                                    }`}
                                                    title="Marcar caso como resuelto"
                                                >
                                                    <Check size={11} /> Resolver
                                                </button>
                                            ) : (
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                                        modoClaro
                                                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                    }`}
                                                >
                                                    Resuelto
                                                </span>
                                            )}

                                            {/* BOTÓN ELIMINAR COMENTARIO PRINCIPAL */}
                                            <button
                                                onClick={() => eliminarComentario(item.id)}
                                                className={`p-1 rounded-lg border transition-all ${
                                                    modoClaro
                                                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                                }`}
                                                title="Eliminar observación"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Texto principal */}
                                    <p className={`text-xs leading-relaxed ${modoClaro ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {item.texto}
                                    </p>

                                    {/* Respuestas anidadas (Hilos) */}
                                    {item.respuestas && item.respuestas.length > 0 && (
                                        <div className="pl-3 border-l-2 border-[#8B0D37]/50 space-y-2 pt-1 mt-2">
                                            {item.respuestas.map((resp) => (
                                                <div
                                                    key={resp.id}
                                                    className={`p-2 rounded-lg text-[11px] border ${
                                                        modoClaro
                                                            ? 'bg-white border-slate-200'
                                                            : 'bg-slate-800/60 border-slate-700/50'
                                                    }`}
                                                >
                                                    <div
                                                        className={`flex items-center justify-between font-semibold mb-0.5 ${
                                                            modoClaro ? 'text-[#8B0D37]' : 'text-[#FDF2F5]'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <CornerDownRight size={10} className="text-[#8B0D37]" />
                                                            {resp.username || `Usuario #${resp.usuario_id}`}
                                                        </span>

                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] ${modoClaro ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                {new Date(resp.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>

                                                            <button
                                                                onClick={() => eliminarComentario(resp.id)}
                                                                className={`p-0.5 transition-colors ${
                                                                    modoClaro
                                                                        ? 'text-red-500/80 hover:text-red-600'
                                                                        : 'text-red-400/70 hover:text-red-400'
                                                                }`}
                                                                title="Eliminar respuesta"
                                                            >
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className={`pl-3 ${modoClaro ? 'text-slate-700' : 'text-slate-300'}`}>
                                                        {resp.texto}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botón y formulario para responder en hilo */}
                                    {item.estado === 'abierto' && (
                                        <div className="pt-1">
                                            {replyingToId === item.id ? (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe una respuesta..."
                                                        value={textoRespuesta}
                                                        onChange={(e) => setTextoRespuesta(e.target.value)}
                                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] focus:outline-none focus:border-[#8B0D37] ${
                                                            modoClaro
                                                                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                                                : 'bg-slate-950 border-slate-700 text-white'
                                                        }`}
                                                    />
                                                    <button
                                                        onClick={() => enviarRespuestaHilo(item.id)}
                                                        className="p-1.5 bg-[#8B0D37] hover:bg-[#5C0924] text-white rounded-lg text-[10px] font-bold shrink-0"
                                                    >
                                                        <Send size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setReplyingToId(null)}
                                                        className={`p-1.5 rounded-lg text-[10px] ${
                                                            modoClaro
                                                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                                : 'bg-slate-800 text-slate-400'
                                                        }`}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReplyingToId(item.id)}
                                                    className={`text-[10px] hover:underline font-semibold flex items-center gap-1 mt-1 ${
                                                        modoClaro ? 'text-[#8B0D37]' : 'text-[#FDF2F5]'
                                                    }`}
                                                >
                                                    <CornerDownRight size={11} className="text-[#8B0D37]" /> Responder
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}