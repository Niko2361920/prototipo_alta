// Utilidades para las rutas de la API
import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE, leerSesion } from './sesion';

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
