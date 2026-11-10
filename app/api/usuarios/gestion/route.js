import { getDb } from '@/lib/db';
import { conErrores, exigir, ok } from '@/lib/api';
import { usuarioPublico, ordenarUsuarios } from '@/lib/usuarios';

export const dynamic = 'force-dynamic';

// Solo gerencia: cuentas con fechas y las solicitudes de «Olvidé mi contraseña».
export const GET = conErrores(async () => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const db = await getDb();
  const [docs, solicitudes] = await Promise.all([
    db.collection('usuarios').find({}).toArray(),
    db.collection('solicitudes_clave').find({}).toArray(),
  ]);
  const pedida = Object.fromEntries(solicitudes.map((s) => [s.usuario, s.fecha]));
  return ok({
    yo: sesion.usuario,
    usuarios: ordenarUsuarios(docs).map((u) => ({
      ...usuarioPublico(u),
      creado: u.creado || null,
      ultimoIngreso: u.ultimoIngreso || null,
      solicitudClave: pedida[u.usuario] || null,
    })),
  });
});
