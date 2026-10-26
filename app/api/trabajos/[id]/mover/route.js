import { moverEnCola } from '@/lib/datos';
import { cuerpo, exigir, ok } from '@/lib/api';

export async function POST(req, { params }) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const { id } = await params;
  const { direccion } = await cuerpo(req);
  await moverEnCola(id, direccion === 'arriba' ? 'arriba' : 'abajo');
  return ok({ ok: true });
}
