// Acceso a datos: trabajos, defectos y avances.
import 'server-only';
import { getDb, nuevoId } from './db';
import { MATERIALES, FORMAS, TECNICAS, TIPOS_TINTA, ESTADOS, causaPorId, categoriaPorId, TIPOS_DEFECTO, tecnicaPorId } from './catalogo';
import { texto, entero } from './api';
import { trabajosParecidos, parecido, pareto, porCategoria, indicadores, tendencia } from './calculos';
import { inicioDia, sumarDias } from './fechas';

const uno = (v, lista, defecto) => (lista.includes(v) ? v : defecto);

// Limpia y valida lo que llega del formulario de trabajo
export function limpiarTrabajo(e, parcial = false) {
  const t = {};
  const set = (k, v) => { if (!parcial || e[k] !== undefined) t[k] = v; };
  set('cliente', texto(e.cliente, 80));
  set('producto', texto(e.producto, 100));
  set('material', uno(e.material, MATERIALES, 'Vidrio'));
  set('forma', uno(e.forma, FORMAS, 'Cilíndrico'));
  set('relieve', Boolean(e.relieve));
  const tec = uno(e.tecnica, TECNICAS.map((x) => x.id), 'serigrafia');
  set('tecnica', tec);
  if (!parcial || e.tecnica !== undefined) t.maquina = tecnicaPorId[tec].maquina;
  set('tintaTipo', uno(e.tintaTipo, TIPOS_TINTA, 'UV'));
  set('tintaColor', texto(e.tintaColor, 40));
  set('colores', entero(e.colores, 1, 6));
  set('unidades', entero(e.unidades, 1, 100000));
  set('mermaMax', entero(e.mermaMax ?? 5, 1, 20));
  set('fechaEntrega', e.fechaEntrega ? texto(e.fechaEntrega, 10) : '');
  set('notas', texto(e.notas, 600));
  if (e.pruebaAprobada !== undefined) t.pruebaAprobada = Boolean(e.pruebaAprobada);
  if (e.estado !== undefined) t.estado = uno(e.estado, ESTADOS.map((x) => x.id), 'pendiente');
  return t;
}

async function siguienteCodigo(db) {
  await db.collection('contadores').updateOne({ _id: 'trabajos' }, { $inc: { valor: 1 } }, { upsert: true });
  const c = await db.collection('contadores').findOne({ _id: 'trabajos' });
  return `TG-${String(c.valor).padStart(4, '0')}`;
}

export async function crearTrabajo(entrada, sesion) {
  const db = await getDb();
  const datos = limpiarTrabajo(entrada);
  if (!datos.cliente || !datos.producto) throw new Error('Falta el cliente o el envase.');
  const ultimo = await db.collection('trabajos').find({ estado: 'pendiente' }).sort({ orden: -1 }).limit(1).toArray();
  const trabajo = {
    _id: nuevoId(),
    codigo: await siguienteCodigo(db),
    ...datos,
    estado: 'pendiente',
    orden: (ultimo[0]?.orden || 0) + 1,
    buenas: 0,
    defectos: 0,
    pruebaAprobada: false,
    tieneBoceto: false,
    creado: new Date(),
    creadoPor: sesion.usuario,
    prueba: Boolean(entrada.prueba),
  };
  await db.collection('trabajos').insertOne(trabajo);
  return trabajo;
}

export async function listarTrabajos(filtro = {}) {
  const db = await getDb();
  return db.collection('trabajos').find(filtro).sort({ creado: -1 }).toArray();
}

export async function obtenerTrabajo(id) {
  const db = await getDb();
  return db.collection('trabajos').findOne({ _id: String(id) });
}

