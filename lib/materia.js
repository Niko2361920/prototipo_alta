// Materia prima (entradas y consumos) y reporte mensual por cliente.
// Sugerencia del profesor en la revisión del prototipo: que la plataforma no se
// quede en el error y sirva para presupuestar (consumo de material por mes,
// filtro por empresa, inventario, reportes para imprimir).
import 'server-only';
import { getDb, nuevoId } from './db';
import { INSUMOS, insumoPorId } from './catalogo';
import { texto } from './api';
import { desdeClave } from './fechas';
import { leerAjustes, unidadBase, mapaUnidades, convertir, normColor, SIN_COLOR } from './inventario';

const red = (x) => Math.round(x * 100) / 100;
const suma = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

// ---------- Movimientos ----------
export async function registrarMovimiento(e, sesion) {
  const insumo = insumoPorId[e.insumo];
  if (!insumo) throw new Error('Elige el material.');
  const tipo = e.tipo === 'consumo' ? 'consumo' : 'entrada';
  if (insumo.grupo === 'envases' && tipo === 'consumo') {
    throw new Error('Los envases usados se calculan solos con lo que registra producción (buenas + descartes).');
  }
  const escrita = Number(String(e.cantidad).replace(',', '.'));
  if (!Number.isFinite(escrita) || escrita <= 0 || escrita > 1_000_000) throw new Error('Escribe una cantidad mayor que cero.');
  // Se guarda siempre en la unidad base del material (p. ej. 350 g de tinta → 0,35 kg)
  const aj = await leerAjustes();
  const unidad = unidadBase(aj, insumo.id);
  const cantidad = Math.round(convertir(escrita, e.unidad || unidad, unidad) * 1000) / 1000;
  if (cantidad <= 0) throw new Error('La cantidad es muy pequeña.');

  const db = await getDb();
  let trabajo = null;
  if (e.trabajoId) {
    trabajo = await db.collection('trabajos').findOne({ _id: String(e.trabajoId) });
    if (!trabajo) throw new Error('Trabajo no encontrado.');
  }
  const cliente = trabajo?.cliente || texto(e.cliente, 80);
  if (insumo.grupo === 'envases' && !cliente) throw new Error('Para los envases, elige el trabajo o escribe el cliente.');
  // La tinta va por color: si es de un trabajo, el color del trabajo
  const color = insumo.grupo === 'tinta' ? normColor(e.color) || normColor(trabajo?.tintaColor) || SIN_COLOR : '';

  let fecha = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.fecha || '')) {
    fecha = new Date(desdeClave(e.fecha).getTime() + 12 * 3600e3); // mediodía de ese día en Bogotá
    if (fecha > new Date(Date.now() + 86400000)) throw new Error('La fecha no puede ser futura.');
  }

  const mov = {
    _id: nuevoId(),
    fecha,
    tipo,
    insumo: insumo.id,
    color,
    unidad,
    cantidad,
    trabajoId: trabajo?._id || null,
    codigo: trabajo?.codigo || '',
    cliente,
    nota: texto(e.nota, 200),
    registradoPor: sesion.usuario,
    creado: new Date(),
    prueba: Boolean(trabajo?.prueba),
  };
  await db.collection('materia').insertOne(mov);
  return mov;
}

export async function borrarMovimiento(id) {
  const db = await getDb();
  const r = await db.collection('materia').deleteOne({ _id: String(id) });
  return r.deletedCount > 0;
}

// ---------- Reporte mensual ----------
export const claveMes = (f) => new Date(new Date(f).getTime() - 5 * 3600e3).toISOString().slice(0, 7);
const desdeMes = (mes) => desdeClave(`${mes}-01`);
function mesMas(mes, k) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + k, 1));
  return d.toISOString().slice(0, 7);
}

