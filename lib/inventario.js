// Inventario: qué hay de cada material (tinta por tipo y color), si alcanza para
// los trabajos en cola, cuánto dura, y el consumo automático al terminar un trabajo.
//
// Todo sale de la colección `materia` (entradas − consumos), así que el
// inventario nunca se desincroniza de los registros. Los ajustes (mínimos,
// unidad de cada tinta, cuánto se gasta por pieza) viven en `config`.
import 'server-only';
import { getDb, nuevoId } from './db';
import { INSUMOS, insumoPorId, TINTA_DE_TIPO } from './catalogo';

// ---------- Unidades ----------
export const UNIDADES = {
  kg: { familia: 'peso', factor: 1, chica: 'g' },
  g: { familia: 'peso', factor: 0.001 },
  L: { familia: 'volumen', factor: 1, chica: 'ml' },
  ml: { familia: 'volumen', factor: 0.001 },
  'unid.': { familia: 'unidad', factor: 1 },
};
// Unidades que se pueden escribir al registrar, según la unidad base del material
export const unidadesDe = (base) => Object.keys(UNIDADES).filter((u) => UNIDADES[u].familia === UNIDADES[base].familia);
export function convertir(cantidad, de, a) {
  const u1 = UNIDADES[de];
  const u2 = UNIDADES[a];
  if (!u1 || !u2 || u1.familia !== u2.familia) throw new Error(`No se puede pasar de ${de} a ${a}.`);
  return (cantidad * u1.factor) / u2.factor;
}
export const red = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// Color de tinta escrito siempre igual («dorado », «DORADO» → «Dorado»)
export function normColor(c) {
  const s = String(c || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}
export const SIN_COLOR = 'Sin color';
export const claveDe = (insumo, color) => (insumoPorId[insumo]?.grupo === 'tinta' ? `${insumo}|${normColor(color) || SIN_COLOR}` : insumo);

// ---------- Ajustes ----------
// Supuestos del equipo hasta tener los datos reales de Two Glass. Se cambian en
// Gerencia → Inventario → Ajustes, y la tinta se recalibra sola con «Corregir».
export const AJUSTES_BASE = {
  unidades: {}, // { tinta_uv: 'L' } si esa tinta se mide en litros
  minimos: {}, // { 'tinta_uv|Blanco': 0.5, planchas: 4 }
  porPieza: { tinta_uv: 1.5, tinta_solvente: 1.5, tinta_catalizada: 1.5, tinta_agua: 1.5 }, // g o ml por color y pieza
  catalizadorPct: 10, // % del peso de la tinta catalizada
  primeMlPorPieza: 2,
  diluyenteLPorTrabajo: 0.3,
};

export async function leerAjustes() {
  const db = await getDb();
  const doc = (await db.collection('config').findOne({ _id: 'inventario' })) || {};
  return {
    ...AJUSTES_BASE,
    ...doc,
    unidades: { ...AJUSTES_BASE.unidades, ...(doc.unidades || {}) },
    minimos: { ...(doc.minimos || {}) },
    porPieza: { ...AJUSTES_BASE.porPieza, ...(doc.porPieza || {}) },
  };
}

export const unidadBase = (aj, insumo) => aj.unidades[insumo] || insumoPorId[insumo]?.unidad || 'unid.';
export const mapaUnidades = (aj) => Object.fromEntries(INSUMOS.map((i) => [i.id, unidadBase(aj, i.id)]));

const num = (v, min, max) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

export async function guardarAjustes(e) {
  const db = await getDb();
  const actual = await leerAjustes();
  const nuevo = { ...actual };

  if (e.unidades && typeof e.unidades === 'object') {
    for (const [id, u] of Object.entries(e.unidades)) {
      const ins = insumoPorId[id];
      if (!ins || ins.grupo !== 'tinta' || !['kg', 'L'].includes(u) || unidadBase(actual, id) === u) continue;
      // Cambiar de kg a L con registros guardados mezclaría unidades: no se permite
      if (await db.collection('materia').countDocuments({ insumo: id })) {
        throw new Error(`${ins.nombre} ya tiene registros en ${unidadBase(actual, id)}. Para cambiar la unidad hay que borrarlos primero.`);
      }
      nuevo.unidades = { ...nuevo.unidades, [id]: u };
    }
  }
  if (e.minimos && typeof e.minimos === 'object') {
    const m = { ...actual.minimos };
    for (const [k, v] of Object.entries(e.minimos)) {
      const [ins] = k.split('|');
      if (!insumoPorId[ins] || insumoPorId[ins].grupo === 'envases') continue;
      const n = v === '' || v == null ? null : num(v, 0, 1_000_000);
      if (n == null || n === 0) delete m[k]; else m[k] = red(n);
    }
    nuevo.minimos = m;
  }
  if (e.porPieza && typeof e.porPieza === 'object') {
    for (const [id, v] of Object.entries(e.porPieza)) {
      const n = num(v, 0.01, 1000);
      if (insumoPorId[id]?.grupo === 'tinta' && n != null) nuevo.porPieza = { ...nuevo.porPieza, [id]: red(n, 2) };
    }
  }
  for (const [k, min, max] of [['catalizadorPct', 0, 100], ['primeMlPorPieza', 0, 1000], ['diluyenteLPorTrabajo', 0, 100]]) {
    if (e[k] !== undefined) { const n = num(e[k], min, max); if (n != null) nuevo[k] = red(n, 2); }
  }
  const { _id, ...guardar } = nuevo;
  await db.collection('config').updateOne({ _id: 'inventario' }, { $set: guardar }, { upsert: true });
  return leerAjustes();
}

// ---------- Lo que necesita un trabajo ----------
// piezas: cuántas se van a estampar (o se estamparon). Devuelve [{insumo, color, cantidad, unidad}]
export function necesidades(t, piezas, aj, { conPlanchas = true, conDiluyente = true } = {}) {
  const out = [];
  const colores = Math.max(1, t.colores || 1);
  const tinta = TINTA_DE_TIPO[t.tintaTipo];
  if (tinta && piezas > 0) {
    const uT = unidadBase(aj, tinta);
    const chica = UNIDADES[uT].chica || uT;
    const cant = convertir(piezas * colores * (aj.porPieza[tinta] ?? 1.5), chica, uT);
    out.push({ insumo: tinta, color: normColor(t.tintaColor) || SIN_COLOR, cantidad: red(cant), unidad: uT, detalle: `${piezas} piezas × ${colores} ${colores === 1 ? 'color' : 'colores'} × ${String(aj.porPieza[tinta] ?? 1.5).replace('.', ',')} ${chica}` });
    if (tinta === 'tinta_catalizada' && aj.catalizadorPct > 0) {
      const kg = UNIDADES[uT].familia === 'peso' ? convertir(cant, uT, 'kg') : cant; // si la tinta va en L, se toma 1 L ≈ 1 kg
      out.push({ insumo: 'catalizador', cantidad: red((kg * aj.catalizadorPct) / 100), unidad: 'kg', detalle: `${String(aj.catalizadorPct).replace('.', ',')} % de la tinta` });
    }
  }
  if (t.material === 'Plástico PET' && piezas > 0 && aj.primeMlPorPieza > 0) {
    out.push({ insumo: 'prime', cantidad: red((piezas * aj.primeMlPorPieza) / 1000), unidad: 'L', detalle: `${piezas} piezas × ${String(aj.primeMlPorPieza).replace('.', ',')} ml` });
  }
  if (conPlanchas) out.push({ insumo: 'planchas', cantidad: colores, unidad: 'unid.', detalle: 'una por color' });
  if (conDiluyente && aj.diluyenteLPorTrabajo > 0) out.push({ insumo: 'diluyente', cantidad: aj.diluyenteLPorTrabajo, unidad: 'L', detalle: 'limpieza del trabajo' });
  return out.filter((x) => x.cantidad > 0);
}

// ---------- Consumo automático ----------
// Se llama cuando un trabajo pasa a «terminado». Piezas estampadas = buenas + defectos
// (las reprocesadas se estamparon dos veces: la mala y la buena).
export async function registrarConsumoAuto(trabajo) {
  const db = await getDb();
  if (await db.collection('materia').countDocuments({ trabajoId: trabajo._id, auto: true })) return [];
  const defs = await db.collection('defectos').find({ trabajoId: trabajo._id }, { projection: { cantidad: 1 } }).toArray();
  const piezas = (trabajo.buenas || 0) + defs.reduce((s, d) => s + (d.cantidad || 0), 0);
  const aj = await leerAjustes();
  const ahora = new Date();
  const movs = necesidades(trabajo, piezas, aj).map((n, i) => ({
    _id: nuevoId() + 'c' + i,
    fecha: ahora,
    tipo: 'consumo',
    insumo: n.insumo,
    color: n.color || '',
    unidad: n.unidad,
    cantidad: n.cantidad,
    trabajoId: trabajo._id,
    codigo: trabajo.codigo,
    cliente: trabajo.cliente,
    nota: `Automático al terminar: ${n.detalle}`,
    auto: true,
    piezas,
    colores: Math.max(1, trabajo.colores || 1),
    registradoPor: 'automatico',
    creado: ahora,
    prueba: Boolean(trabajo.prueba),
  }));
  if (movs.length) await db.collection('materia').insertMany(movs);
  return movs;
}

// Si el trabajo se reabre, se quita su consumo automático (se vuelve a calcular al terminar)
export async function quitarConsumoAuto(trabajoId) {
  const db = await getDb();
  await db.collection('materia').deleteMany({ trabajoId, auto: true });
}

// «Corregir»: el consumo real de tinta de un trabajo (pesando el tarro antes y después).
// Reemplaza el automático y ajusta los g por pieza de esa tinta (promedio entre lo
// que había y lo medido), para que los siguientes cálculos se acerquen más.
export async function corregirConsumo(movId, cantidad, unidad) {
  const db = await getDb();
  const m = await db.collection('materia').findOne({ _id: String(movId) });
  if (!m || !m.auto || insumoPorId[m.insumo]?.grupo !== 'tinta') throw new Error('Solo se corrige el consumo automático de tinta.');
  const real = red(convertir(Number(String(cantidad).replace(',', '.')), unidad || m.unidad, m.unidad));
  if (!Number.isFinite(real) || real <= 0 || real > 100000) throw new Error('Escribe cuánto se gastó.');
  await db.collection('materia').updateOne({ _id: m._id }, { $set: { cantidad: real, corregido: true, antes: m.cantidad, nota: `Medido: antes se calculaban ${m.cantidad} ${m.unidad}` } });

  const aj = await leerAjustes();
  let nuevaTasa = null;
  if (m.piezas > 0) {
    const chica = UNIDADES[m.unidad].chica || m.unidad;
    const medida = convertir(real, m.unidad, chica) / (m.piezas * (m.colores || 1));
    nuevaTasa = red(((aj.porPieza[m.insumo] ?? 1.5) + medida) / 2, 2);
    await db.collection('config').updateOne({ _id: 'inventario' }, { $set: { [`porPieza.${m.insumo}`]: nuevaTasa } }, { upsert: true });
  }
  return { real, nuevaTasa, unidad: m.unidad };
}

// ---------- Vista de inventario ----------
const nombreClave = (k) => {
  const [ins, color] = k.split('|');
  return color ? `${insumoPorId[ins].nombre} · ${color}` : insumoPorId[ins].nombre;
};

export async function vistaInventario() {
  const db = await getDb();
  const aj = await leerAjustes();
  const [movs, activos, hayPrueba] = await Promise.all([
    db.collection('materia').find({}).toArray(),
    db.collection('trabajos').find({ estado: { $in: ['en_proceso', 'pausado', 'pendiente'] } }, { projection: { notas: 0 } }).toArray(),
    db.collection('trabajos').countDocuments({ prueba: true }),
  ]);
  const idsActivos = activos.map((t) => t._id);
  const defectos = idsActivos.length
    ? await db.collection('defectos').find({ trabajoId: { $in: idsActivos } }, { projection: { trabajoId: 1, cantidad: 1, accion: 1 } }).toArray()
    : [];

  // Existencias por clave (tinta por tipo y color)
  const stock = {};
  const consumo30 = {};
  const hace30 = Date.now() - 30 * 86400000;
  for (const m of movs) {
    if (insumoPorId[m.insumo]?.grupo === 'envases') continue;
    const k = claveDe(m.insumo, m.color);
    const signo = m.tipo === 'entrada' ? 1 : -1;
    stock[k] = (stock[k] || 0) + signo * m.cantidad;
    if (m.tipo === 'consumo' && new Date(m.fecha).getTime() >= hace30) consumo30[k] = (consumo30[k] || 0) + m.cantidad;
  }

  // Cola en orden: lo que está en producción, pausado y después la cola
  const peso = { en_proceso: 0, pausado: 1, pendiente: 2 };
  const cola = [...activos].sort((a, b) => peso[a.estado] - peso[b.estado] || (a.orden || 0) - (b.orden || 0));
  const defDe = (id) => defectos.filter((d) => d.trabajoId === id);
  const disponible = { ...stock };
  const necesitaCola = {};
  const trabajos = cola.map((t) => {
    const merma = (t.mermaMax ?? 5) / 100;
    const restantes = Math.max(0, (t.unidades || 0) - (t.buenas || 0));
    const piezas = Math.ceil(restantes * (1 + merma));
    const nec = necesidades(t, piezas, aj, { conPlanchas: t.estado === 'pendiente' });
    const faltantes = [];
    for (const n of nec) {
      const k = claveDe(n.insumo, n.color);
      necesitaCola[k] = (necesitaCola[k] || 0) + n.cantidad;
      const hay = disponible[k] || 0;
      if (hay + 1e-9 < n.cantidad) faltantes.push({ clave: k, nombre: nombreClave(k), falta: red(n.cantidad - Math.max(0, hay)), unidad: n.unidad });
      disponible[k] = hay - n.cantidad;
    }
    // Envases del cliente para este trabajo
    const recibidos = movs.filter((m) => m.insumo === 'envases' && m.trabajoId === t._id && m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0);
    const necesarios = Math.ceil((t.unidades || 0) * (1 + merma));
    const descartes = defDe(t._id).filter((d) => d.accion === 'descarte').reduce((s, d) => s + d.cantidad, 0);
    return {
      _id: t._id, codigo: t.codigo, cliente: t.cliente, producto: t.producto, estado: t.estado, unidades: t.unidades,
      buenas: t.buenas || 0, colores: t.colores, tintaTipo: t.tintaTipo, tintaColor: t.tintaColor, mermaMax: t.mermaMax ?? 5,
      piezas, necesidades: nec.map((n) => ({ ...n, nombre: nombreClave(claveDe(n.insumo, n.color)) })),
      faltantes,
      envases: { recibidos, necesarios, usados: (t.buenas || 0) + descartes, falta: Math.max(0, necesarios - recibidos) },
    };
  });

  // Filas del inventario: todo lo que tiene registros, mínimo o lo pide la cola
  const claves = new Set([...Object.keys(stock), ...Object.keys(aj.minimos), ...Object.keys(necesitaCola)]);
  for (const i of INSUMOS) if (i.grupo !== 'tinta' && i.grupo !== 'envases') claves.add(i.id);
  const orden = Object.fromEntries(INSUMOS.map((i, n) => [i.id, n]));
  const materiales = [...claves].map((k) => {
    const [ins, color] = k.split('|');
    const hay = red(stock[k] || 0);
    const necesita = red(necesitaCola[k] || 0);
    const minimo = aj.minimos[k] || 0;
    const porDia = (consumo30[k] || 0) / 30;
    const queda = red(hay - necesita);
    const estado = hay < necesita - 1e-9 || hay < 0 ? 'falta' : (minimo && queda < minimo) || (minimo && hay < minimo) ? 'bajo' : 'ok';
    return {
      clave: k, insumo: ins, color: color || '', nombre: insumoPorId[ins].nombre, grupo: insumoPorId[ins].grupo,
      unidad: unidadBase(aj, ins), hay, necesita, queda, minimo, estado,
      dias: porDia > 0 && hay > 0 ? Math.floor(hay / porDia) : null,
    };
  }).sort((a, b) => (orden[a.insumo] - orden[b.insumo]) || a.color.localeCompare(b.color, 'es'));

  const recientes = movs
    .filter((m) => m.auto && insumoPorId[m.insumo]?.grupo === 'tinta')
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 12);

  return {
    materiales,
    trabajos,
    recientes,
    ajustes: aj,
    unidades: mapaUnidades(aj),
    colores: [...new Set([...movs.map((m) => normColor(m.color)), ...activos.map((t) => normColor(t.tintaColor))].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    opcionesTrabajo: activos.map((t) => ({ _id: t._id, codigo: t.codigo, cliente: t.cliente, producto: t.producto, tintaTipo: t.tintaTipo, tintaColor: t.tintaColor }))
      .sort((a, b) => String(b.codigo).localeCompare(String(a.codigo))),
    resumen: {
      faltan: materiales.filter((m) => m.estado === 'falta').length,
      bajos: materiales.filter((m) => m.estado === 'bajo').length,
      trabajosSinMaterial: trabajos.filter((t) => t.faltantes.length).length,
      trabajosSinEnvases: trabajos.filter((t) => t.envases.falta > 0).length,
    },
    hayDatosPrueba: hayPrueba > 0,
  };
}
