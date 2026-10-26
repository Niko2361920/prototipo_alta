import { vistaProduccion } from '@/lib/datos';
import { error, exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { respuesta } = await exigir();
  if (respuesta) return respuesta;
  try {
    return ok(await vistaProduccion(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return error(500, e.message);
  }
}
