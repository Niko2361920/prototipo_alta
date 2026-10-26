'use client';
// Gráficos hechos a mano en SVG: Pareto (barras + % acumulado en UN solo eje 0–100 %),
// defectos por categoría 6M y tendencia diaria. Todos con información al pasar el mouse.
import { useEffect, useRef, useState } from 'react';
import { Cat6M, n, pct, fecha } from './ui';
import { categoriaPorId } from '@/lib/catalogo';

function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

function barraRedondeada(x, y, w, base, r = 4) {
  const h = base - y;
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${base}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${base}Z`;
}

const recortar = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function Vacio({ texto = 'Todavía no hay registros en este periodo.' }) {
  return (
    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--gris)', fontWeight: 600 }}>{texto}</div>
  );
}

export function Pareto({ datos, superficie = '#ffffff' }) {
  const [ref, ancho] = useAncho();
  const [sobre, setSobre] = useState(null);
  if (!datos?.length) return <div ref={ref}><Vacio /></div>;
  if (ancho && ancho < 620) return <div ref={ref}><ParetoLista datos={datos} /></div>;

  const W = ancho || 860;
  const H = 400;
  const m = { t: 18, r: 14, b: 126, l: 48 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const banda = iw / datos.length;
  const bw = Math.min(24, banda * 0.6);
  const y = (v) => m.t + ih * (1 - v);
  const base = y(0);
  const cx = (i) => m.l + banda * i + banda / 2;
  const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${y(d.acumulado).toFixed(1)}`).join('');
  const corte = datos.findIndex((d) => d.acumulado >= 0.8);
  const h = sobre != null ? datos[sobre] : null;

  return (
    <div ref={ref} className="grafico">
      <div className="leyenda" style={{ marginBottom: '.5rem' }}>
        <span><i style={{ background: 'var(--serie-1)' }} />% de los defectos</span>
        <span><i className="linea" style={{ background: 'var(--serie-2)' }} />% acumulado</span>
      </div>
      <svg width={W} height={H} role="img" aria-label="Diagrama de Pareto de causas de defectos">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--eje)' : 'var(--rejilla)'} strokeWidth="1" />
            <text className="etq num" x={m.l - 8} y={y(t) + 4} textAnchor="end">{t * 100} %</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(0.8)} y2={y(0.8)} style={{ stroke: 'var(--serie-2)' }} strokeOpacity=".55" strokeWidth="1" />
        <text className="etq" x={W - m.r} y={y(0.8) - 6} textAnchor="end" style={{ fill: 'var(--serie-2)' }}>80 % de los defectos</text>
        {sobre != null && (
          <rect x={m.l + banda * sobre} y={m.t} width={banda} height={ih} fill="currentColor" opacity=".05" />
        )}
        {datos.map((d, i) => (
          <path key={d.causa} d={barraRedondeada(cx(i) - bw / 2, y(d.pct), bw, base)} style={{ fill: 'var(--serie-1)' }} opacity={corte >= 0 && i > corte ? 0.55 : 1} />
        ))}
        {datos.slice(0, 3).map((d, i) => {
          // Si el punto de la línea acumulada cae encima de la barra, la etiqueta sube para no taparse
          const choca = Math.abs(y(d.acumulado) - y(d.pct)) < 16;
          return (
            <text key={d.causa} className="etq-valor num" x={cx(i)} y={y(d.pct) - (choca ? 14 : 7)} textAnchor="middle">{Math.round(d.pct * 100)} %</text>
          );
        })}
        <path d={linea} fill="none" style={{ stroke: 'var(--serie-2)' }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {datos.map((d, i) => (
          <circle key={d.causa} cx={cx(i)} cy={y(d.acumulado)} r={sobre === i ? 6 : 4} style={{ fill: 'var(--serie-2)', stroke: superficie }} strokeWidth="2" />
        ))}
        {datos.map((d, i) => (
          <text key={d.causa} className="etq" transform={`translate(${cx(i) + 4} ${base + 12}) rotate(-42)`} textAnchor="end">
            {recortar(d.corto, 26)}
          </text>
        ))}
        {datos.map((d, i) => (
          <rect
            key={d.causa} x={m.l + banda * i} y={m.t} width={banda} height={ih + m.b - 10} fill="transparent"
            onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)} onClick={() => setSobre(i)}
            tabIndex={0} onFocus={() => setSobre(i)} onBlur={() => setSobre(null)} aria-label={`${d.nombre}: ${n(d.cantidad)} defectos, ${pct(d.pct)}`}
          />
        ))}
      </svg>
      {h && (
        <div className="tip" style={{ left: Math.min(Math.max(cx(sobre), 90), W - 90), top: Math.min(y(h.pct), y(h.acumulado)) }}>
          <b>{h.pos}. {h.nombre}</b>
          <span>Defectos <b className="num">{n(h.cantidad)}</b></span>
          <span>% del total <b className="num">{pct(h.pct)}</b></span>
          <span>% acumulado <b className="num">{pct(h.acumulado)}</b></span>
        </div>
      )}
    </div>
  );
}

