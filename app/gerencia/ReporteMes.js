'use client';
// Reporte mensual: producción y materia prima por cliente, inventario y estimado para presupuestar.
import { useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';
import { api, useDatos, useAviso, Modal, n, pct, fecha, fechaHora } from '@/components/ui';
import { insumoPorId } from '@/lib/catalogo';
import FormMateria from '@/components/FormMateria';

const mesActual = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 7);
const nombreMes = (m, corto = false) => {
  const s = new Date(`${m}-15T12:00:00-05:00`).toLocaleDateString('es-CO', corto ? { month: 'short' } : { month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const cant = (x, u) => (x == null ? '—' : `${n(x)} ${u}`);

export default function ReporteMes() {
  const [mes, setMes] = useState(mesActual);
  const [cliente, setCliente] = useState('');
  const [registrar, setRegistrar] = useState(false);
  const [borrar, setBorrar] = useState(null);
  const [aviso, avisar] = useAviso();
  const { datos, error, recargar } = useDatos(`/api/mensual?mes=${mes}&cliente=${encodeURIComponent(cliente)}`, 60000);
  const k = datos?.indicadores;
  const maxHist = Math.max(1, ...(datos?.historial || []).map((h) => h.buenas + h.defectos));

  async function confirmarBorrar() {
    const m = borrar;
    setBorrar(null);
    try {
      await api(`/api/materia?id=${encodeURIComponent(m._id)}`, { method: 'DELETE' });
      avisar('Registro borrado.');
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  return (
    <>
      <div className="ger-cab no-imprimir">
        <div>
          <h1><span className="trazo">Reporte del mes</span></h1>
          <p>Producción y materia prima por cliente: cuánto entra, cuánto sale y cuánto queda. Sirve para presupuestar.</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="campo" style={{ width: 'auto' }}>
            <span>Mes</span>
            <input className="entrada" type="month" value={mes} max={mesActual()} onChange={(e) => e.target.value && setMes(e.target.value)} />
          </label>
          <label className="campo" style={{ width: 'auto', minWidth: 190 }}>
            <span>Cliente</span>
            <select className="entrada" value={cliente} onChange={(e) => setCliente(e.target.value)}>
              <option value="">Todos los clientes</option>
              {(datos?.clientes || []).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="no-imprimir" style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button className="btn" onClick={() => setRegistrar(true)} disabled={!datos}><Icono.mas tam={18} />Registrar materia prima</button>
        <button className="btn sec" onClick={() => window.print()}><Icono.imprimir tam={18} />Imprimir</button>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      <article className="reporte-hoja reporte-mes">
        <div className="reporte-cab">
          <div>
            <span className="sticker">Reporte mensual</span>
            <h2 style={{ marginTop: '.6rem' }}>{nombreMes(mes)}</h2>
            <p style={{ margin: 0, color: 'var(--tinta-2)', fontWeight: 700 }}>{cliente || 'Todos los clientes'}</p>
          </div>
          <Logo alto={58} />
        </div>

        <div className="reporte-cifras">
          <div><span>Unidades buenas</span><b className="num">{n(k?.buenas)}</b><small>{n(k?.terminados)} de {n(k?.trabajos)} trabajos terminados</small></div>
          <div><span>Defectos</span><b className="num">{n(k?.defectos)}</b><small>{pct(k?.pctDefectos)} · {n(k?.descartes)} descarte · {n(k?.reprocesos)} reproceso</small></div>
          <div><span>Envases del cliente</span><b className="num">{n(k?.envasesRecibidos)}</b><small>recibidos · {n(k?.envasesUsados)} usados</small></div>
          <div><span>Tinta consumida</span><b className="num">{n(k?.tintaKg)} kg</b><small>suma de todas las tintas</small></div>
        </div>

        {!cliente && (
          <section>
            <h3 className="reporte-h3">Por cliente</h3>
            {!datos?.porCliente?.length ? <p className="vacio-texto">Sin movimiento este mes.</p> : (
              <div className="tabla-caja">
                <table className="tabla">
                  <thead><tr><th>Cliente</th><th className="der">Trabajos</th><th className="der">Pedidas</th><th className="der">Buenas</th><th className="der">Defectos</th><th className="der">Envases recibidos</th><th className="der">Envases usados</th><th className="der">Tinta</th></tr></thead>
                  <tbody>
                    {datos.porCliente.map((f) => (
                      <tr key={f.cliente}>
                        <td><button className="enlace-boton" style={{ padding: 0, textAlign: 'left' }} onClick={() => setCliente(f.cliente)}>{f.cliente}</button></td>
                        <td className="der num">{n(f.trabajos)}</td>
                        <td className="der num">{n(f.pedidas)}</td>
                        <td className="der num"><b>{n(f.buenas)}</b></td>
                        <td className="der num">{n(f.defectos)} <small style={{ color: 'var(--gris)' }}>({pct(f.pctDefectos)})</small></td>
                        <td className="der num">{n(f.recibidos)}</td>
                        <td className="der num">{n(f.usados)}</td>
                        <td className="der num">{n(f.tintaKg)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section>
          <h3 className="reporte-h3">Materia prima del mes</h3>
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Material</th><th className="der">Entró</th><th className="der">Salió (consumo)</th>{!cliente && <th className="der">Queda (inventario)</th>}</tr></thead>
              <tbody>
                {(datos?.materiales || []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.nombre}{m.grupo === 'envases' && <div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>Los manda el cliente; lo usado = buenas + descartes</div>}</td>
                    <td className="der num">{cant(m.entradas, m.unidad)}</td>
                    <td className="der num">{cant(m.consumo, m.unidad)}</td>
                    {!cliente && (
                      <td className={`der num ${m.saldo != null && m.saldo < 0 ? 'texto-critico' : ''}`}>
                        {m.grupo === 'envases' ? '—' : <b>{cant(m.saldo, m.unidad)}</b>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cliente && <p className="vacio-texto">Con un cliente elegido se muestra lo que se registró a su nombre. El inventario se ve con «Todos los clientes».</p>}
        </section>

        <section className="reporte-dos">
          <div>
            <h3 className="reporte-h3">Últimos 6 meses</h3>
            <div className="barras-mes" role="img" aria-label="Unidades buenas y defectos de los últimos 6 meses">
              {(datos?.historial || []).map((h) => (
                <div key={h.mes} className="barra-mes" title={`${nombreMes(h.mes)}: ${n(h.buenas)} buenas, ${n(h.defectos)} defectos, ${n(h.tintaKg)} kg de tinta`}>
                  <span className="barra-valor num">{h.buenas + h.defectos ? n(h.buenas) : ''}</span>
                  <div className="barra-pila" style={{ height: `${((h.buenas + h.defectos) / maxHist) * 100}%` }}>
                    <i style={{ flex: h.defectos }} className="barra-def" />
                    <i style={{ flex: h.buenas }} />
                  </div>
                  <small aria-current={h.mes === mes ? 'true' : undefined}>{nombreMes(h.mes, true)}</small>
                </div>
              ))}
            </div>
            <p className="vacio-texto"><i className="leyenda-cuadro" /> buenas <i className="leyenda-cuadro barra-def" /> defectos</p>
          </div>
          <div>
            <h3 className="reporte-h3">Para presupuestar</h3>
            {!datos?.proyeccion?.length ? <p className="vacio-texto">Todavía no hay consumos registrados para estimar.</p> : (
              <>
                <div className="tabla-caja"><table className="tabla">
                  <thead><tr><th>Material</th><th className="der">Promedio al mes</th><th className="der">Estimado 12 meses</th></tr></thead>
                  <tbody>
                    {datos.proyeccion.map((p) => (
                      <tr key={p.id}><td>{p.nombre}</td><td className="der num">{cant(p.promedioMes, p.unidad)}</td><td className="der num"><b>{cant(p.estimadoAnio, p.unidad)}</b></td></tr>
                    ))}
                  </tbody>
                </table></div>
                <p className="vacio-texto">Promedio de {datos.mesesConDatos} {datos.mesesConDatos === 1 ? 'mes' : 'meses'} con registros × 12. Con más meses registrados, el estimado es más confiable.</p>
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="reporte-h3">Trabajos del mes</h3>
          {!datos?.trabajos?.length ? <p className="vacio-texto">Sin trabajos este mes.</p> : (
            <div className="tabla-caja">
              <table className="tabla">
                <thead><tr><th>Trabajo</th><th>Llegaron los envases</th><th>Empezó</th><th>Terminó</th><th className="der">Buenas</th><th className="der">Defectos</th></tr></thead>
                <tbody>
                  {datos.trabajos.map((t) => (
                    <tr key={t._id}>
                      <td><b>{t.codigo}</b><div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{t.cliente} · {t.producto} · {n(t.unidades)} u.</div></td>
                      <td className="num">{t.llegada ? fecha(t.llegada) : '—'}</td>
                      <td className="num">{t.iniciado ? fecha(t.iniciado) : '—'}</td>
                      <td className="num">{t.terminado ? fecha(t.terminado) : t.estado === 'en_proceso' ? 'En producción' : '—'}</td>
                      <td className="der num">{n(t.buenas)}</td>
                      <td className="der num">{n(t.defectos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {datos?.hayDatosPrueba && <p className="vacio-texto">Incluye datos de prueba (clientes ficticios).</p>}
      </article>

      <section className="reporte-hoja no-imprimir" style={{ marginTop: '1rem', maxWidth: 'none' }}>
        <h3 className="reporte-h3">Registros de materia prima de este mes</h3>
        {!datos?.movimientos?.length ? <p className="vacio-texto">Aún no hay registros. Usa «Registrar materia prima» cuando lleguen envases, se compre tinta o se gaste material.</p> : (
          <div className="tabla-caja">
            <table className="tabla">
              <thead><tr><th>Fecha</th><th>Movimiento</th><th>Material</th><th className="der">Cantidad</th><th>Cliente / trabajo</th><th><span className="sr">Acciones</span></th></tr></thead>
              <tbody>
                {datos.movimientos.map((m) => (
                  <tr key={m._id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{fecha(m.fecha)}</td>
                    <td>{m.tipo === 'entrada' ? <span className="chip">Entrada</span> : <span className="chip prueba">Consumo</span>}</td>
                    <td>{insumoPorId[m.insumo]?.nombre || m.insumo}{m.color ? ` · ${m.color}` : ''}{m.auto && <span className="chip" style={{ marginLeft: '.3rem' }}>automático</span>}{m.nota && <div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{m.nota}</div>}</td>
                    <td className="der num"><b>{cant(m.cantidad, m.unidad)}</b></td>
                    <td>{m.cliente || '—'}{m.codigo && <div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{m.codigo}</div>}</td>
                    <td><button className="btn fantasma icono chico" onClick={() => setBorrar(m)} aria-label="Borrar registro"><Icono.basura tam={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {registrar && (
        <FormMateria opciones={datos?.opcionesTrabajo || []} clientes={datos?.clientes || []} unidades={datos?.unidades || {}} cerrar={() => setRegistrar(false)}
          listo={(m) => { setRegistrar(false); avisar(`${insumoPorId[m.insumo].nombre}: ${n(m.cantidad)} ${m.unidad} registrado.`); recargar(); }} />
      )}
      {borrar && (
        <Modal titulo="¿Borrar este registro?" onCerrar={() => setBorrar(null)} ancho={460}
          pie={<><button className="btn sec" onClick={() => setBorrar(null)}>Cancelar</button><button className="btn peligro" onClick={confirmarBorrar}>Borrar</button></>}>
          <p>{borrar.tipo === 'entrada' ? 'Entrada' : 'Consumo'} de <b>{insumoPorId[borrar.insumo]?.nombre}</b>: {cant(borrar.cantidad, borrar.unidad)} ({fechaHora(borrar.fecha)}).</p>
        </Modal>
      )}
      {aviso}
    </>
  );
}
