import { getDb } from '@/lib/db';
import { exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Últimos movimientos (ingresos, ediciones y borrados). Solo gerencia.
export async function GET(req) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const limite = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get('limite')) || 100));
  const db = await getDb();
  const registros = await db.collection('auditoria').find({}).sort({ fecha: -1 }).limit(limite).toArray();
  return ok({ registros });
}
