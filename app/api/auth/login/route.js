import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { COOKIE, firmarSesion, duracion, inicioDe } from '@/lib/sesion';
import { cuerpo, error, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export async function POST(req) {
  const { usuario, clave } = await cuerpo(req);
  const u = texto(usuario, 40).toLowerCase();
  if (!u || !clave) return error(400, 'Escribe tu usuario y tu contraseña.');
  const db = await getDb();
  const doc = await db.collection('usuarios').findOne({ usuario: u });
  const valido = doc ? await bcrypt.compare(String(clave), doc.hash) : false;
  if (!valido) {
    await auditar('ingreso_fallido', null, { usuario: u });
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
  await auditar('ingreso', { usuario: doc.usuario, rol: doc.rol });
  return res;
}
