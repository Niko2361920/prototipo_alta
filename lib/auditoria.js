// Registro de auditoría: quién entró y quién editó o borró datos.
// Nunca debe romper la operación principal: si falla, se ignora.
import 'server-only';
import { getDb, nuevoId } from './db';

export async function auditar(accion, sesion, detalle = {}) {
  try {
    const db = await getDb();
    await db.collection('auditoria').insertOne({
      _id: nuevoId(),
      fecha: new Date(),
      accion,
      usuario: sesion?.usuario || detalle.usuario || '',
      rol: sesion?.rol || '',
      detalle,
    });
  } catch {
    /* sin auditoría no se detiene el trabajo */
  }
}
