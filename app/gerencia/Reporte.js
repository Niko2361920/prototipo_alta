'use client';
// Reporte diario para compartir por WhatsApp (el canal que ya usa la empresa), copiar o imprimir.
import { useMemo, useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';
import { useDatos, useAviso, n, pct, estadoDefectos } from '@/components/ui';
import { META_MERMA } from '@/lib/catalogo';

function hoyBogota() {
  return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
}

export default function Reporte() {
  const [dia, setDia] = useState(hoyBogota);
  const [aviso, avisar] = useAviso();
  const { datos, error } = useDatos(`/api/resumen?dia=${dia}`, 60000);
  const k = datos?.indicadores;
  const est = estadoDefectos(k?.pctDefectos, META_MERMA);
  const titulo = new Date(`${dia}T12:00:00-05:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });

  const texto = useMemo(() => {
    if (!datos) return '';
    const l = [
      '*Two Glass · Reporte de estampado*',
      titulo.charAt(0).toUpperCase() + titulo.slice(1),
      '',
      `Buenas: ${n(k.buenas)}`,
      `Defectos: ${n(k.totalDefectos)} (${pct(k.pctDefectos)}) · meta hasta ${META_MERMA} %`,
      `Reproceso: ${n(k.reprocesos)} · Descarte: ${n(k.descartes)}`,
    ];
    if (datos.pareto.length) {
      l.push('', '*Causas principales*');
      datos.pareto.slice(0, 3).forEach((p) => l.push(`${p.pos}. ${p.nombre}: ${n(p.cantidad)} (${pct(p.pct, 0)})`));
    } else {
      l.push('', 'Sin defectos registrados este día.');
    }
    const tt = datos.trabajos.terminados;
    l.push('', `Trabajos: ${n(tt)} terminado${tt === 1 ? '' : 's'} · ${n(datos.trabajos.enProceso)} en producción · ${n(datos.trabajos.enCola)} en cola`);
    if (datos.hayDatosPrueba) l.push('', '(Incluye datos de prueba)');
    return l.join('\n');
  }, [datos, k, titulo]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Texto copiado.');
    } catch {
      avisar('No se pudo copiar; selecciona el texto a mano.', 'error');
    }
  }

  return (
    <>
      <div className="ger-cab no-imprimir">
        <div>
          <h1><span className="trazo">Reporte del día</span></h1>
          <p>Listo para mandarlo por WhatsApp, copiarlo o imprimirlo.</p>
        </div>
        <label className="campo" style={{ width: 'auto' }}>
          <span>Día</span>
          <input className="entrada" type="date" value={dia} max={hoyBogota()} onChange={(e) => e.target.value && setDia(e.target.value)} />
        </label>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      <article className="reporte-hoja">
        <div className="reporte-cab">
          <div>
            <span className="sticker">Reporte diario</span>
            <h2 style={{ marginTop: '.6rem' }}>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
          </div>
          <Logo alto={58} />
        </div>
        <div className="reporte-cifras">
          <div><span>Buenas</span><b className="num">{n(k?.buenas)}</b></div>
          <div><span>Defectos</span><b className="num">{n(k?.totalDefectos)}</b></div>
          <div><span>% defectos</span><b className="num">{pct(k?.pctDefectos)}</b><small className={`estado ${est.clase}`}><est.Ico tam={14} />{est.texto}</small></div>
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '.5rem' }}>Texto para WhatsApp</h3>
          <div className="reporte-texto">{texto || 'Cargando…'}</div>
        </div>
        <div className="no-imprimir" style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><Icono.whatsapp tam={18} />Compartir por WhatsApp</a>
          <button className="btn sec" onClick={copiar}><Icono.copiar tam={18} />Copiar texto</button>
          <button className="btn sec" onClick={() => window.print()}><Icono.imprimir tam={18} />Imprimir</button>
        </div>
      </article>
      {aviso}
    </>
  );
}
