import { listarDefectos, registrarDefecto } from '@/lib/datos';
import { rangoPeriodo, desdeClave, sumarDias } from '@/lib/fechas';
import { cuerpo, error, exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const q = req.nextUrl.searchParams;
  let { desde, hasta } = rangoPeriodo(q.get('periodo') || '30d');
  if (q.get('dia')) { desde = desdeClave(q.get('dia')); hasta = sumarDias(desde, 1); }
  const defectos = await listarDefectos({ desde, hasta, categoria: q.get('categoria'), trabajoId: q.get('trabajo') });
  return ok({ defectos });
}

export async function POST(req) {
  const { sesion, respuesta } = await exigir();
  if (respuesta) return respuesta;
  try {
    const d = await registrarDefecto(await cuerpo(req), sesion);
    return ok({ defecto: d }, { status: 201 });
  } catch (e) {
    return error(400, e.message);
  }
}
