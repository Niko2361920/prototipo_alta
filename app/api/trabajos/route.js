import { crearTrabajo, listarTrabajos } from '@/lib/datos';
import { cuerpo, error, exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  return ok({ trabajos: await listarTrabajos() });
}

export async function POST(req) {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  try {
    const t = await crearTrabajo(await cuerpo(req), sesion);
    return ok({ trabajo: t }, { status: 201 });
  } catch (e) {
    return error(400, e.message);
  }
}
