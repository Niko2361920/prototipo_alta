import { getDb } from '@/lib/db';
import { borrarDefecto, editarDefecto } from '@/lib/datos';
import { cuerpo, error, exigir, ok } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

// Producción puede corregir o deshacer un registro durante 15 minutos; gerencia, siempre.
async function permitido(sesion, id) {
  const db = await getDb();
  const d = await db.collection('defectos').findOne({ _id: id });
  if (!d) return { err: error(404, 'Registro no encontrado.') };
  if (sesion.rol !== 'gerente' && Date.now() - new Date(d.fecha).getTime() > 15 * 60e3) {
    return { err: error(403, 'Ya pasaron 15 minutos: pídele a gerencia que lo corrija.') };
  }
  return { d };
}

export async function PATCH(req, { params }) {
  const { sesion, respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const { err, d } = await permitido(sesion, id);
  if (err) return err;
  const cambios = await cuerpo(req);
  const defecto = await editarDefecto(id, cambios);
  await auditar('defecto_editado', sesion, { id, antes: { cantidad: d.cantidad, accion: d.accion, tipoDefecto: d.tipoDefecto, nota: d.nota }, cambios });
  return ok({ defecto });
}

export async function DELETE(_req, { params }) {
  const { sesion, respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const { err, d } = await permitido(sesion, id);
  if (err) return err;
  await borrarDefecto(id);
  await auditar('defecto_borrado', sesion, { id, registro: d });
  return ok({ ok: true });
}
