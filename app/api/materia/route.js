import { registrarMovimiento, borrarMovimiento } from '@/lib/materia';
import { conErrores, cuerpo, error, exigir, ok } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

// Registrar una entrada (llegada / compra) o un consumo de materia prima.
export const POST = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  try {
    const mov = await registrarMovimiento(await cuerpo(req), sesion);
    await auditar('materia_registrada', sesion, { id: mov._id, insumo: mov.insumo, tipo: mov.tipo, cantidad: mov.cantidad });
    return ok({ movimiento: mov }, { status: 201 });
  } catch (e) {
    if (e?.name === 'ErrorBD') throw e;
    return error(400, e.message);
  }
});

export const DELETE = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !(await borrarMovimiento(id))) return error(404, 'Ese registro no existe.');
  await auditar('materia_borrada', sesion, { id });
  return ok({ ok: true });
});
