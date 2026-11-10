import { vistaMensual, claveMes } from '@/lib/materia';
import { conErrores, exigir, ok, texto } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Reporte mensual: ?mes=AAAA-MM&cliente=...
export const GET = conErrores(async (req) => {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const q = req.nextUrl.searchParams;
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(q.get('mes') || '') ? q.get('mes') : claveMes(new Date());
  return ok(await vistaMensual({ mes, cliente: texto(q.get('cliente'), 80) }));
});
