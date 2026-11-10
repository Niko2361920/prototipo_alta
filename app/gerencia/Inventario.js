'use client';
// Inventario: qué hay para trabajar, si alcanza para la cola y lo que se descontó solo.
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { api, useDatos, useAviso, Modal, n, fecha } from '@/components/ui';
import { INSUMOS } from '@/lib/catalogo';
import FormMateria from '@/components/FormMateria';

const ESTADOS = {
  falta: { texto: 'No alcanza', clase: 'critico' },
  bajo: { texto: 'Queda poco', clase: 'naranja' },
  ok: { texto: 'Alcanza', clase: 'bien' },
};
const ESTADO_TRABAJO = { en_proceso: 'En producción', pausado: 'Pausado', pendiente: 'En cola' };
const coma = (x) => String(x).replace('.', ',');
const cant = (x, u) => (x == null ? '—' : `${n(x)} ${u}`);

export default function Inventario() {
  const { datos, error, recargar } = useDatos('/api/inventario', 60000);
  const [aviso, avisar] = useAviso();
  const [registrar, setRegistrar] = useState(null);
  const [ajustes, setAjustes] = useState(false);
  const [corregir, setCorregir] = useState(null);
  const r = datos?.resumen;
  const problemas = (r?.faltan || 0) + (r?.trabajosSinMaterial || 0) + (r?.trabajosSinEnvases || 0);

  return (
    <>
      <div className="ger-cab">
        <div>
          <h1><span className="trazo">Inventario</span></h1>
          <p>Qué hay para trabajar y si alcanza para lo que está en cola. Al terminar un trabajo, lo gastado se descuenta solo.</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setRegistrar({})} disabled={!datos}><Icono.mas tam={18} />Registrar entrada</button>
          <button className="btn sec" onClick={() => setAjustes(true)} disabled={!datos}><Icono.lapiz tam={18} />Ajustes</button>
        </div>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      {datos && (
        <section className={`aviso-inventario ${problemas ? 'mal' : r.bajos ? 'medio' : 'bien'}`} role="status">
          {problemas || r.bajos ? <Icono.alerta tam={22} /> : <Icono.checkCirculo tam={22} />}
          <div>
            {!problemas && !r.bajos && <b>Hay material para todo lo que está en cola.</b>}
            {r.trabajosSinMaterial > 0 && <b>{r.trabajosSinMaterial} {r.trabajosSinMaterial === 1 ? 'trabajo no tiene' : 'trabajos no tienen'} material suficiente. </b>}
            {r.trabajosSinEnvases > 0 && <b>{r.trabajosSinEnvases} {r.trabajosSinEnvases === 1 ? 'trabajo espera' : 'trabajos esperan'} envases del cliente. </b>}
            {r.bajos > 0 && <span>{r.bajos} {r.bajos === 1 ? 'material quedará' : 'materiales quedarán'} por debajo del mínimo.</span>}
          </div>
        </section>
      )}

      <section className="tarjeta" style={{ padding: 0, marginTop: '1rem' }}>
        <h2 className="tarjeta-titulo">Materiales</h2>
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr><th>Material</th><th className="der">Hay</th><th className="der">La cola necesita</th><th className="der">Queda después</th><th className="der">Mínimo</th><th className="der">Dura</th><th>Estado</th><th><span className="sr">Acciones</span></th></tr>
            </thead>
            <tbody>
              {(datos?.materiales || []).map((m) => {
                const e = ESTADOS[m.estado];
                return (
                  <tr key={m.clave}>
                    <td><b>{m.nombre}</b>{m.color && <div className="color-tinta">{m.color}</div>}{m.hay < 0 && <div className="texto-critico" style={{ fontSize: '.8rem' }}>Se gastó más de lo que entró: falta registrar alguna compra</div>}</td>
                    <td className="der num"><b>{cant(m.hay, m.unidad)}</b></td>
                    <td className="der num">{m.necesita ? cant(m.necesita, m.unidad) : '—'}</td>
                    <td className={`der num ${m.queda < 0 ? 'texto-critico' : ''}`}>{m.necesita ? cant(m.queda, m.unidad) : '—'}</td>
                    <td className="der num">{m.minimo ? cant(m.minimo, m.unidad) : '—'}</td>
                    <td className="der num">{m.dias != null ? `${n(m.dias)} días` : '—'}</td>
                    <td><span className={`chip ${e.clase}`}>{e.texto}</span></td>
                    <td><button className="btn fantasma chico" onClick={() => setRegistrar({ insumo: m.insumo, color: m.color === 'Sin color' ? '' : m.color })} aria-label={`Registrar entrada de ${m.nombre} ${m.color}`}><Icono.mas tam={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="vacio-texto" style={{ padding: '0 1rem 1rem' }}>
          «La cola necesita» incluye lo que falta de los trabajos en producción y en cola, con su merma permitida. «Dura» se calcula con lo que se gastó en los últimos 30 días.
        </p>
      </section>

      <section style={{ marginTop: '1.2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '.6rem' }}>¿Alcanza para la cola?</h2>
        {!datos?.trabajos?.length ? <p className="vacio-texto">No hay trabajos en producción ni en cola.</p> : (
          <div className="cola-inventario">
            {datos.trabajos.map((t) => {
              const ok = !t.faltantes.length && !t.envases.falta;
              return (
                <article key={t._id} className={`tarjeta trabajo-inv ${ok ? '' : 'falta'}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'start' }}>
                    <div>
                      <b>{t.codigo}</b> <span className="chip">{ESTADO_TRABAJO[t.estado]}</span>
                      <div style={{ color: 'var(--tinta-2)', fontSize: '.88rem' }}>{t.cliente} · {t.producto}</div>
                    </div>
                    {ok ? <span className="chip bien">Listo</span> : <span className="chip critico">Falta</span>}
                  </div>
                  <p className="vacio-texto">
                    Faltan {n(t.piezas)} piezas por estampar (con {t.mermaMax} % de merma) · tinta {t.tintaTipo} {t.tintaColor || ''} · {t.colores} {t.colores === 1 ? 'color' : 'colores'}
                  </p>
                  <ul className="lista-nec">
                    {t.necesidades.map((x) => {
                      const f = t.faltantes.find((y) => y.nombre === x.nombre);
                      return (
                        <li key={x.nombre} className={f ? 'texto-critico' : ''}>
                          <span>{x.nombre}</span>
                          <span className="num">{cant(x.cantidad, x.unidad)}{f && <b> · faltan {cant(f.falta, f.unidad)}</b>}</span>
                        </li>
                      );
                    })}
                    <li className={t.envases.falta ? 'texto-critico' : ''}>
                      <span>Envases del cliente</span>
                      <span className="num">
                        {n(t.envases.recibidos)} de {n(t.envases.necesarios)} recibidos
                        {t.envases.falta > 0 && <b> · faltan {n(t.envases.falta)}</b>}
                      </span>
                    </li>
                  </ul>
                  {t.envases.falta > 0 && (
                    <button className="btn sec chico" onClick={() => setRegistrar({ insumo: 'envases', trabajoId: t._id })}>
                      <Icono.mas tam={16} />Llegaron envases
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="tarjeta" style={{ padding: 0, marginTop: '1.2rem' }}>
        <h2 className="tarjeta-titulo">Tinta descontada sola</h2>
        {!datos?.recientes?.length ? <p className="vacio-texto" style={{ padding: '0 1rem 1rem' }}>Cuando se termine un trabajo, aquí aparece la tinta que se descontó.</p> : (
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Trabajo</th><th>Tinta</th><th className="der">Descontado</th><th>Cómo se calculó</th><th><span className="sr">Acciones</span></th></tr></thead>
              <tbody>
                {datos.recientes.map((m) => (
                  <tr key={m._id}>
                    <td><b>{m.codigo}</b><div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{m.cliente} · {fecha(m.fecha)}</div></td>
                    <td>{INSUMOS.find((i) => i.id === m.insumo)?.nombre} · {m.color}</td>
                    <td className="der num"><b>{cant(m.cantidad, m.unidad)}</b>{m.corregido && <div><span className="chip bien">medido</span></div>}</td>
                    <td style={{ color: 'var(--tinta-2)', fontSize: '.85rem' }}>{m.nota}</td>
                    <td><button className="btn sec chico" onClick={() => setCorregir(m)}>Corregir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="vacio-texto" style={{ padding: '0 1rem 1rem' }}>
          Si pesan el tarro antes y después del trabajo, usen «Corregir» con lo que se gastó de verdad. La app ajusta los gramos por pieza y el siguiente cálculo sale más cerca.
        </p>
      </section>
      {datos?.hayDatosPrueba && <p className="vacio-texto">Incluye datos de prueba.</p>}

      {registrar && (
        <FormMateria opciones={datos?.opcionesTrabajo || []} colores={datos?.colores || []} unidades={datos?.unidades || {}} inicial={registrar}
          cerrar={() => setRegistrar(null)}
          listo={(m) => { setRegistrar(null); avisar(`Registrado: ${n(m.cantidad)} ${m.unidad}.`); recargar(); }} />
      )}
      {ajustes && datos && (
        <Ajustes datos={datos} cerrar={() => setAjustes(false)} listo={() => { setAjustes(false); avisar('Ajustes guardados.'); recargar(); }} />
      )}
      {corregir && (
        <Corregir mov={corregir} cerrar={() => setCorregir(null)}
          listo={(x) => { setCorregir(null); avisar(x.nuevaTasa ? `Corregido. Ahora se calculan ${n(x.nuevaTasa)} por pieza.` : 'Corregido.'); recargar(); }} />
      )}
      {aviso}
    </>
  );
}

function Corregir({ mov, cerrar, listo }) {
  const chica = mov.unidad === 'kg' ? 'g' : mov.unidad === 'L' ? 'ml' : mov.unidad;
  const [valor, setValor] = useState('');
  const [unidad, setUnidad] = useState(chica);
  const [error, setError] = useState('');
  async function guardar(e) {
    e.preventDefault();
    try {
      listo(await api('/api/inventario', { method: 'POST', body: { id: mov._id, cantidad: valor, unidad } }));
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal titulo={`Tinta que se gastó en ${mov.codigo}`} onCerrar={cerrar} ancho={460}>
      <form onSubmit={guardar} style={{ display: 'grid', gap: '1rem' }}>
        <p style={{ margin: 0 }}>La app calculó <b>{n(mov.cantidad)} {mov.unidad}</b> ({mov.piezas} piezas × {mov.colores} {mov.colores === 1 ? 'color' : 'colores'}).</p>
        <div className="campo">
          <label htmlFor="real">Lo que se gastó de verdad</label>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <input id="real" className="entrada" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus placeholder="Ej.: 420" style={{ flex: 1 }} />
            <select className="entrada" value={unidad} onChange={(e) => setUnidad(e.target.value)} style={{ width: 'auto' }} aria-label="Unidad">
              {[chica, mov.unidad].filter((u, i, a) => a.indexOf(u) === i).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn sec" onClick={cerrar}>Cancelar</button>
          <button className="btn">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function Ajustes({ datos, cerrar, listo }) {
  const aj = datos.ajustes;
  const tintas = INSUMOS.filter((i) => i.grupo === 'tinta');
  const [f, setF] = useState(() => ({
    unidades: Object.fromEntries(tintas.map((t) => [t.id, datos.unidades[t.id]])),
    porPieza: Object.fromEntries(tintas.map((t) => [t.id, coma(aj.porPieza[t.id] ?? 1.5)])),
    minimos: Object.fromEntries(datos.materiales.map((m) => [m.clave, m.minimo ? coma(m.minimo) : ''])),
    catalizadorPct: coma(aj.catalizadorPct),
    primeMlPorPieza: coma(aj.primeMlPorPieza),
    diluyenteLPorTrabajo: coma(aj.diluyenteLPorTrabajo),
  }));
  const [error, setError] = useState('');
  const sub = (grupo, k) => (e) => setF({ ...f, [grupo]: { ...f[grupo], [k]: e.target.value } });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/api/inventario', { method: 'PUT', body: f });
      listo();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal titulo="Ajustes del inventario" onCerrar={cerrar} ancho={640}>
      <form onSubmit={guardar} style={{ display: 'grid', gap: '1.2rem' }}>
        <div>
          <h3 className="reporte-h3">Tintas: unidad y gasto por pieza</h3>
          <p className="vacio-texto" style={{ marginTop: 0 }}>Gasto por cada color y cada pieza. Empieza en 1,5 (supuesto del equipo) y se ajusta solo cuando corrigen un trabajo con lo medido.</p>
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Tinta</th><th>Se mide en</th><th>Gasto por pieza</th></tr></thead>
              <tbody>
                {tintas.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td>
                      <select className="entrada" value={f.unidades[t.id]} onChange={sub('unidades', t.id)} aria-label={`Unidad de ${t.nombre}`}>
                        <option value="kg">kg (peso)</option><option value="L">L (volumen)</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        <input className="entrada" inputMode="decimal" value={f.porPieza[t.id]} onChange={sub('porPieza', t.id)} style={{ width: 90 }} aria-label={`Gasto por pieza de ${t.nombre}`} />
                        <span>{f.unidades[t.id] === 'L' ? 'ml' : 'g'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="form-rejilla">
          <label className="campo"><span>Catalizador (% de la tinta catalizada)</span><input className="entrada" inputMode="decimal" value={f.catalizadorPct} onChange={set('catalizadorPct')} /></label>
          <label className="campo"><span>PRIME por pieza PET (ml)</span><input className="entrada" inputMode="decimal" value={f.primeMlPorPieza} onChange={set('primeMlPorPieza')} /></label>
          <label className="campo"><span>Diluyente por trabajo (L)</span><input className="entrada" inputMode="decimal" value={f.diluyenteLPorTrabajo} onChange={set('diluyenteLPorTrabajo')} /></label>
        </div>
        <div>
          <h3 className="reporte-h3">Mínimos (avisa cuando quede menos)</h3>
          <div className="minimos">
            {datos.materiales.map((m) => (
              <label key={m.clave} className="campo">
                <span>{m.nombre}{m.color ? ` · ${m.color}` : ''} ({m.unidad})</span>
                <input className="entrada" inputMode="decimal" value={f.minimos[m.clave] ?? ''} onChange={sub('minimos', m.clave)} placeholder="Sin mínimo" />
              </label>
            ))}
          </div>
        </div>
        {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn sec" onClick={cerrar}>Cancelar</button>
          <button className="btn">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
