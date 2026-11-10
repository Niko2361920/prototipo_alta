import { getDb } from '@/lib/db';
import { conErrores, cuerpo, error, ipDe, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

const MAX_POR_HORA = 10;

// «Olvidé mi contraseña» sin correo: deja una solicitud que gerencia ve en
// Gerencia → Usuarios. La respuesta es la misma exista o no el usuario, para
// no revelar qué cuentas hay.
export const POST = conErrores(async (req) => {
  const usuario = texto((await cuerpo(req))?.usuario, 30).toLowerCase();
  if (!usuario) return error(400, 'Escribe tu usuario.');
  const ip = ipDe(req);
  const db = await getDb();

  const hace1h = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await db.collection('auditoria').countDocuments({ accion: 'clave_solicitada', 'detalle.ip': ip, fecha: { $gte: hace1h } });
  if (recientes >= MAX_POR_HORA) return error(429, 'Demasiadas solicitudes desde esta conexión. Intenta más tarde.');

  await auditar('clave_solicitada', null, { usuario, ip });
  if (await db.collection('usuarios').findOne({ usuario })) {
    await db.collection('solicitudes_clave').updateOne(
      { _id: usuario },
      { $set: { usuario, fecha: new Date() } },
      { upsert: true },
    );
  }
  return ok({ ok: true });
});
