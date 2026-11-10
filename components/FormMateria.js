'use client';
// Formulario para registrar materia prima (lo usan Inventario y el Reporte del mes).
import { useState } from 'react';
import { Icono } from './Iconos';
import { api, Modal } from './ui';
import { INSUMOS, insumoPorId, TINTA_DE_TIPO } from '@/lib/catalogo';

// Unidades que se pueden escribir según la unidad base del material
const FAMILIAS = { kg: ['kg', 'g'], g: ['kg', 'g'], L: ['L', 'ml'], ml: ['L', 'ml'], 'unid.': ['unid.'] };
const COLORES = ['Blanco', 'Negro', 'Dorado', 'Plateado', 'Rojo', 'Azul', 'Verde'];
const hoyBogota = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

export default function FormMateria({ opciones = [], clientes = [], colores = [], unidades = {}, inicial = {}, cerrar, listo }) {
  const base = (id) => unidades[id] || insumoPorId[id]?.unidad || 'unid.';
  const [f, setF] = useState(() => {
    const insumo = inicial.insumo || 'envases';
    return { tipo: 'entrada', insumo, cantidad: '', unidad: base(insumo), color: '', trabajoId: '', cliente: '', fecha: hoyBogota(), nota: '', ...inicial };
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const insumo = insumoPorId[f.insumo];
  const esTinta = insumo.grupo === 'tinta';
  const trabajo = opciones.find((t) => t._id === f.trabajoId);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const elegirInsumo = (e) => setF({ ...f, insumo: e.target.value, unidad: base(e.target.value) });
  const elegirTrabajo = (e) => {
    const t = opciones.find((x) => x._id === e.target.value);
    const nuevo = { ...f, trabajoId: e.target.value };
    // Si se está registrando tinta, se pone la tinta y el color del trabajo
    if (t && esTinta && TINTA_DE_TIPO[t.tintaTipo]) {
      nuevo.insumo = TINTA_DE_TIPO[t.tintaTipo];
      nuevo.unidad = base(nuevo.insumo);
    }
    setF(nuevo);
  };
  const elegirTipo = (tipo) => {
    const insumoNuevo = tipo === 'consumo' && f.insumo === 'envases' ? 'tinta_uv' : f.insumo;
    setF({ ...f, tipo, insumo: insumoNuevo, unidad: base(insumoNuevo) });
  };

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { movimiento } = await api('/api/materia', { method: 'POST', body: { ...f, color: trabajo && esTinta ? '' : f.color } });
      listo(movimiento);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Registrar materia prima" onCerrar={cerrar} ancho={580}>
      <form onSubmit={guardar} style={{ display: 'grid', gap: '1rem' }}>
        <div className="segmento" role="group" aria-label="Tipo de movimiento">
          <button type="button" aria-pressed={f.tipo === 'entrada'} onClick={() => elegirTipo('entrada')}>Entrada (llegó o se compró)</button>
          <button type="button" aria-pressed={f.tipo === 'consumo'} onClick={() => elegirTipo('consumo')}>Consumo (se gastó)</button>
        </div>
        {f.tipo === 'consumo' && (
          <p className="vacio-texto" style={{ margin: 0 }}>
            Al terminar un trabajo, la app ya descuenta sola la tinta, las planchas, el PRIME y el diluyente. Usa esto para gastos que no son de un trabajo (pruebas, limpieza general, tinta que se dañó).
          </p>
        )}
        <div className="form-rejilla">
          <label className="campo">
            <span>Material</span>
            <select className="entrada" value={f.insumo} onChange={elegirInsumo}>
              {INSUMOS.filter((i) => f.tipo === 'entrada' || i.grupo !== 'envases').map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </label>
          <div className="campo">
            <label htmlFor="mp-cant">Cantidad</label>
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <input id="mp-cant" className="entrada" inputMode="decimal" value={f.cantidad} onChange={set('cantidad')} required
                placeholder={f.unidad === 'unid.' ? 'Ej.: 300' : f.unidad === 'g' || f.unidad === 'ml' ? 'Ej.: 350' : 'Ej.: 1,5'} style={{ flex: 1, minWidth: 0 }} />
              {FAMILIAS[base(f.insumo)].length > 1 && (
                <select className="entrada" value={f.unidad} onChange={set('unidad')} aria-label="Unidad" style={{ width: 'auto' }}>
                  {FAMILIAS[base(f.insumo)].map((u) => <option key={u}>{u}</option>)}
                </select>
              )}
              {FAMILIAS[base(f.insumo)].length === 1 && <span style={{ alignSelf: 'center', fontWeight: 700 }}>{f.unidad}</span>}
            </div>
          </div>
          <label className="campo">
            <span>Trabajo {insumo.grupo === 'envases' ? '' : '(opcional)'}</span>
            <select className="entrada" value={f.trabajoId} onChange={elegirTrabajo}>
              <option value="">{insumo.grupo === 'envases' ? 'Sin trabajo todavía' : 'General (no es de un trabajo)'}</option>
              {opciones.map((t) => <option key={t._id} value={t._id}>{t.codigo} · {t.cliente} · {t.producto}</option>)}
            </select>
          </label>
          {esTinta && (trabajo ? (
            <div className="campo"><span>Color</span><p style={{ margin: '.55rem 0 0', fontWeight: 700 }}>{trabajo.tintaColor || 'Sin color'} (el del trabajo)</p></div>
          ) : (
            <label className="campo">
              <span>Color de la tinta</span>
              <input className="entrada" value={f.color} onChange={set('color')} list="mp-colores" maxLength={40} required placeholder="Blanco, negro, dorado…" />
              <datalist id="mp-colores">{[...new Set([...colores, ...COLORES])].map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          ))}
          {!esTinta && (!trabajo ? (
            <label className="campo">
              <span>Cliente {insumo.grupo === 'envases' ? '' : '(opcional)'}</span>
              <input className="entrada" value={f.cliente} onChange={set('cliente')} list="mp-clientes" maxLength={80} required={insumo.grupo === 'envases'} />
              <datalist id="mp-clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          ) : (
            <div className="campo"><span>Cliente</span><p style={{ margin: '.55rem 0 0', fontWeight: 700 }}>{trabajo.cliente}</p></div>
          ))}
          <label className="campo">
            <span>Fecha</span>
            <input className="entrada" type="date" value={f.fecha} max={hoyBogota()} onChange={set('fecha')} required />
          </label>
          <label className="campo">
            <span>Nota (opcional)</span>
            <input className="entrada" value={f.nota} onChange={set('nota')} maxLength={200} placeholder={f.tipo === 'entrada' ? 'Ej.: factura 123, proveedor…' : 'Ej.: se dañó un tarro'} />
          </label>
        </div>
        {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn sec" onClick={cerrar}>Cancelar</button>
          <button className="btn" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
