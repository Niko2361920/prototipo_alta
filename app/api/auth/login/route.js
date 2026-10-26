import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { COOKIE, firmarSesion, duracion, inicioDe } from '@/lib/sesion';
import { conErrores, cuerpo, error, ipDe, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

// Límite de intentos fallidos en una ventana de 15 minutos (pendiente «Media»
// del documento de contexto). Se cuenta sobre la colección auditoria, que ya
// guarda cada 'ingreso_fallido', para no agregar otra colección.
// - Por usuario (5): frena adivinar la clave de una cuenta concreta.
// - Por IP (20): frena probar muchos usuarios desde una conexión.
// Trade-off aceptado: alguien podría bloquear 15 min el ingreso de una cuenta
// fallando a propósito. Se descartó bloquear solo por IP porque cambiando de IP
// se podría seguir probando claves sobre la misma cuenta.
const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_USUARIO = 5;
const MAX_POR_IP = 20;

export const POST = conErrores(async (req) => {
  const { usuario, clave } = await cuerpo(req);
  const u = texto(usuario, 40).toLowerCase();
  if (!u || !clave) return error(400, 'Escribe tu usuario y tu contraseña.');
  const ip = ipDe(req);
  const db = await getDb();

  const desde = new Date(Date.now() - VENTANA_MS);
  const [fallosUsuario, fallosIp] = await Promise.all([
    db.collection('auditoria').countDocuments({ accion: 'ingreso_fallido', usuario: u, fecha: { $gte: desde } }),
    db.collection('auditoria').countDocuments({ accion: 'ingreso_fallido', 'detalle.ip': ip, fecha: { $gte: desde } }),
  ]);
  if (fallosUsuario >= MAX_POR_USUARIO || fallosIp >= MAX_POR_IP) {
    return error(429, 'Demasiados intentos fallidos. Espera 15 minutos e intenta otra vez.');
  }

  const doc = await db.collection('usuarios').findOne({ usuario: u });
  const valido = doc ? await bcrypt.compare(String(clave), doc.hash) : false;
  if (!valido) {
    await auditar('ingreso_fallido', null, { usuario: u, ip });
    await new Promise((r) => setTimeout(r, 600));
    return error(401, 'Usuario o contraseña incorrectos.');
  }
  const token = await firmarSesion(doc);
  const res = ok({ destino: inicioDe(doc.rol), nombre: doc.nombre, rol: doc.rol });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: duracion(doc.rol),
  });
  await db.collection('usuarios').updateOne({ _id: doc._id }, { $set: { ultimoIngreso: new Date() } });
  await auditar('ingreso', { usuario: doc.usuario, rol: doc.rol }, { ip });
  return res;
});
