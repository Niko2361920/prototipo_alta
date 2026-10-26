import { cargarDatosPrueba, borrarDatosPrueba } from '@/lib/semilla';
import { exigir, ok } from '@/lib/api';

export async function POST() {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  return ok(await cargarDatosPrueba(sesion.usuario));
}

export async function DELETE() {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  return ok(await borrarDatosPrueba());
}