export async function actualizarTrabajo(id, cambios) {
  const db = await getDb();
  const actual = await obtenerTrabajo(id);
  if (!actual) return null;
  const $set = { ...cambios, actualizado: new Date() };
  if (cambios.estado === 'en_proceso' && !actual.iniciado) $set.iniciado = new Date();
  if (cambios.estado === 'terminado') $set.terminado = new Date();
  if (cambios.estado && cambios.estado !== 'terminado' && actual.terminado) $set.terminado = null;
  if (cambios.estado === 'pendiente' && actual.estado !== 'pendiente') {
    const ultimo = await db.collection('trabajos').find({ estado: 'pendiente' }).sort({ orden: -1 }).limit(1).toArray();
    $set.orden = (ultimo[0]?.orden || 0) + 1;
  }
  await db.collection('trabajos').updateOne({ _id: actual._id }, { $set });
  return obtenerTrabajo(id);
}

// Mueve un trabajo en la cola (arriba / abajo)
export async function moverEnCola(id, direccion) {
  const db = await getDb();
  const cola = await db.collection('trabajos').find({ estado: 'pendiente' }).sort({ orden: 1 }).toArray();
  const i = cola.findIndex((t) => t._id === id);
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= cola.length) return;
  [cola[i], cola[j]] = [cola[j], cola[i]];
  await Promise.all(cola.map((t, k) => db.collection('trabajos').updateOne({ _id: t._id }, { $set: { orden: k + 1 } })));
}

export async function borrarTrabajo(id) {
  const db = await getDb();
  await Promise.all([
    db.collection('trabajos').deleteOne({ _id: id }),
    db.collection('bocetos').deleteOne({ _id: id }),
    db.collection('defectos').deleteMany({ trabajoId: id }),
    db.collection('avances').deleteMany({ trabajoId: id }),
  ]);
}

