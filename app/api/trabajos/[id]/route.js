import { actualizarTrabajo, borrarTrabajo, limpiarTrabajo, obtenerTrabajo, analisisParecidos } from '@/lib/datos';
import { cuerpo, error, exigir, ok } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const t = await obtenerTrabajo(id);
  if (!t) return error(404, 'Trabajo no encontrado.');
  return ok({ trabajo: t, parecidos: await analisisParecidos(t) });
}

export async function PATCH(req, { params }) {
  const { sesion, respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const e = await cuerpo(req);
  let cambios;
  if (sesion.rol === 'gerente') {
    cambios = limpiarTrabajo(e, true);
  } else {
    // Producción solo cambia el estado del trabajo y si la prueba quedó aprobada
    cambios = {};
    if (['en_proceso', 'pausado', 'terminado'].includes(e.estado)) cambios.estado = e.estado;
    if (e.pruebaAprobada !== undefined) cambios.pruebaAprobada = Boolean(e.pruebaAprobada);
  }
  if (!Object.keys(cambios).length) return error(400, 'No hay cambios.');
  const t = await actualizarTrabajo(id, cambios);
  if (!t) return error(404, 'Trabajo no encontrado.');
  await auditar('trabajo_editado', sesion, { id, codigo: t.codigo, cambios });
  return ok({ trabajo: t });
}

export async function DELETE(_req, { params }) {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const { id } = await params;
  const antes = await obtenerTrabajo(id);
  await borrarTrabajo(id);
  await auditar('trabajo_borrado', sesion, { id, codigo: antes?.codigo, cliente: antes?.cliente, producto: antes?.producto, defectos: antes?.defectos });
  return ok({ ok: true });
}
