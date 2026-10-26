'use client';
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { Vacio } from '@/components/Graficos';
import { api, useDatos, useAviso, Modal, ChipCategoria, n, fechaHora, quien } from '@/components/ui';
import { PERIODOS } from '@/lib/fechas';
import { CATEGORIAS, causaPorId, tecnicaPorId } from '@/lib/catalogo';

export default function Registros() {
  const [periodo, setPeriodo] = useState('7d');
  const [categoria, setCategoria] = useState('');
  const [borrar, setBorrar] = useState(null);
  const [aviso, avisar] = useAviso();
  const { datos, error, recargar, cargando } = useDatos(`/api/defectos?periodo=${periodo}&categoria=${categoria}`, 30000);
  const lista = datos?.defectos || [];
  const total = lista.reduce((s, d) => s + d.cantidad, 0);

  async function confirmarBorrar() {
    const d = borrar;
    setBorrar(null);
    try {
      await api(`/api/defectos/${d._id}`, { method: 'DELETE' });
      avisar('Registro borrado.');
      recargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  return (
    <>
      <div className="ger-cab">
        <div>
          <h1><span className="trazo">Registros</span></h1>
          <p>Cada defecto que registró producción, con su causa 6M. Se puede bajar a Excel.</p>
        </div>
        <a className="btn" href={`/api/exportar?periodo=${periodo}`}><Icono.descarga tam={18} />Descargar Excel (CSV)</a>
      </div>

      <div className="filtros">
        <div className="segmento" role="group" aria-label="Periodo">
          {PERIODOS.map((p) => <button key={p.id} aria-pressed={periodo === p.id} onClick={() => setPeriodo(p.id)}>{p.nombre}</button>)}
        </div>
        <select className="entrada" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría 6M">
          <option value="">Todas las categorías 6M</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="chip">{n(lista.length)} registros · {n(total)} piezas</span>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      <section className="tarjeta" style={{ padding: 0 }}>
        {!cargando && !lista.length ? <Vacio /> : (
          <div className="tabla-caja">
            <table className="tabla">
              <thead>
                <tr><th>Fecha</th><th>Trabajo</th><th>Causa</th><th>Categoría</th><th className="der">Cant.</th><th>Acción</th><th>Registró</th><th><span className="sr">Acciones</span></th></tr>
              </thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d._id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{fechaHora(d.fecha)}</td>
                    <td><b>{d.codigo}</b><div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{d.cliente} · {d.material} · {tecnicaPorId[d.tecnica]?.nombre}</div></td>
                    <td>{causaPorId[d.causa]?.nombre || d.causa}{d.nota && <div style={{ color: 'var(--gris)', fontSize: '.8rem' }}>{d.nota}</div>}</td>
                    <td><ChipCategoria id={d.categoria} /></td>
                    <td className="der num"><b>{d.cantidad}</b></td>
                    <td>{d.accion === 'descarte' ? 'Descarte' : 'Reproceso'}</td>
                    <td>{quien(d.operario)}{d.prueba && <div><span className="chip prueba">prueba</span></div>}</td>
                    <td><button className="btn fantasma icono chico" onClick={() => setBorrar(d)} aria-label="Borrar registro"><Icono.basura tam={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {borrar && (
        <Modal titulo="¿Borrar este registro?" onCerrar={() => setBorrar(null)} ancho={460}
          pie={<><button className="btn sec" onClick={() => setBorrar(null)}>Cancelar</button><button className="btn peligro" onClick={confirmarBorrar}>Borrar</button></>}>
          <p><b>{causaPorId[borrar.causa]?.nombre}</b> × {borrar.cantidad} en {borrar.codigo} ({fechaHora(borrar.fecha)}).</p>
        </Modal>
      )}
      {aviso}
    </>
  );
}
