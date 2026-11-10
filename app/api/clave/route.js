import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { conErrores, cuerpo, error, exigir, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';
import { claveValida } from '@/lib/usuarios';

export const dynamic = 'force-dynamic';

// Gerencia le pone una contraseña nueva a una cuenta (por ejemplo, cuando
// alguien de producción pidió «Olvidé mi contraseña»). La gerente se la dice
// en persona; no hay correo.
export const POST = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const entrada = await cuerpo(req);
  const usuario = texto(entrada?.usuario, 30).toLowerCase();
  if (!claveValida(entrada?.clave)) return error(400, 'La contraseña debe tener entre 8 y 100 caracteres.');

  const db = await getDb();
  const r = await db.collection('usuarios').updateOne(
    { usuario },
    { $set: { hash: await bcrypt.hash(entrada.clave, 10), claveCambiada: new Date() } },
  );
  if (!r.matchedCount) return error(404, 'Ese usuario no existe.');
  await db.collection('solicitudes_clave').deleteMany({ usuario });
  await auditar('clave_cambiada_por_gerencia', sesion, { usuario });
  return ok({ ok: true });
});
