import { getDb } from '@/lib/db';
import { conErrores, cuerpo, entero, error, exigir, ok, texto } from '@/lib/api';
import { auditar } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

// Historial de reportes diarios guardados en la base de datos. Solo gerencia.
export const GET = conErrores(async (req) => {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const limite = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limite')) || 30));
  const db = await getDb();
  const reportes = await db.collection('reportes').find({}).sort({ dia: -1 }).limit(limite).toArray();
  return ok({ reportes });
});

// Guarda (o reemplaza) el reporte de un día. Un solo reporte por día.
export const POST = conErrores(async (req) => {
  const { sesion, respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const b = await cuerpo(req);
  const dia = texto(b.dia, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return error(400, 'Día no válido.');
  const cifra = (v) => entero(v, 0, 10_000_000);
  const doc = {
    _id: dia,
    dia,
    buenas: cifra(b.buenas),
    defectos: cifra(b.defectos),
    pctDefectos: Math.min(1, Math.max(0, Number(b.pctDefectos) || 0)),
    reprocesos: cifra(b.reprocesos),
    descartes: cifra(b.descartes),
    causas: (Array.isArray(b.causas) ? b.causas : []).slice(0, 10).map((c) => ({
      nombre: texto(c?.nombre, 120),
      cantidad: cifra(c?.cantidad),
      pct: Math.min(1, Math.max(0, Number(c?.pct) || 0)),
    })),
    trabajos: {
      terminados: cifra(b.trabajos?.terminados),
      enProceso: cifra(b.trabajos?.enProceso),
      enCola: cifra(b.trabajos?.enCola),
    },
    texto: texto(b.texto, 3000),
    datosPrueba: !!b.datosPrueba,
    guardadoPor: sesion.usuario,
    guardadoEn: new Date(),
  };
  const db = await getDb();
  const col = db.collection('reportes');
  const existia = !!(await col.findOne({ _id: dia }));
  await col.deleteOne({ _id: dia });
  await col.insertOne(doc);
  await auditar('reporte_guardado', sesion, { dia, reemplazo: existia });
  return ok({ reporte: doc, reemplazo: existia });
});
