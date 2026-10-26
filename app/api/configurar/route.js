import bcrypt from 'bcryptjs';
import { getDb, usaMemoria } from '@/lib/db';
import { USUARIOS_BASE } from '@/lib/catalogo';
import { cargarDatosPrueba } from '@/lib/semilla';
import { conErrores, cuerpo, error, ok } from '@/lib/api';
import { mensajePublico } from '@/lib/mongo-config';

export const dynamic = 'force-dynamic';

// Primer uso: solo funciona mientras no exista ningún usuario.
export async function GET() {
  try {
    const db = await getDb();
    const n = await db.collection('usuarios').countDocuments({});
    return ok({ necesitaConfigurar: n === 0, memoria: usaMemoria });
  } catch (e) {
    // El mensaje ya viene traducido (causa + qué hacer) y sin datos de la cadena
    return error(503, `No se pudo conectar a la base de datos. ${mensajePublico(e)}`);
  }
}

export const POST = conErrores(async (req) => {
  const db = await getDb();
  if ((await db.collection('usuarios').countDocuments({})) > 0) {
    return error(409, 'La plataforma ya está configurada.');
  }
  const { claves = {}, datosPrueba } = await cuerpo(req);
  for (const u of USUARIOS_BASE) {
    const c = String(claves[u.usuario] || '');
    if (c.length < 6) return error(400, `La contraseña de ${u.corto} debe tener al menos 6 caracteres.`);
  }
  const docs = await Promise.all(USUARIOS_BASE.map(async (u) => ({
    _id: u.usuario,
    usuario: u.usuario,
    nombre: u.nombre,
    rol: u.rol,
    hash: await bcrypt.hash(String(claves[u.usuario]), 10),
    creado: new Date(),
  })));
  try {
    await db.collection('usuarios').insertMany(docs);
  } catch (e) {
    // Dos envíos casi al mismo tiempo: el segundo choca con el índice único
    if (e?.code === 11000) return error(409, 'La plataforma ya está configurada.');
    throw e;
  }
  let prueba = null;
  if (datosPrueba) prueba = await cargarDatosPrueba('angelica');
  return ok({ ok: true, prueba });
});
