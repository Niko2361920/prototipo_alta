import { analisisParecidos, limpiarTrabajo } from '@/lib/datos';
import { cuerpo, exigir, ok } from '@/lib/api';

// Vista previa mientras la gerente crea un trabajo: ¿qué falló en trabajos parecidos?
export async function POST(req) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const e = await cuerpo(req);
  const t = { _id: e._id || '__nuevo__', ...limpiarTrabajo(e) };
  return ok(await analisisParecidos(t));
}
