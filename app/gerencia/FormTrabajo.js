'use client';
// Crear o editar un trabajo: datos del pedido, boceto y vista previa de lo que falló en trabajos parecidos.
import { useEffect, useRef, useState } from 'react';
import { Icono, Icono6M } from '@/components/Iconos';
import { api, Modal, n, pct, prepararImagen, estadoDefectos } from '@/components/ui';
import { MATERIALES, FORMAS, TECNICAS, TIPOS_TINTA, ESTADOS } from '@/lib/catalogo';
import { colorTinta } from '@/lib/colores';

const VACIO = {
  cliente: '', producto: '', material: 'Vidrio', forma: 'Cilíndrico', relieve: false, tecnica: 'serigrafia',
  tintaTipo: 'UV', tintaColor: '', colores: 1, unidades: 200, mermaMax: 5, fechaEntrega: '', notas: '',
};

export default function FormTrabajo({ trabajo, onCerrar, onGuardado, avisar }) {
  const editando = Boolean(trabajo);
  const [f, setF] = useState(() => (trabajo ? { ...VACIO, ...trabajo } : VACIO));
  const [boceto, setBoceto] = useState(null);
  const [parecidos, setParecidos] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [error, setError] = useState('');
  const archivo = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });

  // Vista previa de trabajos parecidos (se recalcula al cambiar material, tinta, envase o cliente)
  const clave = [f.material, f.tintaTipo, f.tintaColor, f.forma, f.relieve, f.tecnica, f.cliente].join('|');
  useEffect(() => {
    const t = setTimeout(() => {
      api('/api/parecidos', { method: 'POST', body: { ...f, _id: trabajo?._id } }).then(setParecidos).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  async function elegirBoceto(e) {
    try {
      const dataUrl = await prepararImagen(e.target.files?.[0]);
      setBoceto(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function guardar(e) {
    e?.preventDefault();
    setError('');
    if (!f.cliente.trim() || !f.producto.trim()) { setError('Escribe el cliente y el envase.'); return; }
    setGuardando(true);
    try {
      const cuerpo = { ...f, colores: Number(f.colores), unidades: Number(f.unidades), mermaMax: Number(f.mermaMax) };
      const r = editando
        ? await api(`/api/trabajos/${trabajo._id}`, { method: 'PATCH', body: cuerpo })
        : await api('/api/trabajos', { method: 'POST', body: cuerpo });
      if (boceto) await api(`/api/trabajos/${r.trabajo._id}/boceto`, { method: 'PUT', body: { dataUrl: boceto } });
      avisar(editando ? `${r.trabajo.codigo} actualizado.` : `${r.trabajo.codigo} creado y en la cola.`);
      onGuardado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  async function borrar() {
    try {
      await api(`/api/trabajos/${trabajo._id}`, { method: 'DELETE' });
      avisar(`${trabajo.codigo} borrado.`);
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  const producidas = (trabajo?.buenas || 0) + (trabajo?.defectos || 0);
  const pDef = producidas ? trabajo.defectos / producidas : null;
  const est = estadoDefectos(pDef, trabajo?.mermaMax || 5);
  const imgActual = boceto || (trabajo?.tieneBoceto ? `/api/trabajos/${trabajo._id}/boceto?v=${trabajo.bocetoVersion || 1}` : null);
  const color = colorTinta(f.tintaColor);

  return (
    <Modal
      titulo={editando ? `${trabajo.codigo} · ${trabajo.cliente}` : 'Nuevo trabajo'}
      onCerrar={onCerrar}
      ancho={980}
      pie={
        <>
          {editando && !confirmarBorrar && <button className="btn fantasma" style={{ marginRight: 'auto', color: 'var(--critico)' }} onClick={() => setConfirmarBorrar(true)}><Icono.basura tam={18} />Borrar</button>}
          {confirmarBorrar && (
            <span style={{ marginRight: 'auto', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <b style={{ color: 'var(--critico)' }}>¿Borrar el trabajo y sus registros?</b>
              <button className="btn peligro chico" onClick={borrar}>Sí, borrar</button>
              <button className="btn sec chico" onClick={() => setConfirmarBorrar(false)}>No</button>
            </span>
          )}
          <button className="btn sec" onClick={onCerrar}>Cancelar</button>
          <button className="btn" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear trabajo'}</button>
        </>
      }
    >
      {editando && (
        <div className="kpis" style={{ marginBottom: '1.2rem' }}>
          <div className="kpi"><span>Buenas</span><strong className="num">{n(trabajo.buenas)}</strong><small>de {n(trabajo.unidades)}</small></div>
          <div className="kpi"><span>Defectos</span><strong className="num">{n(trabajo.defectos)}</strong><small className={`estado ${est.clase}`}><est.Ico tam={14} />{pct(pDef)}</small></div>
          <label className="campo" style={{ gridColumn: 'span 2' }}>
            <span>Estado</span>
            <select className="entrada" value={f.estado} onChange={set('estado')}>
              {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <label className="check" style={{ minHeight: 0 }}>
              <input type="checkbox" checked={Boolean(f.pruebaAprobada)} onChange={set('pruebaAprobada')} />Prueba de impresión aprobada
            </label>
          </label>
        </div>
      )}

      <form onSubmit={guardar} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.2rem' }} className="form-trabajo">
        <div className="form-rejilla">
          <label className="campo"><span>Cliente</span><input className="entrada" value={f.cliente} onChange={set('cliente')} required placeholder="Ej.: Laboratorio …" /></label>
          <label className="campo"><span>Envase</span><input className="entrada" value={f.producto} onChange={set('producto')} required placeholder="Ej.: Pharma Amber 700 ml" /></label>
          <label className="campo"><span>Material</span>
            <select className="entrada" value={f.material} onChange={set('material')}>{MATERIALES.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="campo"><span>Forma</span>
            <select className="entrada" value={f.forma} onChange={set('forma')}>{FORMAS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <div className="campo"><span>Técnica</span>
            <div className="segmento" role="group" aria-label="Técnica">
              {TECNICAS.map((t) => <button type="button" key={t.id} aria-pressed={f.tecnica === t.id} onClick={() => set('tecnica')(t.id)}>{t.nombre}</button>)}
            </div>
            <small>{TECNICAS.find((t) => t.id === f.tecnica)?.maquina}</small>
          </div>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={f.relieve} onChange={set('relieve')} />El envase tiene relieve</label>
          <label className="campo"><span>Tipo de tinta</span>
            <select className="entrada" value={f.tintaTipo} onChange={set('tintaTipo')}>{TIPOS_TINTA.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="campo"><span>Color de tinta {color && <span className="swatch" style={{ background: color, verticalAlign: '-2px', marginLeft: 4 }} />}</span>
            <input className="entrada" value={f.tintaColor} onChange={set('tintaColor')} list="colores-tinta" placeholder="Blanco, negro, dorado…" />
            <datalist id="colores-tinta">{['Blanco', 'Negro', 'Dorado', 'Plateado', 'Rojo', 'Azul', 'Verde'].map((c) => <option key={c} value={c} />)}</datalist></label>
          <label className="campo"><span>Número de colores</span><input className="entrada" type="number" min="1" max="6" value={f.colores} onChange={set('colores')} /></label>
          <label className="campo"><span>Unidades pedidas</span><input className="entrada" type="number" min="1" value={f.unidades} onChange={set('unidades')} /></label>
          <label className="campo"><span>Merma máxima (%)</span><input className="entrada" type="number" min="1" max="20" value={f.mermaMax} onChange={set('mermaMax')} /><small>Meta de la empresa: 1 % a 5 %.</small></label>
          <label className="campo"><span>Fecha de entrega</span><input className="entrada" type="date" value={f.fechaEntrega || ''} onChange={set('fechaEntrega')} /></label>
          <label className="campo ancho"><span>Indicaciones para producción (salen en la pantalla del televisor)</span>
            <textarea className="entrada" value={f.notas} onChange={set('notas')} placeholder="Ej.: el cliente aprobó la prueba; revisar alineación cada 20 piezas." /></label>
        </div>

        <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
          <div className="campo">
            <span>Boceto (lo ve producción en grande)</span>
            <button type="button" className="subida" onClick={() => archivo.current?.click()}>
              {imgActual ? <img src={imgActual} alt="Boceto del trabajo" /> : <><Icono.imagen tam={36} /><b>Subir imagen del boceto</b><small>JPG, PNG o SVG · se reduce sola</small></>}
            </button>
            <input ref={archivo} type="file" accept="image/*" hidden onChange={elegirBoceto} />
            {imgActual && <button type="button" className="btn sec chico" onClick={() => archivo.current?.click()}><Icono.imagen tam={16} />Cambiar boceto</button>}
          </div>

          <div className="panel-parecidos" aria-live="polite">
            <h4><Icono.alerta tam={18} />Lo que falló en trabajos parecidos</h4>
            {!parecidos && <small>Calculando…</small>}
            {parecidos && !parecidos.causas.length && <small>No hay trabajos parecidos con defectos registrados todavía.</small>}
            {parecidos?.causas?.slice(0, 3).map((c) => {
              const I = Icono6M[c.categoria];
              return (
                <div key={c.causa} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: '.2rem .5rem', alignItems: 'start' }}>
                  {I ? <I tam={20} /> : <span />}
                  <div><b style={{ fontSize: '.92rem' }}>{c.nombre}</b><p style={{ fontSize: '.82rem', color: 'var(--tinta-2)' }}>{c.consejo}</p></div>
                  <b className="num" style={{ color: '#9a3a12' }}>{c.cantidad}×</b>
                </div>
              );
            })}
            {parecidos?.totalParecidos > 0 && (
              <small style={{ color: 'var(--tinta-2)' }}>
                Basado en {parecidos.totalParecidos} trabajo{parecidos.totalParecidos > 1 ? 's' : ''} anterior{parecidos.totalParecidos > 1 ? 'es' : ''} con {[...new Set(parecidos.parecidos.flatMap((p) => p.razones))].slice(0, 3).join(', ').toLowerCase()}. Producción verá estas alertas al empezar.
              </small>
            )}
          </div>
        </div>
        {error && <p className="error-form" style={{ gridColumn: '1 / -1' }}><Icono.alerta tam={18} />{error}</p>}
      </form>
      <style>{`@media (max-width: 760px) { .form-trabajo { grid-template-columns: 1fr !important; } }`}</style>
    </Modal>
  );
}