export function ParetoLista({ datos }) {
  if (!datos?.length) return <Vacio />;
  const max = datos[0].pct || 1;
  const corte = datos.findIndex((d) => d.acumulado >= 0.8);
  return (
    <div className="pareto-lista">
      {datos.map((d, i) => (
        <div key={d.causa} style={{ display: 'contents' }}>
          <div className={`pareto-fila ${corte >= 0 && i > corte ? 'bajo' : ''}`}>
            <span className="num" style={{ fontWeight: 700, color: 'var(--gris)' }}>{d.pos}</span>
            <span className="nombre"><Cat6M id={d.categoria} tam={16} /><span title={d.nombre}>{d.nombre}</span></span>
            <span className="valor num">{n(d.cantidad)} · {pct(d.pct, 0)} · acum. {pct(d.acumulado, 0)}</span>
            <div className="barra"><i style={{ width: `${(d.pct / max) * 100}%` }} /></div>
          </div>
          {i === corte && i < datos.length - 1 && <div className="corte">Hasta aquí: 80 % de los defectos</div>}
        </div>
      ))}
    </div>
  );
}

export function ParetoTabla({ datos }) {
  if (!datos?.length) return <Vacio />;
  return (
    <div className="tabla-caja">
      <table className="tabla">
        <thead><tr><th>Pos.</th><th>Causa</th><th>Categoría 6M</th><th className="der">Defectos</th><th className="der">% del total</th><th className="der">% acumulado</th></tr></thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.causa}>
              <td className="num">{d.pos}</td><td>{d.nombre}</td><td><span style={{ display: 'inline-flex', gap: '.35rem', alignItems: 'center' }}><Cat6M id={d.categoria} tam={15} />{categoriaPorId[d.categoria]?.nombre || d.categoria}</span></td>
              <td className="der num">{n(d.cantidad)}</td><td className="der num">{pct(d.pct)}</td><td className="der num">{pct(d.acumulado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BarrasCategoria({ datos }) {
  const total = datos?.reduce((s, d) => s + d.cantidad, 0);
  if (!total) return <Vacio />;
  const max = Math.max(...datos.map((d) => d.cantidad)) || 1;
  return (
    <div className="cat-barras">
      {datos.map((d) => (
        <div className="cat-fila" key={d.id}>
          <span className="ico"><Cat6M id={d.id} tam={18} /></span>
          <b style={{ fontSize: '.92rem' }}>{d.nombre}</b>
          <span className="num" style={{ fontWeight: 700, color: 'var(--tinta-2)', fontSize: '.88rem' }}>{n(d.cantidad)} · {pct(d.pct, 0)}</span>
          <div className="barra"><i style={{ width: `${(d.cantidad / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Tendencia({ datos }) {
  const [ref, ancho] = useAncho();
  const [sobre, setSobre] = useState(null);
  const hay = datos?.some((d) => d.defectos || d.buenas);
  if (!hay) return <div ref={ref}><Vacio /></div>;
  const W = ancho || 600;
  const H = 210;
  const m = { t: 14, r: 8, b: 26, l: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const maxV = Math.max(...datos.map((d) => d.defectos), 1);
  const paso = maxV <= 5 ? 1 : maxV <= 10 ? 2 : maxV <= 25 ? 5 : maxV <= 50 ? 10 : Math.ceil(maxV / 50) * 10;
  const tope = Math.ceil(maxV / paso) * paso;
  const ticks = [];
  for (let t = 0; t <= tope; t += paso) ticks.push(t);
  const banda = iw / datos.length;
  const bw = Math.max(2, Math.min(24, banda - 2));
  const y = (v) => m.t + ih * (1 - v / tope);
  const base = y(0);
  const cada = Math.max(1, Math.ceil(datos.length / Math.max(2, Math.floor(iw / 70))));
  const h = sobre != null ? datos[sobre] : null;
  const cx = (i) => m.l + banda * i + banda / 2;
  return (
    <div ref={ref} className="grafico">
      <svg width={W} height={H} role="img" aria-label="Defectos registrados por día">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--eje)' : 'var(--rejilla)'} strokeWidth="1" />
            <text className="etq num" x={m.l - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {datos.map((d, i) => (
          <path key={d.dia} d={barraRedondeada(cx(i) - bw / 2, y(d.defectos), bw, base, Math.min(4, bw / 2))} style={{ fill: 'var(--serie-1)' }} opacity={sobre == null || sobre === i ? 1 : 0.6} />
        ))}
        {datos.map((d, i) => (i % cada === 0 ? (
          <text key={d.dia} className="etq" x={cx(i)} y={H - 6} textAnchor="middle">{fecha(`${d.dia}T12:00:00-05:00`)}</text>
        ) : null))}
        {datos.map((d, i) => (
          <rect key={d.dia} x={m.l + banda * i} y={m.t} width={banda} height={ih} fill="transparent"
            onMouseEnter={() => setSobre(i)} onMouseLeave={() => setSobre(null)} onClick={() => setSobre(i)} />
        ))}
      </svg>
      {h && (
        <div className="tip" style={{ left: Math.min(Math.max(cx(sobre), 90), W - 90), top: y(h.defectos) }}>
          <b>{fecha(`${h.dia}T12:00:00-05:00`, { weekday: 'long', day: 'numeric', month: 'short' })}</b>
          <span>Defectos <b className="num">{n(h.defectos)}</b></span>
          <span>Buenas <b className="num">{n(h.buenas)}</b></span>
          <span>% defectos <b className="num">{pct(h.pct)}</b></span>
        </div>
      )}
    </div>
  );
}
