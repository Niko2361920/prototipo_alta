// Firma y verificación de la sesión (cookie). Funciona también en el middleware (edge).
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE = 'tg_sesion';

function clave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.VERCEL) {
      // `publico`: el mensaje no tiene secretos y se puede mostrar en el formulario
      const e = new Error('Falta SESSION_SECRET (mínimo 32 caracteres) en Vercel → Settings → Environment Variables. Agrégala y vuelve a desplegar.');
      e.publico = true;
      throw e;
    }
    return new TextEncoder().encode('clave-solo-para-pruebas-locales-no-usar-en-produccion');
  }
  return new TextEncoder().encode(s);
}

// Producción deja la sesión abierta en el portátil del televisor (30 días);
// gerencia, 7 días.
export function duracion(rol) {
  return rol === 'produccion' ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
}

export async function firmarSesion(usuario) {
  return new SignJWT({ u: usuario.usuario, n: usuario.nombre, r: usuario.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${duracion(usuario.rol)}s`)
    .sign(clave());
}

export async function leerSesion(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return { usuario: payload.u, nombre: payload.n, rol: payload.r };
  } catch {
    return null;
  }
}

export const inicioDe = (rol) => (rol === 'gerente' ? '/gerencia' : '/produccion');
