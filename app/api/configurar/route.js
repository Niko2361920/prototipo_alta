import bcrypt from 'bcryptjs';
import { getDb, usaMemoria } from '@/lib/db';
import { USUARIOS_BASE } from '@/lib/catalogo';
import { cargarDatosPrueba } from '@/lib/semilla';
import { cuerpo, error, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Primer uso: solo funciona mientras no exista ningún usuario.
export async function GET() {
  try {
    const db = await getDb();
    const n = await db.collection('usuarios').countDocuments({});
    return ok({ necesitaConfigurar: n === 0, memoria: usaMemoria });
  } catch (e) {
    return error(500, `No se pudo conectar a la base de datos: ${e.message}`);
  }
}

export async function POST(req) {
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
  await db.collection('usuarios').insertMany(docs);
  let prueba = null;
  if (datosPrueba) prueba = await cargarDatosPrueba('angelica');
  return ok({ ok: true, prueba });
}
