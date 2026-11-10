import { vistaInventario, guardarAjustes, corregirConsumo } from '@/lib/inventario';
import { conErrores, cuerpo, error, exigir, ok } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

// Inventario: existencias, si alcanza para la cola, envases por trabajo y consumos automáticos
export const GET = conErrores(async () => {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  return ok(await vistaInventario());
});

// Ajustes: mínimos, unidad de cada tinta y cuánto se gasta por pieza
export const PUT = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  try {
    const aj = await guardarAjustes(await cuerpo(req));
    await auditar('inventario_ajustes', sesion, {});
    return ok({ ajustes: aj });
  } catch (e) {
    if (e?.name === 'ErrorBD') throw e;
    return error(400, e.message);
  }
});

// Corregir el consumo automático de tinta de un trabajo con lo que se midió
export const POST = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const e = await cuerpo(req);
  try {
    const r = await corregirConsumo(e.id, e.cantidad, e.unidad);
    await auditar('consumo_corregido', sesion, { id: e.id, ...r });
    return ok(r);
  } catch (err) {
    if (err?.name === 'ErrorBD') throw err;
    return error(400, err.message);
  }
});
