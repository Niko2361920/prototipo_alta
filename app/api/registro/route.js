import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { COOKIE, firmarSesion, duracion, inicioDe } from '@/lib/sesion';
import { cuerpo, error, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

const MAX_POR_HORA = 5;

export async function POST(req) {
  const entrada = await cuerpo(req);
  const nombre = texto(entrada?.nombre, 60);
  const usuario = texto(entrada?.usuario, 30).toLowerCase();
  const clave = typeof entrada?.clave === 'string' ? entrada.clave : '';

  if (nombre.length < 2) return error(400, 'Escribe tu nombre.');
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    return error(400, 'El usuario debe tener 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.');
  }
  if (clave.length < 8 || clave.length > 100) {
    return error(400, 'La contraseña debe tener entre 8 y 100 caracteres.');
  }

  const db = await getDb();
  if ((await db.collection('usuarios').countDocuments({})) === 0) {
    return error(409, 'La plataforma aún no está configurada. Entra primero a /configurar.');
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  const hace1h = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await db.collection('auditoria').countDocuments({
    accion: 'registro',
    'detalle.ip': ip,
    fecha: { $gte: hace1h },
  });
  if (recientes >= MAX_POR_HORA) {
    return error(429, 'Demasiados registros desde esta conexión. Intenta más tarde.');
  }

  const documento = {
    _id: usuario,
    usuario,
    nombre,
    rol: 'produccion',
    hash: await bcrypt.hash(clave, 10),
    creado: new Date(),
  };

  try {
    await db.collection('usuarios').insertOne(documento);
  } catch (e) {
    if (e?.code === 11000) return error(409, 'Ese usuario ya existe. Elige otro.');
    throw e;
  }

  await auditar('registro', { usuario, rol: documento.rol }, { ip });

  const token = await firmarSesion(documento);
  const res = ok({ destino: inicioDe(documento.rol), nombre: documento.nombre });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: duracion(documento.rol),
  });
  return res;
}
