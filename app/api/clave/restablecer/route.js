import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { conErrores, cuerpo, error, ipDe, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';
import { claveValida, codigoGerenciaValido } from '@/lib/usuarios';

export const dynamic = 'force-dynamic';

const MAX_CODIGOS_FALLIDOS_HORA = 5;

// Restablecer con el código de gerencia (CODIGO_GERENCIA). Es la salida cuando
// la que olvidó la contraseña es la gerente y no hay otra cuenta de gerencia
// que se la cambie. Comparte el límite de intentos con el registro de gerencia.
export const POST = conErrores(async (req) => {
  const entrada = await cuerpo(req);
  const usuario = texto(entrada?.usuario, 30).toLowerCase();
  if (!usuario) return error(400, 'Escribe el usuario.');
  if (!claveValida(entrada?.clave)) return error(400, 'La contraseña nueva debe tener entre 8 y 100 caracteres.');
  if ((process.env.CODIGO_GERENCIA || '').length < 8) {
    return error(403, 'El código de gerencia no está configurado. Pídele a gerencia que te cambie la contraseña.');
  }

  const ip = ipDe(req);
  const db = await getDb();
  const hace1h = new Date(Date.now() - 60 * 60 * 1000);
  const fallidos = await db.collection('auditoria').countDocuments({
    accion: { $in: ['registro_codigo_fallido', 'restablecer_codigo_fallido'] },
    'detalle.ip': ip,
    fecha: { $gte: hace1h },
  });
  if (fallidos >= MAX_CODIGOS_FALLIDOS_HORA) return error(429, 'Demasiados intentos con el código. Intenta más tarde.');
  if (!codigoGerenciaValido(entrada?.codigo)) {
    await auditar('restablecer_codigo_fallido', { usuario }, { ip });
    return error(403, 'El código de gerencia no es correcto.');
  }

  const r = await db.collection('usuarios').updateOne(
    { usuario },
    { $set: { hash: await bcrypt.hash(entrada.clave, 10), claveCambiada: new Date() } },
  );
  if (!r.matchedCount) return error(404, 'Ese usuario no existe.');
  await db.collection('solicitudes_clave').deleteMany({ usuario });
  await auditar('clave_restablecida', { usuario }, { ip });
  return ok({ ok: true });
});
