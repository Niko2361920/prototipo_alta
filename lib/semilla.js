// Datos de PRUEBA para mostrar la plataforma (feria / presentación).
// Todo queda marcado con prueba: true y se borra con un botón desde Gerencia.
// Los clientes son ficticios a propósito; los envases salen de la tienda de twoglass.co.
import 'server-only';
import { getDb, nuevoId } from './db';
import { CAUSAS } from './catalogo';
import { inicioDia, sumarDias } from './fechas';

// Pesos del Pareto preliminar del equipo (Excel, sección 4), usados solo para
// que los datos de prueba se parezcan a lo que el equipo espera encontrar.
const PESO_BASE = {
  tinta_corrida: 9, polvo_avenida: 8, particulas_cortadora: 8, relieve_no_adhiere: 7,
  limpieza_sin_reportar: 6, carga_manual: 6, espacio_reducido: 5, desajuste: 5, tinta_ataca: 5,
  inspeccion_ojo: 5, presion_entrega: 4, registro_whatsapp: 4, no_registro: 4, maquinas_uso: 3,
  tecnica_inadecuada: 3, sin_indicadores: 3, temor_reportar: 2, prueba_opcional: 2,
};

const TINTAS_COLOR = { Blanco: '#f4f4f2', Negro: '#1d1f24', Dorado: '#c9a227', Verde: '#2f7d5b', Azul: '#1f5fa8', Rojo: '#b8322f' };

const PLANTILLAS = [
  { cliente: 'Laboratorio Demo A', producto: 'Pharma Amber 700 ml', material: 'Vidrio', forma: 'Cilíndrico', relieve: false, tecnica: 'serigrafia', tintaTipo: 'UV', tintaColor: 'Blanco', colores: 1, figura: 'gota' },
  { cliente: 'Perfumería Demo B', producto: 'Wild Glass 500 ml', material: 'Vidrio', forma: 'Irregular', relieve: true, tecnica: 'tampografia', tintaTipo: 'Catalizada (2 componentes)', tintaColor: 'Dorado', colores: 1, figura: 'estrella' },
  { cliente: 'Cosméticos Demo C', producto: 'Frasco PET 250 ml', material: 'Plástico PET', forma: 'Cilíndrico', relieve: false, tecnica: 'serigrafia', tintaTipo: 'Solvente', tintaColor: 'Negro', colores: 2, figura: 'hoja' },
  { cliente: 'Hotel Demo D', producto: 'Botella PEAD 500 ml (amenities)', material: 'Plástico PEAD', forma: 'Ovalado', relieve: false, tecnica: 'tampografia', tintaTipo: 'Solvente', tintaColor: 'Verde', colores: 1, figura: 'ola' },
  { cliente: 'Regalo corporativo Demo E', producto: 'Teo Light Bartop 700 ml', material: 'Vidrio', forma: 'Cilíndrico', relieve: false, tecnica: 'serigrafia', tintaTipo: 'UV', tintaColor: 'Negro', colores: 2, figura: 'circulo' },
  { cliente: 'Cosméticos Demo C', producto: 'Tarro PP 100 g con relieve', material: 'Plástico PP', forma: 'Cilíndrico', relieve: true, tecnica: 'tampografia', tintaTipo: 'Solvente', tintaColor: 'Azul', colores: 1, figura: 'hoja' },
  { cliente: 'Laboratorio Demo A', producto: 'Gotero ámbar 30 ml', material: 'Vidrio', forma: 'Cilíndrico', relieve: false, tecnica: 'tampografia', tintaTipo: 'UV', tintaColor: 'Blanco', colores: 1, figura: 'gota' },
  { cliente: 'Regalo corporativo Demo E', producto: 'Vaso de botella reciclada', material: 'Vidrio', forma: 'Cónico', relieve: false, tecnica: 'serigrafia', tintaTipo: 'Catalizada (2 componentes)', tintaColor: 'Blanco', colores: 1, figura: 'circulo' },
];

function aleatorio(semilla) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function elegirPonderado(r, pesos) {
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  let x = r() * total;
  for (const [id, p] of pesos) {
    x -= p;
    if (x <= 0) return id;
  }
  return pesos[pesos.length - 1][0];
}

function pesosPara(t) {
  return CAUSAS.map((c) => {
    let p = PESO_BASE[c.id] || 2;
    if (c.id === 'tinta_ataca') p = t.material.startsWith('Plástico') && t.tintaTipo === 'Solvente' ? 10 : 0.5;
    if (c.id === 'relieve_no_adhiere') p = t.relieve ? 12 : 0.5;
    if (c.id === 'particulas_cortadora' && t.material === 'Vidrio') p += 3;
    if (c.id === 'carga_manual' && t.tecnica === 'tampografia') p += 2;
    return [c.id, p];
  });
}

