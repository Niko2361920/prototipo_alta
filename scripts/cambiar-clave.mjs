// Cambia la contraseña de un usuario (por si alguien la olvida).
// Uso, desde la carpeta del proyecto y con la cadena de MongoDB en .env.local:
//   node --env-file=.env.local scripts/cambiar-clave.mjs diego NuevaClave123
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const [usuario, clave] = process.argv.slice(2);
if (!usuario || !clave || clave.length < 6) {
  console.log('Uso: node --env-file=.env.local scripts/cambiar-clave.mjs <usuario> <contraseña de 6 o más caracteres>');
  process.exit(1);
}
// Quita espacios y comillas como lib/mongo-config.js. No se importa ese archivo
// porque es .js con sintaxis ESM en un paquete sin "type": "module", y en Node 18/20
// eso puede fallar al correr el script suelto.
const limpiar = (v) => (v || '').trim().replace(/^(["'])(.*)\1$/, '$2').trim();
const cfg = { uri: limpiar(process.env.MONGODB_URI), nombreDb: limpiar(process.env.MONGODB_DB) || 'twoglass' };
if (!cfg.uri || cfg.uri === 'memoria') {
  console.log('Falta MONGODB_URI en .env.local');
  process.exit(1);
}
const cliente = new MongoClient(cfg.uri);
await cliente.connect();
const db = cliente.db(cfg.nombreDb);
const r = await db.collection('usuarios').updateOne(
  { usuario: usuario.toLowerCase() },
  { $set: { hash: await bcrypt.hash(clave, 10) } },
);
console.log(r.matchedCount ? `Listo: se cambió la contraseña de ${usuario}.` : `No existe el usuario ${usuario}.`);
await cliente.close();
