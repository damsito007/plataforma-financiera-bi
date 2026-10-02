// src/components/BurbujaComentarios.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    MessageSquare, Send, CheckCircle2, X, CornerDownRight,
    MessageCircle, Clock, Check
} from 'lucide-react';

export default function BurbujaComentarios({ graficoId, carpetaId, usuarioActual }) {
    const [abierto, setAbierto] = useState(false);
    const [comentarios, setComentarios] = useState([]);
    const [nuevoTexto, setNuevoTexto] = useState('');
    const [replyingToId, setReplyingToId] = useState(null); // ID del comentario al que se está respondiendo
    const [textoRespuesta, setTextoRespuesta] = useState('');
    const [cargando, setCargando] = useState(false);

    // Cargar comentarios al abrir la burbuja o cambiar de proyecto/carpeta
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

    // 1. Enviar comentario principal sobre el gráfico
    const enviarComentarioPrincipal = async (e) => {
        e.preventDefault();
        if (!nuevoTexto.trim()) return;

        try {
            const payload = {
                grafico_id: graficoId,
                carpeta_id: carpetaId || null,
                usuario_id: usuarioActual?.id || 1, // fallback ID
                texto: nuevoTexto,
                parent_id: null
            };

            await api.post('/api/comentarios', payload);
            setNuevoTexto('');
            cargarComentarios();
        } catch (err) {
            alert("Error al guardar la observación en Supabase.");
        }
    };

    // 2. Enviar respuesta en hilo a un comentario existente
    const enviarRespuestaHilo = async (parentId) => {
        if (!textoRespuesta.trim()) return;

        try {
            const payload = {
                grafico_id: graficoId,
                carpeta_id: carpetaId || null,
                usuario_id: usuarioActual?.id || 1,
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

    // 3. Marcar una observación como resuelta
    const resolverObservacion = async (comentarioId) => {
        try {
            await api.patch(`/api/comentarios/${comentarioId}/resolver`);
            cargarComentarios();
        } catch (err) {
            alert("No se pudo cambiar el estado de la observación.");
        }
    };

    // Conteo de hallazgos abiertos
    const totalAbiertos = comentarios.filter(c => c.estado === 'abierto').length;

    return (
        <div className="relative inline-block z-30 font-sans">

            {/* BOTÓN / BURBUJA FLOTANTE EN EL HEADER DEL GRÁFICO */}
            <button
                onClick={() => setAbierto(!abierto)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold shadow-md transition-all duration-200 group"
                title="Ver hilos de auditoría sobre este gráfico"
            >
                <MessageSquare size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Auditoría</span>

                {totalAbiertos > 0 ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-bold animate-pulse">
                        {totalAbiertos}
                    </span>
                ) : comentarios.length > 0 ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                        ✓
                    </span>
                ) : null}
            </button>

            {/* PANEL POPUP DESPLEGABLE DE OBSERVACIONES */}
            {abierto && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Header del Modal */}
                    <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-blue-400" />
                            <h4 className="text-xs font-bold text-white">Observaciones y Hallazgos</h4>
                        </div>
                        <button
                            onClick={() => setAbierto(false)}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Formulario de Entrada Principal */}
                    <form onSubmit={enviarComentarioPrincipal} className="p-3 border-b border-slate-800 bg-slate-950/40">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Escribe una observación de auditoría..."
                                value={nuevoTexto}
                                onChange={(e) => setNuevoTexto(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={!nuevoTexto.trim()}
                                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all shrink-0"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </form>

                    {/* Lista de Comentarios e Hilos */}
                    <div className="p-3 max-h-80 overflow-y-auto space-y-3">
                        {cargando ? (
                            <p className="text-center text-xs text-slate-500 py-4">Sincronizando observaciones con Supabase...</p>
                        ) : comentarios.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 space-y-1">
                                <p className="text-xs font-medium">Sin observaciones registradas.</p>
                                <p className="text-[10px]">Agrega una nota para iniciar el hilo de auditoría.</p>
                            </div>
                        ) : (
                            comentarios.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${item.estado === 'resuelto'
                                            ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                                            : 'bg-slate-950 border-slate-800'
                                        }`}
                                >
                                    {/* Usuario, Fecha y Estado */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-200">
                                                Usuario #{item.usuario_id}
                                            </span>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock size={11} />
                                                {new Date(item.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {item.estado === 'abierto' ? (
                                            <button
                                                onClick={() => resolverObservacion(item.id)}
                                                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20 transition-all"
                                                title="Marcar caso como resuelto"
                                            >
                                                <Check size={11} /> Resolver
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                Resuelto
                                            </span>
                                        )}
                                    </div>

                                    {/* Texto de la observación */}
                                    <p className="text-slate-300 text-xs leading-relaxed">{item.texto}</p>

                                    {/* Respuestas anidadas (Hilo) */}
                                    {item.respuestas && item.respuestas.length > 0 && (
                                        <div className="pl-3 border-l-2 border-slate-800 space-y-2 pt-1 mt-2">
                                            {item.respuestas.map((resp) => (
                                                <div key={resp.id} className="bg-slate-900/60 p-2 rounded-lg text-[11px]">
                                                    <div className="flex items-center gap-1 font-semibold text-blue-400 mb-0.5">
                                                        <CornerDownRight size={10} />
                                                        <span>Usuario #{resp.usuario_id}</span>
                                                    </div>
                                                    <p className="text-slate-300">{resp.texto}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botón de responder en Hilo */}
                                    {item.estado === 'abierto' && (
                                        <div className="pt-1">
                                            {replyingToId === item.id ? (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe una respuesta en hilo..."
                                                        value={textoRespuesta}
                                                        onChange={(e) => setTextoRespuesta(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        onClick={() => enviarRespuestaHilo(item.id)}
                                                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shrink-0"
                                                    >
                                                        <Send size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => setReplyingToId(null)}
                                                        className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-[10px]"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReplyingToId(item.id)}
                                                    className="text-[10px] text-blue-400 hover:underline font-semibold flex items-center gap-1"
                                                >
                                                    <CornerDownRight size={11} /> Responder
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