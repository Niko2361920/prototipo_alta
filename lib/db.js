// Conexión a la base de datos. En Vercel usa MongoDB Atlas (MONGODB_URI).
// Para probar en un computador sin MongoDB: MONGODB_URI=memoria
import 'server-only';
import { MongoClient } from 'mongodb';
import { MemDb } from './memdb';

const uri = process.env.MONGODB_URI || '';
const nombreDb = process.env.MONGODB_DB || 'twoglass';

export const usaMemoria = !uri || uri === 'memoria';

let promesa = globalThis.__tgDbPromesa;

async function conectar() {
  if (usaMemoria) {
    if (process.env.VERCEL) {
      throw new Error('Falta la variable MONGODB_URI en Vercel (Settings → Environment Variables).');
    }
    return new MemDb();
  }
  const cliente = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
  await cliente.connect();
  const db = cliente.db(nombreDb);
  // Índices para que las consultas sigan rápidas con el tiempo
  await Promise.all([
    db.collection('usuarios').createIndex({ usuario: 1 }, { unique: true }),
    db.collection('defectos').createIndex({ fecha: -1 }),
    db.collection('defectos').createIndex({ trabajoId: 1 }),
    db.collection('avances').createIndex({ fecha: -1 }),
    db.collection('trabajos').createIndex({ estado: 1, orden: 1 }),
    db.collection('auditoria').createIndex({ fecha: -1 }),
  ]).catch(() => {});
  return db;
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
