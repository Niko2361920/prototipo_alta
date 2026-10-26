import { COOKIE } from '@/lib/sesion';
import { ok } from '@/lib/api';

export async function POST() {
  const res = ok({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
