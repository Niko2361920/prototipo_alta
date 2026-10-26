// Cálculos de la plataforma: Pareto, resumen por categoría 6M, tendencia y
// "trabajos parecidos" (para que producción vea los errores anteriores).
import { CATEGORIAS, CAUSAS, causaPorId } from './catalogo';
import { claveDia, sumarDias } from './fechas';

const suma = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

export function pareto(defectos) {
  const porCausa = new Map();
  for (const d of defectos) porCausa.set(d.causa, (porCausa.get(d.causa) || 0) + (d.cantidad || 1));
  const total = suma([...porCausa.values()], (x) => x);
  let acumulado = 0;
  return [...porCausa.entries()]
    .sort((a, b) => b[1] - a[1] || (causaPorId[a[0]]?.nombre || '').localeCompare(causaPorId[b[0]]?.nombre || ''))
    .map(([causa, cantidad], i) => {
      acumulado += cantidad;
      const c = causaPorId[causa];
      return {
        pos: i + 1,
        causa,
        nombre: c?.nombre || causa,
        corto: c?.corto || c?.nombre || causa,
        categoria: c?.categoria || 'otra',
        cantidad,
        pct: total ? cantidad / total : 0,
        acumulado: total ? acumulado / total : 0,
      };
    });
}

export function porCategoria(defectos) {
  const total = suma(defectos, (d) => d.cantidad || 1);
  return CATEGORIAS.map((c) => {
    const cantidad = suma(defectos.filter((d) => d.categoria === c.id), (d) => d.cantidad || 1);
    return { ...c, cantidad, pct: total ? cantidad / total : 0 };
  }).sort((a, b) => b.cantidad - a.cantidad);
}

export function tendencia(defectos, avances, desde, hasta) {
  const dias = [];
  for (let t = desde; t < hasta; t = sumarDias(t, 1)) dias.push(claveDia(t));
  const mapa = Object.fromEntries(dias.map((d) => [d, { dia: d, defectos: 0, buenas: 0 }]));
  for (const d of defectos) {
    const k = claveDia(d.fecha);
    if (mapa[k]) mapa[k].defectos += d.cantidad || 1;
  }
  for (const a of avances) {
    const k = claveDia(a.fecha);
    if (mapa[k]) mapa[k].buenas += a.cantidad || 0;
  }
  return dias.map((d) => {
    const x = mapa[d];
    const producidas = x.buenas + x.defectos;
    return { ...x, pct: producidas ? x.defectos / producidas : null };
  });
}

export function indicadores(defectos, avances) {
  const totalDefectos = suma(defectos, (d) => d.cantidad || 1);
  const buenas = suma(avances, (a) => a.cantidad || 0);
  const producidas = buenas + totalDefectos;
  const reprocesos = suma(defectos.filter((d) => d.accion !== 'descarte'), (d) => d.cantidad || 1);
  const descartes = totalDefectos - reprocesos;
  return {
    totalDefectos,
    buenas,
    producidas,
    pctDefectos: producidas ? totalDefectos / producidas : null,
    reprocesos,
    descartes,
    registros: defectos.length,
  };
}

// ---------- Trabajos parecidos ----------
const norm = (s) => (s || '').toString().trim().toLowerCase();

export function parecido(a, b) {
  const razones = [];
  let puntos = 0;
  if (norm(a.material) && norm(a.material) === norm(b.material)) { puntos += 3; razones.push(`Mismo material: ${b.material}`); }
  if (norm(a.tintaTipo) && norm(a.tintaTipo) === norm(b.tintaTipo)) {
    puntos += 2;
    const mismoColor = norm(a.tintaColor) && norm(a.tintaColor) === norm(b.tintaColor);
    if (mismoColor) puntos += 1;
    razones.push(`Misma tinta: ${b.tintaTipo}${mismoColor ? ` ${b.tintaColor}` : ''}`);
  }
  if (a.relieve && b.relieve) { puntos += 2; razones.push('Envase con relieve'); }
  if (a.tecnica && a.tecnica === b.tecnica) { puntos += 1; razones.push('Misma técnica'); }
  if (norm(a.forma) && norm(a.forma) === norm(b.forma)) { puntos += 1; razones.push(`Forma ${b.forma.toLowerCase()}`); }
  if (norm(a.cliente) && norm(a.cliente) === norm(b.cliente)) { puntos += 1; razones.push('Mismo cliente'); }
  return { puntos, razones };
}

// trabajo: el nuevo; otros: trabajos anteriores; defectos: defectos de esos trabajos
export function trabajosParecidos(trabajo, otros, defectos, { minimo = 3, max = 4 } = {}) {
  const defPorTrabajo = new Map();
  for (const d of defectos) {
    if (!defPorTrabajo.has(d.trabajoId)) defPorTrabajo.set(d.trabajoId, []);
    defPorTrabajo.get(d.trabajoId).push(d);
  }
  const candidatos = otros
    .filter((o) => o._id !== trabajo._id)
    .map((o) => ({ trabajo: o, ...parecido(trabajo, o), defectos: defPorTrabajo.get(o._id) || [] }))
    .filter((c) => c.puntos >= minimo && c.defectos.length)
    .sort((a, b) => b.puntos - a.puntos || suma(b.defectos, (d) => d.cantidad) - suma(a.defectos, (d) => d.cantidad));

  const defs = candidatos.flatMap((c) => c.defectos);
  // Lo que falló en los trabajos MÁS parecidos pesa más al ordenar las alertas
  const maxPuntos = Math.max(1, ...candidatos.map((c) => c.puntos));
  const peso = new Map();
  for (const c of candidatos) {
    for (const d of c.defectos) peso.set(d.causa, (peso.get(d.causa) || 0) + (d.cantidad || 1) * (c.puntos / maxPuntos) ** 2);
  }
  const causas = pareto(defs)
    .sort((a, b) => (peso.get(b.causa) || 0) - (peso.get(a.causa) || 0))
    .slice(0, 4)
    .map((p) => ({
      ...p,
      consejo: causaPorId[p.causa]?.consejo || '',
      trabajos: candidatos.filter((c) => c.defectos.some((d) => d.causa === p.causa)).length,
    }));

  return {
    totalParecidos: candidatos.length,
    totalDefectos: suma(defs, (d) => d.cantidad || 1),
    causas,
    parecidos: candidatos.slice(0, max).map((c) => {
      const totalDef = suma(c.defectos, (d) => d.cantidad || 1);
      const producidas = (c.trabajo.buenas || 0) + totalDef;
      return {
        _id: c.trabajo._id,
        codigo: c.trabajo.codigo,
        cliente: c.trabajo.cliente,
        producto: c.trabajo.producto,
        fecha: c.trabajo.terminado || c.trabajo.creado,
        razones: c.razones,
        puntos: c.puntos,
        defectos: totalDef,
        pct: producidas ? totalDef / producidas : null,
        causaPrincipal: pareto(c.defectos)[0]?.corto || null,
      };
    }),
  };
}

export const NOMBRES_CAUSAS = Object.fromEntries(CAUSAS.map((c) => [c.id, c.nombre]));