export function bocetoSvg(t, codigo) {
  const tinta = TINTAS_COLOR[t.tintaColor] || '#1d1f24';
  const vidrio = t.material === 'Vidrio';
  const fondoEnvase = vidrio ? (t.producto.toLowerCase().includes('amber') || t.producto.toLowerCase().includes('ámbar') ? '#a8642a' : '#dfeee9') : '#f6f6f4';
  const figuras = {
    gota: `<path d="M300 300 C 260 360 250 395 250 420 a50 50 0 0 0 100 0 c0-25-10-60-50-120z" fill="${tinta}"/>`,
    estrella: `<path d="M300 300 l18 40 44 5-33 30 9 44-38-22-38 22 9-44-33-30 44-5z" fill="${tinta}"/>`,
    hoja: `<path d="M245 440 C 245 360 320 320 360 315 C 360 380 320 440 245 440 Z M250 436 L340 330" fill="${tinta}" stroke="${fondoEnvase}" stroke-width="5"/>`,
    ola: `<path d="M235 400 q32-34 65 0 t65 0 v40 h-130z" fill="${tinta}"/>`,
    circulo: `<circle cx="300" cy="380" r="62" fill="none" stroke="${tinta}" stroke-width="14"/><circle cx="300" cy="380" r="22" fill="${tinta}"/>`,
  };
  const nombre = t.cliente.replace(/ Demo [A-Z]$/, '').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
<rect width="600" height="800" fill="#fbfcfb"/>
<g stroke="#9aa3ad" stroke-width="2" fill="none" stroke-dasharray="8 8"><path d="M250 70 h100 v90 c0 30 80 50 80 120 v430 c0 22-18 40-40 40 H210 c-22 0-40-18-40-40 V280 c0-70 80-90 80-120z"/></g>
<path d="M252 72 h96 v88 c0 30 80 50 80 120 v430 c0 21-17 38-38 38 H210 c-21 0-38-17-38-38 V280 c0-70 80-90 80-120z" fill="${fondoEnvase}" opacity="0.55"/>
<rect x="196" y="270" width="208" height="300" rx="10" fill="none" stroke="#1792b0" stroke-width="3"/>
<text x="300" y="262" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#1792b0">ÁREA DE IMPRESIÓN</text>
${figuras[t.figura] || figuras.circulo}
<text x="300" y="500" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="30" fill="${tinta}">${nombre}</text>
<text x="300" y="532" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="3" fill="${tinta}">DEMO · ${t.colores} ${t.colores > 1 ? 'COLORES' : 'COLOR'}</text>
<text x="30" y="40" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#3b4053">${codigo} · BOCETO DE PRUEBA</text>
<text x="30" y="775" font-family="Arial, sans-serif" font-size="15" fill="#69727d">${t.producto} · ${t.material} · Tinta ${t.tintaTipo} ${t.tintaColor}</text>
</svg>`;
}

export async function cargarDatosPrueba(usuario = 'angelica') {
  const db = await getDb();
  const r = aleatorio(20261025);
  const hoy = inicioDia();
  const trabajos = [];
  const defectos = [];
  const avances = [];
  const bocetos = [];
  const contador = await db.collection('contadores').findOne({ _id: 'trabajos' });
  let n = contador?.valor || 0;

  // 14 trabajos terminados en los últimos 45 días, 1 en producción, 4 en cola, 1 pausado
  const plan = [];
  for (let i = 0; i < 14; i++) plan.push({ estado: 'terminado', diasAtras: 44 - i * 3 - Math.floor(r() * 2) });
  plan.push({ estado: 'en_proceso', diasAtras: 0 });
  for (let i = 0; i < 4; i++) plan.push({ estado: 'pendiente', diasAtras: 0 });
  plan.push({ estado: 'pausado', diasAtras: 2 });

  plan.forEach((p, i) => {
    const base = i < 14 ? PLANTILLAS[(i * 3) % PLANTILLAS.length] : PLANTILLAS[[5, 0, 2, 1, 6, 3][i - 14]];
    const unidades = [200, 200, 400, 120, 600, 300, 250][Math.floor(r() * 7)];
    n += 1;
    const codigo = `TG-${String(n).padStart(4, '0')}`;
    const inicio = sumarDias(hoy, -p.diasAtras);
    const t = {
      _id: nuevoId() + i,
      codigo,
      cliente: base.cliente,
      producto: base.producto,
      material: base.material,
      forma: base.forma,
      relieve: base.relieve,
      tecnica: base.tecnica,
      maquina: base.tecnica === 'serigrafia' ? 'Serigrafía Screen' : 'Tampografía SP-824SC',
      tintaTipo: base.tintaTipo,
      tintaColor: base.tintaColor,
      colores: base.colores,
      unidades,
      mermaMax: unidades >= 600 ? 10 : 5,
      fechaEntrega: '',
      notas: i === 14
        ? 'Prueba de impresión aprobada por el cliente. Revisar alineación cada 20 piezas. Datos de prueba.'
        : 'Trabajo de prueba para mostrar la plataforma.',
      estado: p.estado,
      orden: i,
      buenas: 0,
      defectos: 0,
      pruebaAprobada: p.estado !== 'pendiente',
      tieneBoceto: true,
      bocetoVersion: 1,
      creado: sumarDias(inicio, -1),
      creadoPor: usuario,
      prueba: true,
    };
    if (p.estado === 'terminado') { t.iniciado = new Date(inicio.getTime() + 8 * 3600e3); t.terminado = new Date(inicio.getTime() + 15 * 3600e3); }
    if (p.estado === 'en_proceso') t.iniciado = new Date(Date.now() - 2 * 3600e3);
    if (p.estado === 'pausado') t.iniciado = new Date(inicio.getTime() + 9 * 3600e3);

    // Producción simulada
    if (p.estado !== 'pendiente') {
      const avance = p.estado === 'terminado' ? 1 : p.estado === 'en_proceso' ? 0.45 : 0.3;
      const hechas = Math.round(unidades * avance);
      const tasa = 0.01 + r() * 0.08;
      let malas = Math.max(1, Math.round(hechas * tasa));
      const pesos = pesosPara(t);
      while (malas > 0) {
        const cant = Math.min(malas, 1 + Math.floor(r() * 3));
        malas -= cant;
        const causa = elegirPonderado(r, pesos);
        const c = CAUSAS.find((x) => x.id === causa);
        const fecha = p.estado === 'en_proceso'
          ? new Date(Date.now() - r() * 2 * 3600e3)
          : new Date(t.iniciado.getTime() + r() * 6 * 3600e3);
        defectos.push({
          _id: nuevoId() + defectos.length, trabajoId: t._id, codigo, cliente: t.cliente, producto: t.producto,
          material: t.material, forma: t.forma, relieve: t.relieve, tecnica: t.tecnica, tintaTipo: t.tintaTipo, tintaColor: t.tintaColor,
          causa, categoria: c.categoria, cantidad: cant, accion: r() < 0.7 ? 'reproceso' : 'descarte', tipoDefecto: '', nota: '',
          operario: r() < 0.55 ? 'diego' : 'joshua', registradoPor: 'diego', fecha, prueba: true,
        });
        t.defectos += cant;
      }
      const buenas = Math.max(0, hechas - t.defectos);
      const partes = 3;
      for (let k = 0; k < partes; k++) {
        const cant = k < partes - 1 ? Math.round(buenas / partes) : buenas - Math.round(buenas / partes) * (partes - 1);
        avances.push({
          _id: nuevoId() + 'a' + avances.length, trabajoId: t._id, cantidad: cant, operario: k % 2 ? 'joshua' : 'diego',
          registradoPor: 'diego', fecha: p.estado === 'en_proceso' ? new Date(Date.now() - (partes - k) * 30 * 60e3) : new Date(t.iniciado.getTime() + (k + 1) * 2 * 3600e3), prueba: true,
        });
      }
      t.buenas = buenas;
    }
    trabajos.push(t);
    bocetos.push({ _id: t._id, tipo: 'image/svg+xml', base64: Buffer.from(bocetoSvg(base, codigo)).toString('base64'), version: 1 });
  });

  await db.collection('trabajos').insertMany(trabajos);
  if (defectos.length) await db.collection('defectos').insertMany(defectos);
  if (avances.length) await db.collection('avances').insertMany(avances);
  await db.collection('bocetos').insertMany(bocetos);
  await db.collection('contadores').updateOne({ _id: 'trabajos' }, { $set: { valor: n } }, { upsert: true });
  return { trabajos: trabajos.length, defectos: defectos.length };
}

export async function borrarDatosPrueba() {
  const db = await getDb();
  const ids = (await db.collection('trabajos').find({ prueba: true }, { projection: { _id: 1 } }).toArray()).map((t) => t._id);
  await Promise.all([
    db.collection('trabajos').deleteMany({ prueba: true }),
    db.collection('defectos').deleteMany({ prueba: true }),
    db.collection('avances').deleteMany({ prueba: true }),
    ids.length ? db.collection('bocetos').deleteMany({ _id: { $in: ids } }) : null,
  ]);
  return { borrados: ids.length };
}
