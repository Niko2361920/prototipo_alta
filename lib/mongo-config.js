// Lectura de la configuración de MongoDB y traducción de errores del driver.
//
// Por qué existe: en Vercel el driver solo dice cosas como "Server selection
// timed out" o "bad auth", y la página mostraba "No hay conexión con la base de
// datos" sin decir por qué. Aquí se clasifica el error en la causa probable y
// en qué hacer, con un mensaje que se puede mostrar en el navegador.
//
// Regla: el mensaje público nunca incluye la cadena de conexión, el usuario ni
// el host del cluster. El error original completo solo va a los logs (console.error
// en lib/db.js), que en Vercel se ven en Deployments → Functions/Logs.
//
// Sin 'server-only' a propósito: no contiene secretos y así lo pueden usar
// también los scripts de la carpeta scripts/ y las pruebas.

const NOMBRE_DB_DEFECTO = 'twoglass';

// Quita espacios y comillas que se cuelan al pegar el valor en Vercel o en
// .env.local (p. ej. "mongodb+srv://..."). Con comillas el driver falla con
// MongoParseError y el mensaje no lo deja claro.
export function limpiarValor(v) {
  let s = typeof v === 'string' ? v.trim() : '';
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

// MONGODB_URI tiene prioridad. Si no está, se acepta una variable terminada en
// _MONGODB_URI: al conectar una base desde Vercel (Storage / Marketplace) se
// puede elegir un prefijo y la variable queda, p. ej., como STORAGE_MONGODB_URI
// (comportamiento de Vercel no verificado en esta cuenta; por eso solo es respaldo).
export function leerConfigMongo(env = process.env) {
  let origen = 'MONGODB_URI';
  let uri = limpiarValor(env.MONGODB_URI);
  if (!uri) {
    const alterna = Object.keys(env).filter((k) => k.endsWith('_MONGODB_URI') && limpiarValor(env[k])).sort()[0];
    if (alterna) {
      origen = alterna;
      uri = limpiarValor(env[alterna]);
    }
  }
  const nombreDb = limpiarValor(env.MONGODB_DB) || NOMBRE_DB_DEFECTO;
  return {
    uri,
    origen: uri ? origen : null,
    nombreDb,
    usaMemoria: !uri || uri === 'memoria',
    enVercel: Boolean(env.VERCEL),
  };
}

export class ErrorBD extends Error {
  constructor(codigo, mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorBD';
    this.codigo = codigo;
    if (causa) this.cause = causa;
  }
}

// Revisión antes de conectar: errores que se pueden detectar sin red.
export function validarConfig(cfg) {
  if (cfg.usaMemoria) {
    if (cfg.enVercel) {
      return new ErrorBD('SIN_URI',
        'Falta la variable MONGODB_URI en Vercel. Agrégala en Settings → Environment Variables (marca Production) y vuelve a desplegar: las variables nuevas solo aplican en un despliegue nuevo.');
    }
    return null;
  }
  if (!/^mongodb(\+srv)?:\/\//.test(cfg.uri)) {
    return new ErrorBD('URI_FORMATO',
      `La variable ${cfg.origen} no empieza por mongodb+srv:// ni mongodb://. Copia la cadena de Atlas (Connect → Drivers → Node.js) sin comillas ni espacios.`);
  }
  if (/[<>]/.test(cfg.uri)) {
    return new ErrorBD('URI_MARCADOR',
      `La variable ${cfg.origen} todavía tiene un marcador como <db_password>. Reemplázalo por la contraseña real del usuario (sin los signos < >).`);
  }
  // Reglas de nombres de MongoDB: sin / \ . espacio " $ y menos de 64 caracteres
  if (!/^[^/\\. "$]{1,63}$/.test(cfg.nombreDb)) {
    return new ErrorBD('DB_NOMBRE',
      `MONGODB_DB («${cfg.nombreDb}») no es un nombre de base válido. Usa solo letras, números, guion o guion bajo, p. ej. twoglass.`);
  }
  return null;
}

// Junta el texto del error y de sus causas internas (el driver anida el motivo
// real dentro de MongoServerSelectionError.reason y de error.cause).
function textoCompleto(e, profundidad = 0) {
  if (!e || profundidad > 4) return '';
  const partes = [String(e.message || ''), String(e.code || ''), String(e.codeName || '')];
  if (e.cause) partes.push(textoCompleto(e.cause, profundidad + 1));
  const servidores = e.reason?.servers;
  if (servidores && typeof servidores.values === 'function') {
    for (const s of servidores.values()) if (s?.error) partes.push(textoCompleto(s.error, profundidad + 1));
  }
  return partes.join(' | ');
}

export function traducirErrorMongo(e, cfg = {}) {
  if (e instanceof ErrorBD) return e;
  const t = textoCompleto(e);
  const db = cfg.nombreDb || NOMBRE_DB_DEFECTO;

  // El orden importa: un error de mayúsculas o de clave es más específico que uno de red.
  if (e?.code === 13297 || /DatabaseDifferCase|different case/i.test(t)) {
    const m = /already have: \[([^\]]+)\] trying to create \[([^\]]+)\]/.exec(t);
    const existe = m ? m[1] : 'otro nombre';
    return new ErrorBD('DB_MAYUSCULAS',
      `En el cluster ya existe la base «${existe}», que solo se diferencia de «${db}» en mayúsculas, y MongoDB no permite las dos. ` +
      `Opción A: borra «${existe}» en Atlas/Compass. Opción B: pon MONGODB_DB=${existe} en Vercel. Luego vuelve a desplegar.`, e);
  }
  if (e?.name === 'MongoParseError' || e?.name === 'MongoInvalidArgumentError' || /URI malformed|Invalid scheme|Password contains unescaped|Username contains unescaped|URI must include hostname/i.test(t)) {
    return new ErrorBD('URI_INVALIDA',
      `La cadena de ${cfg.origen || 'MONGODB_URI'} está mal escrita. Si la contraseña tiene símbolos (@ : / ? # [ ] %), cámbiala en Atlas por una solo con letras y números, o codifícala. Pega la cadena sin comillas ni espacios.`, e);
  }
  if ([18, 8000].includes(e?.code) || /bad auth|Authentication failed|AuthenticationFailed/i.test(t)) {
    return new ErrorBD('AUTH',
      'Atlas rechazó el usuario o la contraseña de la cadena. Revisa en Database Access que el usuario exista y que la contraseña sea la actual; si la cambiaste, actualízala también en Vercel y vuelve a desplegar.', e);
  }
  if (e?.code === 13 || /not authorized|Unauthorized/i.test(t)) {
    return new ErrorBD('PERMISO',
      `El usuario de la cadena no tiene permiso sobre la base «${db}». En Database Access dale el rol readWrite sobre «${db}» (el nombre debe coincidir con MONGODB_DB, mayúsculas incluidas).`, e);
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN|ENODATA|getaddrinfo/i.test(t)) {
    return new ErrorBD('DNS',
      'No se encontró el cluster de la cadena. Revisa que el host (cluster0.xxxxx.mongodb.net) esté bien copiado y que el cluster no esté pausado ni eliminado.', e);
  }
  if (e?.name === 'MongoServerSelectionError' || e?.name === 'MongoNetworkError' || e?.name === 'MongoNetworkTimeoutError' ||
      /Server selection timed out|ECONNREFUSED|ECONNRESET|ETIMEDOUT|tlsv1 alert|SSL routines|socket|connection .* closed/i.test(t)) {
    return new ErrorBD('RED',
      'No se pudo llegar al cluster de Atlas. Lo más común: en Network Access falta 0.0.0.0/0 (Vercel no tiene IP fija). También pasa si el cluster está pausado.', e);
  }
  return new ErrorBD('DESCONOCIDO',
    `Error de base de datos (${e?.name || 'Error'}${e?.code ? ` ${e.code}` : ''}). El detalle está en los logs de Vercel (Deployments → Logs).`, e);
}

// Mensaje seguro para mostrar al usuario a partir de cualquier error.
// - ErrorBD o errores marcados `publico` (p. ej. falta SESSION_SECRET): su mensaje.
// - Errores del driver de MongoDB: se traducen.
// - Cualquier otro: mensaje genérico (podría contener datos internos).
export function mensajePublico(e) {
  if (e instanceof ErrorBD || e?.publico) return e.message;
  if (/^Mongo/.test(e?.name || '') || typeof e?.code === 'number') return traducirErrorMongo(e).message;
  return 'Algo salió mal en el servidor. El detalle está en los logs de Vercel (Deployments → Logs).';
}
