'use client';
// PRODUCCIÓN · pensada para el portátil conectado por HDMI al televisor del taller.
// Se lee de lejos, se actualiza sola cada 12 s y se maneja con mouse, pantalla táctil o teclado (1–6).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import { Icono, Icono6M } from '@/components/Iconos';
import { api, useDatos, n, pct, hora, quien, estadoDefectos } from '@/components/ui';
import { CATEGORIAS, causasDe, causaPorId, categoriaPorId, tecnicaPorId, USUARIOS_BASE } from '@/lib/catalogo';
import { colorTinta } from '@/lib/colores';

const OPERARIOS = USUARIOS_BASE.filter((u) => u.rol === 'produccion');

function Reloj() {
  const [ahora, setAhora] = useState(null);
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  if (!ahora) return <span className="tv-reloj">&nbsp;</span>;
  return (
    <span className="tv-reloj" aria-label="Hora">
      {ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })}
    </span>
  );
}

export default function Produccion() {
  const { datos, error, recargar } = useDatos('/api/produccion', 12000);
  const [yo, setYo] = useState(null);
  const [operario, setOperario] = useState('diego');
  const [categoria, setCategoria] = useState(null);
  const [confirmado, setConfirmado] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [otraCantidad, setOtraCantidad] = useState(false);
  const [terminar, setTerminar] = useState(false);
  const tConf = useRef();
  const tMsg = useRef();

  useEffect(() => {
    api('/api/auth/yo').then((s) => {
      setYo(s);
      let guardado = null;
      try { guardado = localStorage.getItem('tg_operario'); } catch {}
      setOperario(guardado || (s.rol === 'produccion' ? s.usuario : 'diego'));
    }).catch(() => {});
  }, []);

  const elegirOperario = (u) => {
    setOperario(u);
    try { localStorage.setItem('tg_operario', u); } catch {}
  };

  const avisar = useCallback((texto, tipo = 'ok') => {
    clearTimeout(tMsg.current);
    setMensaje({ texto, tipo });
    tMsg.current = setTimeout(() => setMensaje(null), 3500);
  }, []);

  const actual = datos?.actual;

  async function registrar(causa) {
    if (!actual) return;
    setCategoria(null);
    try {
      const { defecto } = await api('/api/defectos', { method: 'POST', body: { trabajoId: actual._id, causa, cantidad: 1, operario } });
      clearTimeout(tConf.current);
      setConfirmado(defecto);
      tConf.current = setTimeout(() => setConfirmado(null), 14000);
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  async function ajustar(cambios) {
    if (!confirmado) return;
    const nuevo = { ...confirmado, ...cambios };
    setConfirmado(nuevo);
    clearTimeout(tConf.current);
    tConf.current = setTimeout(() => setConfirmado(null), 14000);
    try {
      await api(`/api/defectos/${confirmado._id}`, { method: 'PATCH', body: cambios });
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  async function deshacer() {
    if (!confirmado) return;
    const id = confirmado._id;
    setConfirmado(null);
    try {
      await api(`/api/defectos/${id}`, { method: 'DELETE' });
      avisar('Registro borrado.');
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  async function sumar(cantidad) {
    if (!actual) return;
    try {
      const { trabajo } = await api(`/api/trabajos/${actual._id}/avance`, { method: 'POST', body: { cantidad, operario } });
      const diferencia = (trabajo.buenas || 0) - (actual.buenas || 0);
      if (diferencia < 0) avisar(`${n(-diferencia)} buenas descontadas.`);
      else if (cantidad < 0 && diferencia === 0) avisar('El avance ya está en 0; no se descontaron unidades.');
      else avisar(`+${n(diferencia)} buenas registradas.`);
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  async function cambiarTrabajo(id, cambios, texto) {
    try {
      await api(`/api/trabajos/${id}`, { method: 'PATCH', body: cambios });
      if (texto) avisar(texto);
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  // Atajos de teclado: 1–6 abre la categoría; dentro, 1–n elige la causa; Esc cierra; + / − ajustan la cantidad
  useEffect(() => {
    const f = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'Escape') { setCategoria(null); setOtraCantidad(false); setTerminar(false); return; }
      if (!actual) return;
      if (categoria) {
        const lista = causasDe(categoria);
        const i = Number(e.key) - 1;
        if (i >= 0 && i < lista.length) registrar(lista[i].id);
        return;
      }
      if (confirmado && (e.key === '+' || e.key === '=')) { ajustar({ cantidad: confirmado.cantidad + 1 }); return; }
      if (confirmado && e.key === '-' && confirmado.cantidad > 1) { ajustar({ cantidad: confirmado.cantidad - 1 }); return; }
      const cat = CATEGORIAS.find((c) => c.tecla === e.key);
      if (cat) setCategoria(cat.id);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  const pantallaCompleta = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const salir = async () => {
    await fetch('/api/auth/salir', { method: 'POST' });
    window.location.href = '/';
  };

  const hoy = datos?.hoy;
  const estadoHoy = estadoDefectos(hoy?.pctDefectos);

  return (
    <div className="tv">
      <header className="tv-cab">
        <span className="logo-blanco"><Logo alto={46} /></span>
        <span className="sticker">Producción</span>
        <Reloj />
        <div className="tv-hoy" aria-label="Resumen de hoy">
          <div><small>Hoy buenas</small><b>{n(hoy?.buenas)}</b></div>
          <div><small>Defectos</small><b>{n(hoy?.totalDefectos)}</b></div>
          <div>
            <small>% defectos</small>
            <b className={`tv-estado-${estadoHoy.clase === 'critico' ? 'mal' : estadoHoy.clase || 'bien'}`}>{pct(hoy?.pctDefectos)}</b>
          </div>
        </div>
        <div className="tv-quien" role="group" aria-label="¿Quién registra?">
          <span>Registra</span>
          {OPERARIOS.map((u) => (
            <button key={u.usuario} aria-pressed={operario === u.usuario} onClick={() => elegirOperario(u.usuario)}>{u.corto}</button>
          ))}
        </div>
        <button className="tv-btn" onClick={pantallaCompleta} aria-label="Pantalla completa"><Icono.expandir tam={20} /></button>
        {yo?.rol === 'gerente' && <a className="tv-btn" href="/gerencia">Gerencia</a>}
        <button className="tv-btn" onClick={salir} aria-label="Salir"><Icono.salir tam={20} /></button>
      </header>

      {error && !datos && <div className="tv-vacio" role="alert">No hay conexión: {error}. Se vuelve a intentar sola.</div>}
      {!datos && !error && <div className="tv-vacio">Cargando…</div>}

      {datos && !actual && <SinTrabajo datos={datos} iniciar={(t) => cambiarTrabajo(t._id, { estado: 'en_proceso' }, `Empezó ${t.codigo}.`)} />}

      {datos && actual && (
        <>
          <main className="tv-cuerpo">
            <PanelBoceto t={actual} aprobar={(v) => cambiarTrabajo(actual._id, { pruebaAprobada: v }, v ? 'Prueba de impresión aprobada.' : null)} />
            <PanelTrabajo
              t={actual} registros={datos.registros} otros={datos.otrosEnProceso}
              sumar={sumar} otraCantidad={otraCantidad} setOtraCantidad={setOtraCantidad}
              pausar={() => cambiarTrabajo(actual._id, { estado: 'pausado' }, `${actual.codigo} quedó en pausa.`)}
              terminar={() => setTerminar(true)}
            />
            <PanelAlertas p={datos.parecidos} cola={datos.cola} />
          </main>

          <nav className="tv-6m" aria-label="Registrar defecto por categoría 6M">
            <div className="tv-6m-titulo">
              <b>Registrar defecto</b>
              <small>Toca la categoría · o teclas 1–6</small>
            </div>
            {CATEGORIAS.map((c) => {
              const I = Icono6M[c.id];
              return (
                <button key={c.id} className="tv-cat" onClick={() => setCategoria(c.id)}>
                  <span className="ico"><I tam={26} /></span>
                  <span>{c.nombre}</span>
                  <kbd>{c.tecla}</kbd>
                </button>
              );
            })}
          </nav>
        </>
      )}

      {categoria && actual && (
        <ElegirCausa categoria={categoria} cerrar={() => setCategoria(null)} elegir={registrar} operario={operario} />
      )}

      {confirmado && (
        <div className="tv-confirmacion" role="status" aria-live="polite">
          <span className="ok-ico"><Icono.check tam={20} /></span>
          <div>
            <b>{causaPorId[confirmado.causa]?.nombre}</b>
            <div style={{ fontSize: '.8em', color: 'var(--gris)' }}>{quien(confirmado.operario)} · {categoriaPorId[confirmado.categoria]?.nombre}</div>
          </div>
          <div className="cant" aria-label="Cantidad de piezas">
            <button onClick={() => confirmado.cantidad > 1 && ajustar({ cantidad: confirmado.cantidad - 1 })} aria-label="Una menos"><Icono.menos tam={18} /></button>
            <b className="num">{confirmado.cantidad}</b>
            <button onClick={() => ajustar({ cantidad: confirmado.cantidad + 1 })} aria-label="Una más"><Icono.mas tam={18} /></button>
          </div>
          <div className="acc" role="group" aria-label="Qué se hizo con la pieza">
            <button aria-pressed={confirmado.accion !== 'descarte'} onClick={() => ajustar({ accion: 'reproceso' })}>Reproceso</button>
            <button aria-pressed={confirmado.accion === 'descarte'} onClick={() => ajustar({ accion: 'descarte' })}>Descarte</button>
          </div>
          <button className="btn sec" onClick={deshacer}><Icono.deshacer tam={16} />Deshacer</button>
          <button className="btn" onClick={() => setConfirmado(null)}>Listo</button>
        </div>
      )}

      {terminar && actual && (
        <div className="tv-velo" onMouseDown={(e) => e.target === e.currentTarget && setTerminar(false)}>
          <div className="tv-hoja" role="dialog" aria-modal="true" style={{ width: 'min(40em, 94vw)' }}>
            <div className="tv-hoja-cab"><span className="ico"><Icono.bandera tam={26} /></span><h2>¿Terminar {actual.codigo}?</h2></div>
            <p style={{ fontSize: '1.1em' }}>
              Quedan registradas <b>{n(actual.buenas)}</b> buenas y <b>{n(actual.defectos)}</b> defectos de {n(actual.unidades)} pedidas.
            </p>
            <div style={{ display: 'flex', gap: '.6em', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="tv-btn" onClick={() => setTerminar(false)}>Cancelar</button>
              <button className="tv-btn primario" onClick={() => { setTerminar(false); cambiarTrabajo(actual._id, { estado: 'terminado' }, `${actual.codigo} terminado.`); }}>
                <Icono.check tam={20} />Sí, terminar
              </button>
            </div>
          </div>
        </div>
      )}

      {mensaje && <div className={`toast ${mensaje.tipo === 'error' ? 'error' : ''}`} role="status">{mensaje.texto}</div>}
    </div>
  );
}

function PanelBoceto({ t, aprobar }) {
  return (
    <section className="tv-panel" aria-label="Boceto">
      <div className="tv-etq"><Icono.imagen tam={18} />Boceto aprobado por el cliente</div>
      <div className="tv-boceto">
        {t.tieneBoceto
          ? <img src={`/api/trabajos/${t._id}/boceto?v=${t.bocetoVersion || 1}`} alt={`Boceto del trabajo ${t.codigo}`} />
          : <div className="sin"><Icono.imagen tam={48} /><p>Gerencia todavía no ha subido el boceto.</p></div>}
      </div>
      {t.pruebaAprobada ? (
        <div className="tv-prueba ok"><span style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}><Icono.checkCirculo tam={22} />Prueba de impresión aprobada</span>
          <button className="tv-btn" onClick={() => aprobar(false)} style={{ fontSize: '.8em' }}>Quitar</button></div>
      ) : (
        <div className="tv-prueba no"><span style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}><Icono.alerta tam={22} />Falta la prueba de impresión</span>
          <button className="tv-btn primario" onClick={() => aprobar(true)}>Marcar aprobada</button></div>
      )}
    </section>
  );
}

function PanelTrabajo({ t, registros, otros, sumar, otraCantidad, setOtraCantidad, pausar, terminar }) {
  const [valor, setValor] = useState('');
  const producidas = (t.buenas || 0) + (t.defectos || 0);
  const pDef = producidas ? (t.defectos || 0) / producidas : null;
  const est = estadoDefectos(pDef, t.mermaMax || 5);
  const color = colorTinta(t.tintaColor);
  const okAncho = Math.min(100, ((t.buenas || 0) / Math.max(1, t.unidades)) * 100);
  const malAncho = Math.min(100 - okAncho, ((t.defectos || 0) / Math.max(1, t.unidades)) * 100);
  const faltan = Math.max(0, t.unidades - (t.buenas || 0));

  return (
    <section className="tv-panel desliza" aria-label="Trabajo en producción">
      <div className="tv-codigo">
        <span className="cod">{t.codigo}</span>
        <span className="chip" style={{ background: 'var(--menta)', color: '#111' }}><Icono.play tam={12} />En producción desde {t.iniciado ? hora(t.iniciado) : '—'}</span>
        {t.prueba && <span className="chip prueba">Datos de prueba</span>}
        {otros?.length > 0 && <span className="chip naranja">+{otros.length} en producción</span>}
      </div>
      <div>
        <h1 className="tv-cliente">{t.cliente}</h1>
        <p className="tv-producto">{t.producto}</p>
      </div>
      <div className="tv-specs">
        <div className="tv-spec"><small>Material</small><b>{t.material}</b></div>
        <div className="tv-spec"><small>Forma</small><b>{t.forma}{t.relieve ? ' · con relieve' : ''}</b></div>
        <div className="tv-spec"><small>Técnica · máquina</small><b>{tecnicaPorId[t.tecnica]?.nombre} · {t.maquina?.replace(/^(Serigrafía|Tampografía) /, '')}</b></div>
        <div className="tv-spec"><small>Tinta</small><b>{color && <span className="swatch" style={{ background: color }} />}{t.tintaTipo} {t.tintaColor}</b></div>
        <div className="tv-spec"><small>Colores</small><b>{t.colores}</b></div>
        <div className="tv-spec"><small>Merma máxima</small><b>{t.mermaMax || 5} %</b></div>
      </div>

      <div className="tv-avance">
        <div className="tv-avance-num">
          <b>{n(t.buenas)}</b><span>de {n(t.unidades)} buenas · faltan {n(faltan)}</span>
        </div>
        <div className="tv-barra" role="img" aria-label={`${n(t.buenas)} buenas y ${n(t.defectos)} defectos de ${n(t.unidades)}`}>
          <i className="ok" style={{ width: `${okAncho}%` }} /><i className="mal" style={{ width: `${malAncho}%` }} />
        </div>
        <div className="tv-avance-pie">
          <span className={`estado tv-estado-${est.clase === 'critico' ? 'mal' : est.clase || 'bien'}`}>
            <est.Ico tam={20} />{n(t.defectos)} defectos · {pct(pDef)} · {est.texto}
          </span>
          <div className="tv-sumar">
            <button className="tv-btn" onClick={() => sumar(-10)} disabled={!t.buenas} aria-label="Reducir 10 unidades buenas" title="Reducir 10 unidades buenas">−10</button>
            {[10, 25, 50].map((x) => <button key={x} className="tv-btn" onClick={() => sumar(x)}>+{x}</button>)}
            {!otraCantidad && <button className="tv-btn" onClick={() => setOtraCantidad(true)}>Otra</button>}
            {otraCantidad && (
              <form onSubmit={(e) => { e.preventDefault(); const v = Number(valor); if (v) sumar(v); setValor(''); setOtraCantidad(false); }} style={{ display: 'flex', gap: '.4em' }}>
                <input className="entrada" autoFocus type="number" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="+ / −" style={{ width: '6em', minHeight: '2.6em' }} aria-label="Cantidad de buenas (usa un número negativo para reducir)" title="Usa un número negativo para reducir el avance" />
                <button className="tv-btn primario">{Number(valor) < 0 ? 'Restar' : 'Sumar'}</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {t.notas && <div className="tv-notas"><small>Indicaciones de gerencia</small>{t.notas}</div>}

      <div style={{ display: 'flex', gap: '.6em', flexWrap: 'wrap' }}>
        <button className="tv-btn" onClick={pausar}><Icono.pausa tam={18} />Pausar</button>
        <button className="tv-btn primario" onClick={terminar}><Icono.bandera tam={18} />Terminar trabajo</button>
      </div>

      {registros?.length > 0 && (
        <div>
          <div className="tv-etq" style={{ marginBottom: '.4em' }}><Icono.registros tam={16} />Últimos registros de este trabajo</div>
          <div className="tv-registros">
            {registros.slice(0, 3).map((r) => (
              <div key={r._id}><b>{causaPorId[r.causa]?.corto} ×{r.cantidad}</b><span>{quien(r.operario)} · {hora(r.fecha)}</span></div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PanelAlertas({ p, cola }) {
  return (
    <section className="tv-panel desliza" aria-label="Errores anteriores en trabajos parecidos">
      <div className="tv-alerta-cab">
        <span className="ico"><Icono.alerta tam={24} /></span>
        <div>
          <h2>Ojo: lo que falló antes</h2>
          <p>{p?.totalParecidos ? `En ${p.totalParecidos} trabajo${p.totalParecidos > 1 ? 's' : ''} parecido${p.totalParecidos > 1 ? 's' : ''} (mismo material, tinta o envase)` : 'Comparando con trabajos anteriores'}</p>
        </div>
      </div>
      {!p?.causas?.length && <div className="tv-vacio">No hay registros de trabajos parecidos todavía. Lo que registren hoy servirá para el próximo.</div>}
      {p?.causas?.length > 0 && (
        <div className="tv-causas">
          {p.causas.slice(0, 3).map((c) => {
            const I = Icono6M[c.categoria] || Icono.alerta;
            return (
              <div className="tv-causa" key={c.causa}>
                <span className="ico"><I tam={22} /></span>
                <b>{c.nombre}</b>
                <span className="veces num" title="Piezas afectadas en trabajos parecidos">{c.cantidad}×</span>
                <p><Icono.bombillo tam={14} /> {c.consejo}</p>
              </div>
            );
          })}
        </div>
      )}
      {p?.parecidos?.length > 0 && (
        <div className="tv-razones" aria-label="Por qué se parecen">
          {[...new Set(p.parecidos.flatMap((x) => x.razones))].slice(0, 5).map((r) => <span key={r}>{r}</span>)}
        </div>
      )}
      {cola?.length > 0 && (
        <div style={{ marginTop: 'auto' }}>
          <div className="tv-etq" style={{ marginBottom: '.4em' }}><Icono.trabajos tam={16} />Sigue en la cola</div>
          <div className="tv-cola">
            {cola.slice(0, 3).map((t, i) => (
              <div className="tv-cola-item" key={t._id}>
                <span className="n">{i + 1}</span>
                <div><b>{t.cliente}</b><small>{t.codigo} · {t.producto} · {n(t.unidades)} u.</small></div>
                {t.aviso ? <span className="aviso">Ojo: {t.aviso.causa}</span> : <span />}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ElegirCausa({ categoria, cerrar, elegir, operario }) {
  const c = categoriaPorId[categoria];
  const lista = useMemo(() => causasDe(categoria), [categoria]);
  const I = Icono6M[categoria];
  return (
    <div className="tv-velo" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="tv-hoja" role="dialog" aria-modal="true" aria-label={`Causas de ${c.nombre}`}>
        <div className="tv-hoja-cab">
          <span className="ico"><I tam={28} /></span>
          <div style={{ flex: 1 }}>
            <h2>{c.nombre}: ¿qué pasó?</h2>
            <p style={{ color: '#b8c3ca' }}>Registra {quien(operario)} · 1 pieza (después puedes cambiar la cantidad)</p>
          </div>
          <button className="tv-btn" onClick={cerrar} aria-label="Cerrar"><Icono.x tam={22} /></button>
        </div>
        <div className="tv-opciones">
          {lista.map((x, i) => (
            <button key={x.id} className="tv-opcion" onClick={() => elegir(x.id)} autoFocus={i === 0}>
              <kbd>{i + 1}</kbd>
              <span>{x.nombre}</span>
              {x.marca === 'prioritaria' ? <small>Causa prioritaria</small> : <small style={{ color: '#9fb0ba' }}>{x.marca === 'hipotesis' ? 'Por validar' : ' '}</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SinTrabajo({ datos, iniciar }) {
  const lista = [...(datos.pausados || []), ...(datos.cola || [])];
  return (
    <main className="tv-sin-trabajo">
      <span className="sticker">Sin trabajo en producción</span>
      <h1>¿Qué trabajo empezamos?</h1>
      {!lista.length && <p style={{ color: '#b8c3ca', fontSize: '1.2em' }}>No hay trabajos en la cola. Gerencia los crea desde su panel.</p>}
      <div className="tv-lista-iniciar">
        {lista.map((t, i) => (
          <div className="tv-cola-item" key={t._id}>
            <span className="n">{i + 1}</span>
            <div>
              <b>{t.cliente} · {t.producto}</b>
              <small>{t.codigo} · {t.material} · tinta {t.tintaTipo} {t.tintaColor} · {n(t.unidades)} u.{t.estado === 'pausado' ? ' · en pausa' : ''}</small>
              {t.aviso && <span className="aviso">Ojo: en trabajos parecidos falló «{t.aviso.causa}»</span>}
            </div>
            <button className="tv-btn primario" onClick={() => iniciar(t)}><Icono.play tam={18} />{t.estado === 'pausado' ? 'Reanudar' : 'Empezar'}</button>
          </div>
        ))}
      </div>
    </main>
  );
}
