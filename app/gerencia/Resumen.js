'use client';
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { Pareto, ParetoTabla, BarrasCategoria, Tendencia } from '@/components/Graficos';
import { api, useDatos, useAviso, Modal, n, pct, estadoDefectos } from '@/components/ui';
import { PERIODOS } from '@/lib/fechas';
import { MATERIALES, META_MERMA } from '@/lib/catalogo';

function saludo() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }));
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Resumen({ nombre, ir }) {
  const [periodo, setPeriodo] = useState('30d');
  const [material, setMaterial] = useState('');
  const [tecnica, setTecnica] = useState('');
  const [vista, setVista] = useState('grafico');
  const [borrar, setBorrar] = useState(false);
  const [aviso, avisar] = useAviso();
  const url = `/api/resumen?periodo=${periodo}&material=${encodeURIComponent(material)}&tecnica=${tecnica}`;
  const { datos, error, recargar } = useDatos(url, 30000);
  const k = datos?.indicadores;
  const est = estadoDefectos(k?.pctDefectos, META_MERMA);
  const top = datos?.pareto?.slice(0, 3) || [];
  const topPct = top.length ? top[top.length - 1].acumulado : 0;
  const nombrePeriodo = PERIODOS.find((p) => p.id === periodo)?.nombre.toLowerCase();

  async function borrarPrueba() {
    setBorrar(false);
    try {
      const r = await api('/api/prueba', { method: 'DELETE' });
      avisar(`Se borraron ${r.borrados} trabajos de prueba con sus registros.`);
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  return (
    <>
      <div className="ger-cab">
        <div>
          <h1><span className="trazo">{saludo()}, {nombre}</span></h1>
          <p>Así va el estampado. Se actualiza solo cada 30 segundos.</p>
        </div>
        <div className="filtros">
          <div className="segmento" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p.id} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>{p.nombre}</button>
            ))}
          </div>
          <select className="entrada" value={material} onChange={(e) => setMaterial(e.target.value)} aria-label="Material">
            <option value="">Todos los materiales</option>
            {MATERIALES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="entrada" value={tecnica} onChange={(e) => setTecnica(e.target.value)} aria-label="Técnica">
            <option value="">Ambas técnicas</option>
            <option value="serigrafia">Serigrafía</option>
            <option value="tampografia">Tampografía</option>
          </select>
        </div>
      </div>

      {datos?.hayDatosPrueba && (
        <div className="aviso-prueba">
          <span>Hay datos de prueba cargados para mostrar la plataforma. No son registros reales de Two Glass.</span>
          <button className="btn sec chico" onClick={() => setBorrar(true)}><Icono.basura tam={16} />Borrar datos de prueba</button>
        </div>
      )}
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      <section className="kpis" aria-label="Indicadores">
        <div className="kpi destacado">
          <span>% de envases con defecto</span>
          <strong className="num">{pct(k?.pctDefectos)}</strong>
          <span className={`estado ${est.clase}`} style={{ fontSize: '.85rem' }}><est.Ico tam={16} />{est.texto} (≤ {META_MERMA} %)</span>
        </div>
        <div className="kpi">
          <span>Defectos registrados</span>
          <strong className="num">{n(k?.totalDefectos)}</strong>
          <small>{n(k?.reprocesos)} reproceso · {n(k?.descartes)} descarte</small>
        </div>
        <div className="kpi">
          <span>Envases buenos</span>
          <strong className="num">{n(k?.buenas)}</strong>
          <small>de {n(k?.producidas)} estampados</small>
        </div>
        <div className="kpi">
          <span>Trabajos</span>
          <strong className="num">{n(datos?.trabajos?.enProceso)} <small style={{ fontSize: '1rem' }}>en producción</small></strong>
          <small>{n(datos?.trabajos?.enCola)} en cola · {n(datos?.trabajos?.terminados)} terminado{datos?.trabajos?.terminados === 1 ? '' : 's'} ({nombrePeriodo})</small>
        </div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cab">
          <div>
            <h2>¿Qué causa más defectos? · Pareto</h2>
            <p>
              {top.length
                ? <>Las {top.length} primeras causas explican el <b>{pct(topPct, 0)}</b> de los defectos: {top.map((t) => t.corto.toLowerCase()).join(', ')}.</>
                : 'Cuando producción registre defectos, aquí aparecen ordenados de mayor a menor.'}
            </p>
          </div>
          <div className="segmento" role="group" aria-label="Ver como">
            <button aria-pressed={vista === 'grafico'} onClick={() => setVista('grafico')}><Icono.grafico tam={16} /> Gráfico</button>
            <button aria-pressed={vista === 'tabla'} onClick={() => setVista('tabla')}><Icono.tabla tam={16} /> Tabla</button>
          </div>
        </div>
        {vista === 'grafico' ? <Pareto datos={datos?.pareto} /> : <ParetoTabla datos={datos?.pareto} />}
      </section>

      <div className="rejilla-2">
        <section className="tarjeta">
          <div className="tarjeta-cab">
            <div><h2>Defectos por día</h2><p>Toca una barra para ver buenas y % de ese día.</p></div>
          </div>
          <Tendencia datos={datos?.tendencia} />
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cab">
            <div><h2>Por categoría 6M</h2><p>Dónde se concentran las causas.</p></div>
            <button className="btn sec chico" onClick={() => ir('registros')}>Ver registros</button>
          </div>
          <BarrasCategoria datos={datos?.categorias} />
        </section>
      </div>

      {borrar && (
        <Modal titulo="¿Borrar los datos de prueba?" onCerrar={() => setBorrar(false)} ancho={480}
          pie={<><button className="btn sec" onClick={() => setBorrar(false)}>Cancelar</button><button className="btn peligro" onClick={borrarPrueba}>Sí, borrar</button></>}>
          <p>Se borran los trabajos, bocetos y registros marcados como prueba. Lo que hayan registrado ustedes se queda.</p>
        </Modal>
      )}
      {aviso}
    </>
  );
}
