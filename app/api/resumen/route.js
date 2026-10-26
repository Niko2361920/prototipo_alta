import { vistaResumen } from '@/lib/datos';
import { rangoPeriodo, desdeClave, sumarDias } from '@/lib/fechas';
import { MATERIALES } from '@/lib/catalogo';
import { exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const q = req.nextUrl.searchParams;
  let { desde, hasta } = rangoPeriodo(q.get('periodo') || '30d');
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.get('dia') || '')) { desde = desdeClave(q.get('dia')); hasta = sumarDias(desde, 1); }
  const material = MATERIALES.includes(q.get('material')) ? q.get('material') : '';
  const tecnica = ['serigrafia', 'tampografia'].includes(q.get('tecnica')) ? q.get('tecnica') : '';
  return ok({ ...(await vistaResumen({ desde, hasta, material, tecnica })), desde, hasta });
}
