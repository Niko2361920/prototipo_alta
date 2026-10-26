import { sesionActual, ok, error } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await sesionActual();
  if (!s) return error(401, 'Sin sesión');
  return ok(s);
}
