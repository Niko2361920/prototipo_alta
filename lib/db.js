// Conexión a la base de datos. En Vercel usa MongoDB Atlas (MONGODB_URI).
// Para probar en un computador sin MongoDB: MONGODB_URI=memoria
//
// Por qué así:
// - Un solo MongoClient por instancia, guardado en globalThis, porque Vercel
//   reutiliza la función entre peticiones y Atlas M0 limita las conexiones.
//   Si la conexión falla, se descarta la promesa para reintentar en la siguiente
//   petición (antes también se hacía; ahora además se cierra el cliente fallido).
// - Los errores se traducen con lib/mongo-config.js a un mensaje con la causa y
//   qué hacer; el error original va completo a los logs.
// - Los índices se crean al conectar. Antes cualquier fallo se ignoraba en
//   silencio; eso escondía el error de mayúsculas (DatabaseDifferCase) y el de
//   permisos, que luego reventaban al guardar. Ahora esos dos se reportan; el
//   resto se sigue ignorando para no tumbar la app por un índice.
import 'server-only';
import { MongoClient } from 'mongodb';
import { MemDb } from './memdb';
import { leerConfigMongo, validarConfig, traducirErrorMongo } from './mongo-config';

const cfg = leerConfigMongo(process.env);

export const usaMemoria = cfg.usaMemoria;
export const nombreDb = cfg.nombreDb;
export const origenUri = cfg.origen;

let promesa = globalThis.__tgDbPromesa;

const INDICES = [
  ['usuarios', { usuario: 1 }, { unique: true }],
  ['defectos', { fecha: -1 }],
  ['defectos', { trabajoId: 1 }],
  ['avances', { fecha: -1 }],
  ['trabajos', { estado: 1, orden: 1 }],
  ['auditoria', { fecha: -1 }],
  // Para contar intentos fallidos de ingreso y registros por IP sin recorrer toda la colección
  ['auditoria', { accion: 1, fecha: -1 }],
];

async function crearIndices(db) {
  const resultados = await Promise.allSettled(
    INDICES.map(([col, claves, opciones]) => db.collection(col).createIndex(claves, opciones)),
  );
  for (const r of resultados) {
    if (r.status !== 'rejected') continue;
    const e = traducirErrorMongo(r.reason, cfg);
    if (['DB_MAYUSCULAS', 'PERMISO', 'AUTH'].includes(e.codigo)) throw e;
    console.error('[db] no se pudo crear un índice (se continúa):', r.reason);
  }
}

async function conectar() {
  const problema = validarConfig(cfg);
  if (problema) throw problema;
  if (cfg.usaMemoria) return new MemDb();

  let cliente;
  try {
    cliente = new MongoClient(cfg.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      appName: 'twoglass-registro',
    });
    await cliente.connect();
    const db = cliente.db(cfg.nombreDb);
    await crearIndices(db);
    return db;
  } catch (e) {
    console.error(`[db] no se pudo conectar (variable ${cfg.origen}, base ${cfg.nombreDb}):`, e);
    await cliente?.close().catch(() => {});
    throw traducirErrorMongo(e, cfg);
  }
}

export async function getDb() {
  if (!promesa) {
    promesa = conectar().catch((e) => {
      promesa = undefined;
      globalThis.__tgDbPromesa = undefined;
      throw e;
    });
    globalThis.__tgDbPromesa = promesa;
  }
  return promesa;
}

export function nuevoId() {
  // Id legible y único (texto), igual en MongoDB y en modo memoria
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}${r}`;
}
