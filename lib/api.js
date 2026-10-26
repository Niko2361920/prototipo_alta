// Utilidades para las rutas de la API
import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE, leerSesion } from './sesion';
import { mensajePublico } from './mongo-config';

export async function sesionActual() {
  const c = await cookies();
  return leerSesion(c.get(COOKIE)?.value);
}

// Exige sesión (y opcionalmente un rol). Devuelve {sesion} o {respuesta} con el error.
export async function exigir(...roles) {
  const sesion = await sesionActual();
  if (!sesion) return { respuesta: error(401, 'Tu sesión terminó. Vuelve a entrar.') };
  if (roles.length && !roles.includes(sesion.rol)) return { respuesta: error(403, 'No tienes permiso para esto.') };
  return { sesion };
}

export function error(status, mensaje) {
  return NextResponse.json({ error: mensaje }, { status });
}

export function ok(data, init) {
  return NextResponse.json(data, init);
}

// Envuelve una ruta para que cualquier error salga como JSON con un mensaje
// entendible. Sin esto, un fallo de la base de datos devolvía la página HTML 500
// de Next y el formulario mostraba "Unexpected token '<'..." en vez de la causa.
export function conErrores(manejador) {
  return async (...args) => {
    try {
      return await manejador(...args);
    } catch (e) {
      console.error('[api] error no controlado:', e);
      // 503 si es la base de datos (servicio no disponible), 500 para lo demás
      return error(e?.name === 'ErrorBD' ? 503 : 500, mensajePublico(e));
    }
  };
}

// IP del cliente. En Vercel x-forwarded-for la pone el propio Vercel (el primer
// valor es el cliente); en local puede no venir.
export function ipDe(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'desconocida';
}

export async function cuerpo(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export const texto = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const entero = (v, min = 0, max = 1_000_000) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};
