// Utilidades de cuentas compartidas por las rutas de usuarios y de contraseña.
import 'server-only';
import { timingSafeEqual } from 'node:crypto';

export const corto = (nombre = '') => String(nombre).trim().split(/\s+/)[0] || '';

export const usuarioPublico = (u) => ({ usuario: u.usuario, nombre: u.nombre, corto: corto(u.nombre) || u.usuario, rol: u.rol });

// Gerencia primero; después en el orden en que se crearon (los 3 de /configurar quedan de primeros).
export function ordenarUsuarios(docs) {
  const t = (d) => (d.creado ? new Date(d.creado).getTime() : 0);
  return [...docs].sort((a, b) => (a.rol === b.rol ? t(a) - t(b) || a.usuario.localeCompare(b.usuario) : a.rol === 'gerente' ? -1 : 1));
}

// Comparación en tiempo constante del código de gerencia (variable CODIGO_GERENCIA)
export function codigoGerenciaValido(recibido) {
  const esperado = process.env.CODIGO_GERENCIA || '';
  if (esperado.length < 8) return false;
  const a = Buffer.from(String(recibido || ''));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const claveValida = (c) => typeof c === 'string' && c.length >= 8 && c.length <= 100;