export async function vistaMensual({ mes, cliente = '' }) {
  const db = await getDb();
  const unidades = mapaUnidades(await leerAjustes());
  const desde = desdeMes(mes);
  const hasta = desdeMes(mesMas(mes, 1));
  const desdeHist = desdeMes(mesMas(mes, -5)); // 6 meses para el promedio

  const [trabajos, defectosH, avancesH, movsTodos, hayPrueba] = await Promise.all([
    db.collection('trabajos').find({}, { projection: { notas: 0 } }).toArray(),
    db.collection('defectos').find({ fecha: { $gte: desdeHist, $lt: hasta } }, { projection: { trabajoId: 1, cantidad: 1, accion: 1, fecha: 1 } }).toArray(),
    db.collection('avances').find({ fecha: { $gte: desdeHist, $lt: hasta } }, { projection: { trabajoId: 1, cantidad: 1, fecha: 1 } }).toArray(),
    db.collection('materia').find({ fecha: { $lt: hasta } }).sort({ fecha: -1 }).toArray(),
    db.collection('trabajos').countDocuments({ prueba: true }),
  ]);

  const clientes = [...new Set([...trabajos.map((t) => t.cliente), ...movsTodos.map((m) => m.cliente)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const porId = Object.fromEntries(trabajos.map((t) => [t._id, t]));
  const delCliente = (c) => !cliente || c === cliente;
  const clienteDe = (x) => porId[x.trabajoId]?.cliente || x.cliente || '';

  const enMes = (f) => f >= desde && f < hasta;
  const defectos = defectosH.filter((d) => enMes(d.fecha) && delCliente(clienteDe(d)));
  const avances = avancesH.filter((a) => enMes(a.fecha) && delCliente(clienteDe(a)));
  const movs = movsTodos.filter((m) => enMes(m.fecha));
  const movsCliente = cliente ? movs.filter((m) => m.cliente === cliente) : movs;

  // Trabajos con algo en el mes: inicio, fin, producción, defectos o llegada de envases
  const activos = new Set([
    ...defectos.map((d) => d.trabajoId),
    ...avances.map((a) => a.trabajoId),
    ...movsCliente.filter((m) => m.trabajoId).map((m) => m.trabajoId),
    ...trabajos.filter((t) => (t.iniciado && enMes(t.iniciado)) || (t.terminado && enMes(t.terminado))).map((t) => t._id),
  ]);
  const trabajosMes = trabajos.filter((t) => activos.has(t._id) && delCliente(t.cliente));

  const buenas = suma(avances, (a) => a.cantidad);
  const totalDef = suma(defectos, (d) => d.cantidad);
  const descartes = suma(defectos.filter((d) => d.accion === 'descarte'), (d) => d.cantidad);
  const recibidos = suma(movsCliente.filter((m) => m.insumo === 'envases'), (m) => m.cantidad);

  // Por cliente
  const filas = new Map();
  const fila = (c) => {
    if (!filas.has(c)) filas.set(c, { cliente: c, trabajos: 0, pedidas: 0, buenas: 0, defectos: 0, descartes: 0, recibidos: 0, tintaKg: 0 });
    return filas.get(c);
  };
  trabajosMes.forEach((t) => { const f = fila(t.cliente); f.trabajos += 1; f.pedidas += t.unidades || 0; });
  avances.forEach((a) => { fila(clienteDe(a)).buenas += a.cantidad; });
  defectos.forEach((d) => { const f = fila(clienteDe(d)); f.defectos += d.cantidad; if (d.accion === 'descarte') f.descartes += d.cantidad; });
  movsCliente.forEach((m) => {
    if (!m.cliente) return;
    const f = fila(m.cliente);
    if (m.insumo === 'envases') f.recibidos += m.cantidad;
    if (insumoPorId[m.insumo]?.grupo === 'tinta' && m.tipo === 'consumo' && m.unidad === 'kg') f.tintaKg = red(f.tintaKg + m.cantidad);
  });
  const porCliente = [...filas.values()]
    .map((f) => ({ ...f, usados: f.buenas + f.descartes, pctDefectos: f.buenas + f.defectos ? f.defectos / (f.buenas + f.defectos) : null }))
    .sort((a, b) => b.buenas - a.buenas || a.cliente.localeCompare(b.cliente, 'es'));

  // Materia prima del mes y saldo (inventario) al cierre del mes
  const materiales = INSUMOS.map((i) => {
    const deEste = movs.filter((m) => m.insumo === i.id);
    const mesEntradas = cliente ? deEste.filter((m) => m.cliente === cliente) : deEste;
    const entradas = red(suma(mesEntradas.filter((m) => m.tipo === 'entrada'), (m) => m.cantidad));
    let consumo = red(suma(mesEntradas.filter((m) => m.tipo === 'consumo'), (m) => m.cantidad));
    let saldo = null;
    if (i.grupo === 'envases') consumo = buenas + descartes;
    else if (!cliente) {
      const todos = movsTodos.filter((m) => m.insumo === i.id);
      saldo = red(suma(todos.filter((m) => m.tipo === 'entrada'), (m) => m.cantidad) - suma(todos.filter((m) => m.tipo === 'consumo'), (m) => m.cantidad));
    }
    return { id: i.id, nombre: i.nombre, unidad: unidades[i.id], grupo: i.grupo, entradas, consumo, saldo };
  });

  // Últimos 6 meses → promedio mensual y estimado a 12 meses (para presupuestar)
  const meses = Array.from({ length: 6 }, (_, k) => mesMas(mes, k - 5));
  const historial = meses.map((m) => {
    const a = desdeMes(m);
    const b = desdeMes(mesMas(m, 1));
    const en = (f) => f >= a && f < b;
    const av = avancesH.filter((x) => en(x.fecha) && delCliente(clienteDe(x)));
    const df = defectosH.filter((x) => en(x.fecha) && delCliente(clienteDe(x)));
    const mv = movsTodos.filter((x) => en(x.fecha) && (!cliente || x.cliente === cliente));
    const consumoPor = {};
    for (const i of INSUMOS) {
      consumoPor[i.id] = i.grupo === 'envases'
        ? suma(av, (x) => x.cantidad) + suma(df.filter((x) => x.accion === 'descarte'), (x) => x.cantidad)
        : red(suma(mv.filter((x) => x.insumo === i.id && x.tipo === 'consumo'), (x) => x.cantidad));
    }
    return {
      mes: m,
      buenas: suma(av, (x) => x.cantidad),
      defectos: suma(df, (x) => x.cantidad),
      recibidos: suma(mv.filter((x) => x.insumo === 'envases'), (x) => x.cantidad),
      tintaKg: red(INSUMOS.filter((i) => i.grupo === 'tinta' && unidades[i.id] === 'kg').reduce((s, i) => s + consumoPor[i.id], 0)),
      consumoPor,
      conDatos: av.length + df.length + mv.length > 0,
    };
  });
  const conDatos = historial.filter((h) => h.conDatos);
  const proyeccion = INSUMOS.map((i) => {
    const prom = conDatos.length ? red(suma(conDatos, (h) => h.consumoPor[i.id]) / conDatos.length) : 0;
    return { id: i.id, nombre: i.nombre, unidad: unidades[i.id], promedioMes: prom, estimadoAnio: red(prom * 12) };
  }).filter((p) => p.promedioMes > 0);

  // Línea de tiempo de cada trabajo: llegada de envases → inicio → fin
  const llegada = {};
  for (const m of movsTodos) if (m.insumo === 'envases' && m.trabajoId && (!llegada[m.trabajoId] || m.fecha < llegada[m.trabajoId])) llegada[m.trabajoId] = m.fecha;
  const listaTrabajos = trabajosMes
    .map((t) => ({
      _id: t._id, codigo: t.codigo, cliente: t.cliente, producto: t.producto, unidades: t.unidades, estado: t.estado,
      llegada: llegada[t._id] || null, iniciado: t.iniciado || null, terminado: t.terminado || null,
      buenas: suma(avances.filter((a) => a.trabajoId === t._id), (a) => a.cantidad),
      defectos: suma(defectos.filter((d) => d.trabajoId === t._id), (d) => d.cantidad),
    }))
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

  return {
    mes,
    cliente,
    clientes,
    indicadores: {
      trabajos: trabajosMes.length,
      terminados: trabajosMes.filter((t) => t.terminado && enMes(t.terminado)).length,
      buenas,
      defectos: totalDef,
      descartes,
      reprocesos: totalDef - descartes,
      pctDefectos: buenas + totalDef ? totalDef / (buenas + totalDef) : null,
      envasesRecibidos: recibidos,
      envasesUsados: buenas + descartes,
      tintaKg: red(suma(materiales.filter((x) => x.grupo === 'tinta' && x.unidad === 'kg'), (x) => x.consumo)),
    },
    porCliente,
    materiales,
    historial: historial.map(({ consumoPor, ...h }) => h),
    proyeccion,
    mesesConDatos: conDatos.length,
    trabajos: listaTrabajos,
    movimientos: movsCliente.slice(0, 200),
    opcionesTrabajo: trabajos
      .filter((t) => t.estado !== 'terminado' || (t.terminado && t.terminado >= desdeMes(mesMas(mes, -1))))
      .map((t) => ({ _id: t._id, codigo: t.codigo, cliente: t.cliente, producto: t.producto, tintaTipo: t.tintaTipo }))
      .sort((a, b) => String(b.codigo).localeCompare(String(a.codigo))),
    unidades,
    hayDatosPrueba: hayPrueba > 0,
  };
}
