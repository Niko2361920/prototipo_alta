'use client';
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { api, useDatos, useAviso, n, pct, fecha, estadoDefectos } from '@/components/ui';
import { tecnicaPorId } from '@/lib/catalogo';
import FormTrabajo from './FormTrabajo';

function Ficha({ t, onAbrir, mover, primero, ultimo }) {
  const producidas = (t.buenas || 0) + (t.defectos || 0);
  const pDef = producidas ? t.defectos / producidas : null;
  const est = estadoDefectos(pDef, t.mermaMax || 5);
  const avance = Math.min(100, ((t.buenas || 0) / Math.max(1, t.unidades)) * 100);
  return (
    <div className="ficha" role="button" tabIndex={0} onClick={() => onAbrir(t)} onKeyDown={(e) => e.key === 'Enter' && onAbrir(t)}>
      <div className="miniatura">
        {t.tieneBoceto ? <img src={`/api/trabajos/${t._id}/boceto?v=${t.bocetoVersion || 1}`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icono.imagen tam={22} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <span className="meta" style={{ fontWeight: 700 }}>{t.codigo}{t.estado === 'pausado' ? ' · En pausa' : ''}{t.prueba ? ' · prueba' : ''}</span>
        <b>{t.cliente}</b>
        <span className="meta">{t.producto} · {n(t.unidades)} u.</span>
        <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', margin: '.4rem 0' }}>
          <span className="chip gris">{t.material}</span>
          <span className="chip gris">{tecnicaPorId[t.tecnica]?.nombre}</span>
          <span className="chip gris">Tinta {t.tintaTipo.replace(/ \(.+\)/, '')}{t.tintaColor ? ` ${t.tintaColor}` : ''}</span>
          {!t.pruebaAprobada && t.estado !== 'terminado' && <span className="chip naranja">Sin prueba aprobada</span>}
        </div>
        {t.estado !== 'pendiente' && <div className="barra" aria-label={`Avance ${Math.round(avance)} %`}><i style={{ width: `${avance}%` }} /></div>}
        <div className="ficha-pie">
          {t.estado === 'pendiente'
            ? <span className="meta">{t.fechaEntrega ? `Entrega ${fecha(`${t.fechaEntrega}T12:00:00-05:00`)}` : 'Sin fecha de entrega'}</span>
            : <span className={`estado ${est.clase}`}><est.Ico tam={14} />{n(t.defectos)} def. · {pct(pDef)}</span>}
          {mover && (
            <span className="orden-btns" onClick={(e) => e.stopPropagation()}>
              <button className="btn sec icono chico" disabled={primero} onClick={() => mover(t, 'arriba')} aria-label="Subir en la cola"><Icono.arriba tam={16} /></button>
              <button className="btn sec icono chico" disabled={ultimo} onClick={() => mover(t, 'abajo')} aria-label="Bajar en la cola"><Icono.abajo tam={16} /></button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Trabajos() {
  const { datos, error, recargar } = useDatos('/api/trabajos', 20000);
  const [abierto, setAbierto] = useState(null);
  const [aviso, avisar] = useAviso();
  const [verTodos, setVerTodos] = useState(false);
  const lista = datos?.trabajos || [];
  const enProceso = lista.filter((t) => t.estado === 'en_proceso' || t.estado === 'pausado');
  const cola = lista.filter((t) => t.estado === 'pendiente').sort((a, b) => a.orden - b.orden);
  const terminados = lista.filter((t) => t.estado === 'terminado').sort((a, b) => new Date(b.terminado) - new Date(a.terminado));

  async function mover(t, direccion) {
    try {
      await api(`/api/trabajos/${t._id}/mover`, { method: 'POST', body: { direccion } });
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  return (
    <>
      <div className="ger-cab">
        <div>
          <h1><span className="trazo">Trabajos</span></h1>
          <p>Crea el pedido con su boceto; producción lo ve en el televisor en el orden de la cola.</p>
        </div>
        <button className="btn" onClick={() => setAbierto('nuevo')}><Icono.mas tam={18} />Nuevo trabajo</button>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      <div className="tablero">
        <section className="columna" aria-label="En producción">
          <h3>En producción <span className="chip">{enProceso.length}</span></h3>
          {!enProceso.length && <p className="meta" style={{ padding: '.3rem', color: 'var(--gris)' }}>Nada en producción ahora.</p>}
          {enProceso.map((t) => <Ficha key={t._id} t={t} onAbrir={setAbierto} />)}
        </section>
        <section className="columna" aria-label="En cola">
          <h3>En cola <span className="chip">{cola.length}</span></h3>
          {!cola.length && <p className="meta" style={{ padding: '.3rem', color: 'var(--gris)' }}>La cola está vacía.</p>}
          {cola.map((t, i) => <Ficha key={t._id} t={t} onAbrir={setAbierto} mover={mover} primero={i === 0} ultimo={i === cola.length - 1} />)}
        </section>
        <section className="columna" aria-label="Terminados">
          <h3>Terminados <span className="chip">{terminados.length}</span></h3>
          {(verTodos ? terminados : terminados.slice(0, 6)).map((t) => <Ficha key={t._id} t={t} onAbrir={setAbierto} />)}
          {terminados.length > 6 && (
            <button className="btn sec chico" onClick={() => setVerTodos(!verTodos)}>{verTodos ? 'Ver menos' : `Ver los ${terminados.length}`}</button>
          )}
        </section>
      </div>

      {abierto && (
        <FormTrabajo
          trabajo={abierto === 'nuevo' ? null : abierto}
          onCerrar={() => setAbierto(null)}
          onGuardado={() => { setAbierto(null); recargar(); }}
          avisar={avisar}
        />
      )}
      {aviso}
    </>
  );
}
