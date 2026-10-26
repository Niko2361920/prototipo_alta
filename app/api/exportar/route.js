import { listarDefectos } from '@/lib/datos';
import { rangoPeriodo, claveDia } from '@/lib/fechas';
import { causaPorId, categoriaPorId, nombreUsuario, tecnicaPorId } from '@/lib/catalogo';
import { exigir } from '@/lib/api';

export const dynamic = 'force-dynamic';

const celda = (v) => {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV con punto y coma (lo abre Excel en español sin pasos extra)
export async function GET(req) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const { desde, hasta, periodo } = rangoPeriodo(req.nextUrl.searchParams.get('periodo') || 'todo');
  const defectos = await listarDefectos({ desde, hasta, limite: 100000 });
  const encabezado = ['Fecha', 'Hora', 'Trabajo', 'Cliente', 'Envase', 'Material', 'Técnica', 'Tinta', 'Categoría 6M', 'Causa', 'Tipo de defecto', 'Cantidad', 'Acción', 'Operario', 'Nota', 'Datos de prueba'];
  const filas = defectos.map((d) => {
    const f = new Date(d.fecha);
    const hora = new Date(f.getTime() - 5 * 3600e3).toISOString().slice(11, 16);
    return [
      claveDia(f), hora, d.codigo, d.cliente, d.producto, d.material, tecnicaPorId[d.tecnica]?.nombre || d.tecnica,
      `${d.tintaTipo || ''} ${d.tintaColor || ''}`.trim(), categoriaPorId[d.categoria]?.nombre || d.categoria,
      causaPorId[d.causa]?.nombre || d.causa, d.tipoDefecto, d.cantidad, d.accion === 'descarte' ? 'Descarte' : 'Reproceso',
      nombreUsuario(d.operario), d.nota, d.prueba ? 'Sí' : 'No',
    ].map(celda).join(';');
  });
  const csv = '﻿' + [encabezado.join(';'), ...filas].join('\r\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="defectos-two-glass-${periodo.id}-${claveDia(new Date())}.csv"`,
    },
  });
}
