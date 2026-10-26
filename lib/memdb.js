// Base de datos en memoria SOLO para probar en un computador sin MongoDB
// (MONGODB_URI=memoria). Imita la parte del driver oficial que usa la app.
// Guarda una copia en .data/memdb.json para no perder los datos al reiniciar.
// En Vercel siempre se usa MongoDB Atlas.
import { Query } from 'mingo';
import fs from 'node:fs';
import path from 'node:path';

const ARCHIVO = path.join(process.cwd(), '.data', 'memdb.json');

function reviver(_k, v) {
  if (v && typeof v === 'object' && v.$fecha) return new Date(v.$fecha);
  return v;
}
function replacer(_k, v) {
  return v;
}
function serializar(data) {
  // Las fechas se guardan como {$fecha: ISO} para recuperarlas como Date
  const conv = (x) => {
    if (x instanceof Date) return { $fecha: x.toISOString() };
    if (Array.isArray(x)) return x.map(conv);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, conv(v)]));
    return x;
  };
  return JSON.stringify(conv(data), replacer);
}

const clonar = (x) => structuredClone(x);

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, p, val) {
  const ks = p.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = val;
}
function unsetPath(obj, p) {
  const ks = p.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    o = o?.[ks[i]];
    if (o == null) return;
  }
  delete o[ks[ks.length - 1]];
}

function aplicarUpdate(doc, update, insertando = false) {
  for (const [op, campos] of Object.entries(update)) {
    for (const [k, v] of Object.entries(campos)) {
      if (op === '$set') setPath(doc, k, clonar(v));
      else if (op === '$setOnInsert') { if (insertando) setPath(doc, k, clonar(v)); }
      else if (op === '$inc') setPath(doc, k, (getPath(doc, k) || 0) + v);
      else if (op === '$unset') unsetPath(doc, k);
      else if (op === '$push') {
        const arr = getPath(doc, k) || [];
        arr.push(clonar(v));
        setPath(doc, k, arr);
      } else throw new Error(`memdb: operador no soportado ${op}`);
    }
  }
  return doc;
}

function ordenar(docs, sort) {
  const claves = Object.entries(sort || {});
  if (!claves.length) return docs;
  return docs.sort((a, b) => {
    for (const [k, dir] of claves) {
      const va = getPath(a, k);
      const vb = getPath(b, k);
      if (va == null && vb == null) continue;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      const x = va instanceof Date ? va.getTime() : va;
      const y = vb instanceof Date ? vb.getTime() : vb;
      if (x < y) return -1 * dir;
      if (x > y) return 1 * dir;
    }
    return 0;
  });
}

function proyectar(doc, projection) {
  if (!projection || !Object.keys(projection).length) return doc;
  const incluye = Object.values(projection).some((v) => v === 1 || v === true);
  if (incluye) {
    const out = { _id: doc._id };
    for (const [k, v] of Object.entries(projection)) if (v) setPath(out, k, getPath(doc, k));
    if (projection._id === 0) delete out._id;
    return out;
  }
  const out = clonar(doc);
  for (const [k, v] of Object.entries(projection)) if (!v) unsetPath(out, k);
  return out;
}

class Cursor {
  constructor(docs, opts = {}) {
    this.docs = docs;
    this._sort = opts.sort;
    this._limit = opts.limit;
    this._skip = opts.skip;
    this._proj = opts.projection;
  }
  sort(s) { this._sort = s; return this; }
  limit(n) { this._limit = n; return this; }
  skip(n) { this._skip = n; return this; }
  project(p) { this._proj = p; return this; }
  async toArray() {
    let r = ordenar(this.docs.map(clonar), this._sort);
    if (this._skip) r = r.slice(this._skip);
    if (this._limit) r = r.slice(0, this._limit);
    return r.map((d) => proyectar(d, this._proj));
  }
}

class Coleccion {
  constructor(db, nombre) {
    this.db = db;
    this.nombre = nombre;
  }
  get datos() {
    if (!this.db.data[this.nombre]) this.db.data[this.nombre] = [];
    return this.db.data[this.nombre];
  }
  filtrar(filtro = {}) {
    const q = new Query(filtro);
    return this.datos.filter((d) => q.test(d));
  }
  find(filtro = {}, opciones = {}) { return new Cursor(this.filtrar(filtro), opciones); }
  async findOne(filtro = {}, opciones = {}) {
    const r = await this.find(filtro, opciones).limit(1).toArray();
    return r[0] || null;
  }
  async countDocuments(filtro = {}) { return this.filtrar(filtro).length; }
  async insertOne(doc) {
    // code 11000 igual que el driver real: las rutas lo usan para responder 409
    if (doc._id != null && this.datos.some((d) => d._id === doc._id)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    this.datos.push(clonar(doc));
    this.db.guardar();
    return { acknowledged: true, insertedId: doc._id };
  }
  async insertMany(docs) {
    for (const d of docs) {
      if (d._id != null && this.datos.some((x) => x._id === d._id)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    }
    for (const d of docs) this.datos.push(clonar(d));
    this.db.guardar();
    return { acknowledged: true, insertedCount: docs.length };
  }
  async updateOne(filtro, update, opciones = {}) {
    const doc = this.filtrar(filtro)[0];
    if (!doc) {
      if (opciones.upsert) {
        const nuevo = {};
        for (const [k, v] of Object.entries(filtro)) if (!k.startsWith('$') && (typeof v !== 'object' || v instanceof Date)) setPath(nuevo, k, v);
        aplicarUpdate(nuevo, update, true);
        this.datos.push(nuevo);
        this.db.guardar();
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }
    aplicarUpdate(doc, update);
    this.db.guardar();
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(filtro, update) {
    const docs = this.filtrar(filtro);
    docs.forEach((d) => aplicarUpdate(d, update));
    this.db.guardar();
    return { matchedCount: docs.length, modifiedCount: docs.length };
  }
  async deleteOne(filtro) {
    const doc = this.filtrar(filtro)[0];
    if (!doc) return { deletedCount: 0 };
    this.db.data[this.nombre] = this.datos.filter((d) => d !== doc);
    this.db.guardar();
    return { deletedCount: 1 };
  }
  async deleteMany(filtro = {}) {
    const borrar = new Set(this.filtrar(filtro));
    this.db.data[this.nombre] = this.datos.filter((d) => !borrar.has(d));
    this.db.guardar();
    return { deletedCount: borrar.size };
  }
  async createIndex() { return 'ok'; }
}

export class MemDb {
  constructor() {
    this.data = {};
    try {
      if (fs.existsSync(ARCHIVO)) this.data = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'), reviver);
    } catch {
      this.data = {};
    }
    this._t = null;
  }
  collection(nombre) { return new Coleccion(this, nombre); }
  guardar() {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
        fs.writeFileSync(ARCHIVO, serializar(this.data));
      } catch {
        /* sin disco: queda solo en memoria */
      }
    }, 150);
  }
}
