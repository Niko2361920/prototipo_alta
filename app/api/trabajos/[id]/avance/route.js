import { registrarAvance } from '@/lib/datos';
import { cuerpo, error, exigir, ok } from '@/lib/api';

export async function POST(req, { params }) {
  const { sesion, respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const { cantidad, operario } = await cuerpo(req);
  try {
    const t = await registrarAvance(id, cantidad, sesion, operario);
    return ok({ trabajo: t });
  } catch (e) {
    return error(400, e.message);
  }
}