// ---------- Bocetos (imagen del arte) ----------
export async function guardarBoceto(id, dataUrl) {
  const m = /^data:(image\/(png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('El boceto debe ser una imagen PNG, JPG, WEBP o SVG.');
  if (m[3].length > 3_500_000) throw new Error('La imagen es muy pesada (máximo ~2,5 MB).');
  const db = await getDb();
  const version = Date.now();
  await db.collection('bocetos').updateOne({ _id: id }, { $set: { tipo: m[1], base64: m[3], version } }, { upsert: true });
  await db.collection('trabajos').updateOne({ _id: id }, { $set: { tieneBoceto: true, bocetoVersion: version } });
  return version;
}

export async function leerBoceto(id) {
  const db = await getDb();
  return db.collection('bocetos').findOne({ _id: id });
}

// ---------- Defectos ----------
export function limpiarDefecto(e) {
  const causa = causaPorId[e.causa];
  if (!causa) throw new Error('Causa no válida.');
  return {
    causa: causa.id,
    categoria: causa.categoria,
    cantidad: entero(e.cantidad ?? 1, 1, 10000),
    accion: e.accion === 'descarte' ? 'descarte' : 'reproceso',
    tipoDefecto: TIPOS_DEFECTO.includes(e.tipoDefecto) ? e.tipoDefecto : '',
    nota: texto(e.nota, 300),
  };
}

export async function registrarDefecto(entrada, sesion) {
  const db = await getDb();
  const trabajo = await obtenerTrabajo(entrada.trabajoId);
  if (!trabajo) throw new Error('Trabajo no encontrado.');
  const datos = limpiarDefecto(entrada);
  const operario = ['diego', 'joshua', 'angelica'].includes(entrada.operario) ? entrada.operario : sesion.usuario;
  const defecto = {
    _id: nuevoId(),
    trabajoId: trabajo._id,
    codigo: trabajo.codigo,
    cliente: trabajo.cliente,
    producto: trabajo.producto,
    material: trabajo.material,
    forma: trabajo.forma,
    relieve: trabajo.relieve,
    tecnica: trabajo.tecnica,
    tintaTipo: trabajo.tintaTipo,
    tintaColor: trabajo.tintaColor,
    ...datos,
    operario,
    registradoPor: sesion.usuario,
    fecha: entrada.fecha ? new Date(entrada.fecha) : new Date(),
    prueba: Boolean(trabajo.prueba),
  };
  await db.collection('defectos').insertOne(defecto);
  await db.collection('trabajos').updateOne({ _id: trabajo._id }, { $inc: { defectos: defecto.cantidad }, $set: { actualizado: new Date() } });
  return defecto;
}

export async function editarDefecto(id, cambios) {
  const db = await getDb();
  const d = await db.collection('defectos').findOne({ _id: id });
  if (!d) return null;
  const $set = {};
  if (cambios.cantidad !== undefined) $set.cantidad = entero(cambios.cantidad, 1, 10000);
  if (cambios.accion !== undefined) $set.accion = cambios.accion === 'descarte' ? 'descarte' : 'reproceso';
  if (cambios.tipoDefecto !== undefined) $set.tipoDefecto = TIPOS_DEFECTO.includes(cambios.tipoDefecto) ? cambios.tipoDefecto : '';
  if (cambios.nota !== undefined) $set.nota = texto(cambios.nota, 300);
  await db.collection('defectos').updateOne({ _id: id }, { $set });
  if ($set.cantidad !== undefined && $set.cantidad !== d.cantidad) {
    await db.collection('trabajos').updateOne({ _id: d.trabajoId }, { $inc: { defectos: $set.cantidad - d.cantidad } });
  }
  return { ...d, ...$set };
}

export async function borrarDefecto(id) {
  const db = await getDb();
  const d = await db.collection('defectos').findOne({ _id: id });
  if (!d) return null;
  await db.collection('defectos').deleteOne({ _id: id });
  await db.collection('trabajos').updateOne({ _id: d.trabajoId }, { $inc: { defectos: -d.cantidad } });
  return d;
}

// ---------- Avances (unidades buenas estampadas) ----------
export async function registrarAvance(trabajoId, cantidad, sesion, operario) {
  const db = await getDb();
  const trabajo = await obtenerTrabajo(trabajoId);
  if (!trabajo) throw new Error('Trabajo no encontrado.');
  const n = Math.round(Number(cantidad));
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 100000) throw new Error('Cantidad no válida.');
  const nuevoTotal = Math.max(0, (trabajo.buenas || 0) + n);
  const delta = nuevoTotal - (trabajo.buenas || 0);
  if (delta === 0) return trabajo;
  await db.collection('avances').insertOne({
    _id: nuevoId(), trabajoId: trabajo._id, cantidad: delta, operario: operario || sesion.usuario,
    registradoPor: sesion.usuario, fecha: new Date(), prueba: Boolean(trabajo.prueba),
  });
  await db.collection('trabajos').updateOne({ _id: trabajo._id }, { $set: { buenas: nuevoTotal, actualizado: new Date() } });
  return { ...trabajo, buenas: nuevoTotal };
}

// ---------- Vistas ----------
const CAMPOS_DEF = { projection: { trabajoId: 1, causa: 1, categoria: 1, cantidad: 1 } };

// Calcula los trabajos parecidos para varios trabajos a la vez, con pocas consultas
async function parecidosPara(trabajos) {
  const db = await getDb();
  const todos = await db.collection('trabajos').find({}, { projection: { notas: 0 } }).toArray();
  const conDefectos = todos.filter((o) => (o.defectos || 0) > 0);
  const ids = new Set();
  for (const t of trabajos) {
    for (const o of conDefectos) if (o._id !== t._id && parecido(t, o).puntos >= 3) ids.add(o._id);
  }
  const defs = ids.size ? await db.collection('defectos').find({ trabajoId: { $in: [...ids] } }, CAMPOS_DEF).toArray() : [];
  return trabajos.map((t) => trabajosParecidos(t, conDefectos, defs));
}

export async function analisisParecidos(trabajo) {
  return (await parecidosPara([trabajo]))[0];
}

export async function vistaProduccion() {
  const db = await getDb();
  const [enProceso, cola, pausados] = await Promise.all([
    db.collection('trabajos').find({ estado: 'en_proceso' }).sort({ iniciado: -1 }).toArray(),
    db.collection('trabajos').find({ estado: 'pendiente' }).sort({ orden: 1 }).limit(8).toArray(),
    db.collection('trabajos').find({ estado: 'pausado' }).sort({ actualizado: -1 }).limit(4).toArray(),
  ]);
  const actual = enProceso[0] || null;
  const analisis = await parecidosPara(actual ? [actual, ...cola] : cola);
  const parecidos = actual ? analisis[0] : null;
  const avisosCola = actual ? analisis.slice(1) : analisis;
  const registros = actual
    ? await db.collection('defectos').find({ trabajoId: actual._id }).sort({ fecha: -1 }).limit(12).toArray()
    : [];
  const hoy = inicioDia();
  const [defHoy, avHoy] = await Promise.all([
    db.collection('defectos').find({ fecha: { $gte: hoy } }, { projection: { cantidad: 1, accion: 1 } }).toArray(),
    db.collection('avances').find({ fecha: { $gte: hoy } }, { projection: { cantidad: 1 } }).toArray(),
  ]);
  return {
    actual,
    otrosEnProceso: enProceso.slice(1),
    cola: cola.map((t, i) => ({
      ...t,
      notas: undefined,
      aviso: avisosCola[i]?.causas[0] ? { causa: avisosCola[i].causas[0].corto, veces: avisosCola[i].causas[0].cantidad } : null,
    })),
    pausados,
    parecidos,
    registros,
    hoy: indicadores(defHoy, avHoy),
    servidor: new Date(),
  };
}

export async function vistaResumen({ desde, hasta, material, tecnica }) {
  const db = await getDb();
  const filtro = { fecha: { $gte: desde, $lt: hasta } };
  if (material) filtro.material = material;
  if (tecnica) filtro.tecnica = tecnica;
  const [defectos, avancesTodos, trabajos, hayPrueba] = await Promise.all([
    db.collection('defectos').find(filtro).toArray(),
    db.collection('avances').find({ fecha: { $gte: desde, $lt: hasta } }).toArray(),
    db.collection('trabajos').find({}, { projection: { notas: 0 } }).toArray(),
    db.collection('trabajos').countDocuments({ prueba: true }),
  ]);
  // Si hay filtro de material/técnica, las unidades buenas se toman de esos trabajos
  const ids = new Set(trabajos.filter((t) => (!material || t.material === material) && (!tecnica || t.tecnica === tecnica)).map((t) => t._id));
  const avances = avancesTodos.filter((a) => ids.has(a.trabajoId));
  const dias = Math.round((hasta - desde) / 86400000);
  const desdeTendencia = dias > 90 ? sumarDias(hasta, -90) : desde;
  return {
    indicadores: indicadores(defectos, avances),
    pareto: pareto(defectos),
    categorias: porCategoria(defectos),
    tendencia: tendencia(defectos.filter((d) => d.fecha >= desdeTendencia), avances, desdeTendencia, hasta),
    trabajos: {
      enProceso: trabajos.filter((t) => t.estado === 'en_proceso').length,
      enCola: trabajos.filter((t) => t.estado === 'pendiente').length,
      terminados: trabajos.filter((t) => t.estado === 'terminado' && t.terminado && t.terminado >= desde && t.terminado < hasta).length,
    },
    porOperario: ['diego', 'joshua'].map((u) => ({
      usuario: u,
      defectos: defectos.filter((d) => d.operario === u).reduce((s, d) => s + d.cantidad, 0),
      registros: defectos.filter((d) => d.operario === u).length,
    })),
    hayDatosPrueba: hayPrueba > 0,
  };
}

export async function listarDefectos({ desde, hasta, categoria, trabajoId, limite = 500 }) {
  const db = await getDb();
  const filtro = {};
  if (desde || hasta) filtro.fecha = {};
  if (desde) filtro.fecha.$gte = desde;
  if (hasta) filtro.fecha.$lt = hasta;
  if (categoria && categoriaPorId[categoria]) filtro.categoria = categoria;
  if (trabajoId) filtro.trabajoId = trabajoId;
  return db.collection('defectos').find(filtro).sort({ fecha: -1 }).limit(limite).toArray();
}
