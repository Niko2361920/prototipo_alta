import { getDb } from '@/lib/db';
import { conErrores, cuerpo, error, exigir, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';
import { usuarioPublico, ordenarUsuarios } from '@/lib/usuarios';

export const dynamic = 'force-dynamic';

// Lista pública para las tarjetas «¿Quién eres?» de la pantalla de ingreso y para
// el selector de operario de Producción. Solo nombre, usuario y rol: nada de la
// clave ni de las fechas de ingreso.
export const GET = conErrores(async () => {
  const db = await getDb();
  const docs = await db.collection('usuarios').find({}).toArray();
  return ok({ usuarios: ordenarUsuarios(docs).map(usuarioPublico) });
});

// Gerencia elimina una cuenta. No se puede borrar la propia ni la última de gerencia.
// Los defectos y avances que registró esa persona se conservan.
export const DELETE = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const usuario = texto((await cuerpo(req))?.usuario, 30).toLowerCase();
  if (!usuario) return error(400, 'Falta el usuario.');
  if (usuario === sesion.usuario) return error(400, 'No puedes eliminar tu propia cuenta.');

  const db = await getDb();
  const doc = await db.collection('usuarios').findOne({ usuario });
  if (!doc) return error(404, 'Ese usuario no existe.');
  if (doc.rol === 'gerente' && (await db.collection('usuarios').countDocuments({ rol: 'gerente' })) <= 1) {
    return error(400, 'Debe quedar al menos una cuenta de gerencia.');
  }
  await db.collection('usuarios').deleteOne({ usuario });
  await db.collection('solicitudes_clave').deleteMany({ usuario });
  await auditar('usuario_eliminado', sesion, { usuario, rol: doc.rol });
  return ok({ ok: true });
});
