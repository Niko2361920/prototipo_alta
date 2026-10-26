'use client';
// Piezas pequeñas compartidas por Gerencia y Producción
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icono, Icono6M } from './Iconos';
import { categoriaPorId, nombreUsuario } from '@/lib/catalogo';

export async function api(url, opciones = {}) {
  const res = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    body: opciones.body && typeof opciones.body !== 'string' ? JSON.stringify(opciones.body) : opciones.body,
    cache: 'no-store',
  });
  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Sesión terminada');
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || 'Algo salió mal. Intenta otra vez.');
  return datos;
}

// Carga datos y los refresca cada `cada` ms (0 = sin refresco automático)
export function useDatos(url, cada = 0) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);
  const recargar = useCallback(async () => {
    if (!url) return;
    try {
      const d = await api(url);
      if (vivo.current) { setDatos(d); setError(''); }
    } catch (e) {
      if (vivo.current) setError(e.message);
    } finally {
      if (vivo.current) setCargando(false);
    }
  }, [url]);
  useEffect(() => {
    vivo.current = true;
    setCargando(true);
    recargar();
    if (!cada) return () => { vivo.current = false; };
    const t = setInterval(() => { if (document.visibilityState === 'visible') recargar(); }, cada);
    return () => { vivo.current = false; clearInterval(t); };
  }, [recargar, cada]);
  return { datos, error, cargando, recargar, setDatos };
}

export function useAviso() {
  const [aviso, setAviso] = useState(null);
  const t = useRef();
  const mostrar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(t.current);
    setAviso({ texto, tipo });
    t.current = setTimeout(() => setAviso(null), 3800);
  }, []);
  const nodo = aviso ? (
    <div className={`toast ${aviso.tipo === 'error' ? 'error' : ''}`} role="status" aria-live="polite">{aviso.texto}</div>
  ) : null;
  return [nodo, mostrar];
}

export function Modal({ titulo, onCerrar, children, pie, ancho }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onCerrar?.();
    window.addEventListener('keydown', f);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = prev; };
  }, [onCerrar]);
  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined} style={ancho ? { width: `min(${ancho}px, 100%)` } : undefined}>
        <div className="modal-cab">
          <h2 style={{ fontSize: '1.2rem' }}>{titulo}</h2>
          <button className="btn fantasma icono" onClick={onCerrar} aria-label="Cerrar"><Icono.x /></button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie ? <div className="modal-pie">{pie}</div> : null}
      </div>
    </div>
  );
}

export function Cat6M({ id, tam = 18 }) {
  const I = Icono6M[id];
  return I ? <I tam={tam} /> : null;
}

export function ChipCategoria({ id }) {
  const c = categoriaPorId[id];
  return <span className="chip gris"><Cat6M id={id} tam={14} />{c?.nombre || id}</span>;
}

// ---------- Formato ----------
const nf = new Intl.NumberFormat('es-CO');
export const n = (x) => (x == null ? '—' : nf.format(x));
export const pct = (x, dec = 1) => (x == null ? '—' : `${(x * 100).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })} %`);
export const hora = (f) => new Date(f).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
export const fecha = (f, opts = { day: 'numeric', month: 'short' }) => new Date(f).toLocaleDateString('es-CO', { ...opts, timeZone: 'America/Bogota' });
export const fechaHora = (f) => `${fecha(f)} · ${hora(f)}`;
export const quien = nombreUsuario;

// Estado del % de defectos frente a la merma máxima del trabajo o la meta de la empresa
export function estadoDefectos(p, maximo = 5) {
  if (p == null) return { clase: '', texto: 'Sin datos', Ico: Icono.reloj };
  const v = p * 100;
  if (v <= maximo * 0.6) return { clase: 'bien', texto: 'Dentro de la meta', Ico: Icono.checkCirculo };
  if (v <= maximo) return { clase: 'atencion', texto: 'Cerca del límite', Ico: Icono.alerta };
  return { clase: 'critico', texto: 'Por encima de la meta', Ico: Icono.alerta };
}

// Reduce una imagen en el navegador antes de subirla (máx. 1600 px)
export function prepararImagen(archivo, max = 1600) {
  return new Promise((resolve, reject) => {
    if (!archivo) return reject(new Error('No hay archivo.'));
    if (archivo.type === 'image/svg+xml') {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      return r.readAsDataURL(archivo);
    }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    img.src = url;
  });
}
