// Diagnóstico de la conexión: abrir https://TU-PROYECTO.vercel.app/api/salud
//
// Por qué existe: en Vercel no se ve por qué falla la base de datos sin entrar a
// los logs. Esta ruta revisa paso a paso (variables, conexión, escritura) y dice
// la causa probable y qué hacer.
//
// Es pública a propósito: se necesita antes de que exista cualquier usuario.
// Por eso no muestra la cadena, el usuario, el host ni cuántos usuarios hay;
// solo sí/no y el mensaje traducido.
import { getDb, nombreDb, origenUri, usaMemoria } from '@/lib/db';
import { mensajePublico } from '@/lib/mongo-config';
import { ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enVercel = Boolean(process.env.VERCEL);
  const pasos = [];

  pasos.push({
    paso: 'Variable MONGODB_URI',
    ok: !usaMemoria || !enVercel,
    detalle: usaMemoria
      ? (enVercel ? 'No está configurada en este despliegue.' : 'Modo memoria (solo para pruebas locales).')
      : `Configurada (${origenUri}).`,
  });
  pasos.push({ paso: 'Nombre de la base (MONGODB_DB)', ok: true, detalle: nombreDb });

  const s = process.env.SESSION_SECRET || '';
  pasos.push({
    paso: 'SESSION_SECRET',
    ok: s.length >= 32 || !enVercel,
    detalle: s.length >= 32 ? 'Configurada.' : (enVercel ? 'Falta o tiene menos de 32 caracteres.' : 'Sin configurar (en local se usa una clave de prueba).'),
  });

  const t0 = Date.now();
  try {
    const db = await getDb();
    pasos.push({ paso: 'Conexión a la base', ok: true, detalle: `${Date.now() - t0} ms` });
    // Escribir un documento fijo prueba permisos y el error de mayúsculas,
    // que solo aparece al crear algo en la base.
    await db.collection('contadores').updateOne({ _id: 'salud' }, { $set: { fecha: new Date() } }, { upsert: true });
    pasos.push({ paso: 'Escritura', ok: true, detalle: 'Se pudo guardar.' });
    const hayUsuarios = (await db.collection('usuarios').countDocuments({}, { limit: 1 })) > 0;
    pasos.push({
      paso: 'Usuarios',
      ok: true,
      detalle: hayUsuarios ? 'Ya hay usuarios creados.' : 'Aún no hay usuarios: entra a /configurar.',
    });
  } catch (e) {
    console.error('[salud] fallo:', e);
    pasos.push({ paso: 'Conexión a la base', ok: false, detalle: mensajePublico(e) });
  }

  const todoBien = pasos.every((p) => p.ok);
  return ok(
    { ok: todoBien, entorno: process.env.VERCEL_ENV || 'local', pasos },
    { status: todoBien ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
