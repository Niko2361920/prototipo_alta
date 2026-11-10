'use client';
// Cuentas de la plataforma: solicitudes de «Olvidé mi contraseña», cambiar contraseña y eliminar cuentas.
import { useState } from 'react';
import { Icono } from '@/components/Iconos';
import { api, useDatos, useAviso, Modal, fechaHora } from '@/components/ui';

export default function Usuarios() {
  const { datos, error, recargar } = useDatos('/api/usuarios/gestion', 30000);
  const [aviso, avisar] = useAviso();
  const [cambiar, setCambiar] = useState(null);
  const [clave, setClave] = useState('');
  const [borrar, setBorrar] = useState(null);
  const lista = datos?.usuarios || [];
  const pendientes = lista.filter((u) => u.solicitudClave);

  async function guardarClave(e) {
    e.preventDefault();
    try {
      await api('/api/clave', { method: 'POST', body: { usuario: cambiar.usuario, clave } });
      avisar(`Contraseña de ${cambiar.corto} cambiada. Dísela en persona.`);
      setCambiar(null);
      setClave('');
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  }

  async function confirmarBorrar() {
    const u = borrar;
    setBorrar(null);
    try {
      await api('/api/usuarios', { method: 'DELETE', body: { usuario: u.usuario } });
      avisar(`Cuenta de ${u.corto} eliminada.`);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  }

  return (
    <>
      <div className="ger-cab">
        <div>
          <h1><span className="trazo">Usuarios</span></h1>
          <p>Quién puede entrar. Aquí llegan las solicitudes de «Olvidé mi contraseña».</p>
        </div>
        <a className="btn sec" href="/registro" target="_blank" rel="noreferrer"><Icono.mas tam={18} />Crear cuenta</a>
      </div>
      {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}

      {pendientes.length > 0 && (
        <section className="aviso-prueba" role="status" style={{ marginBottom: '1rem' }}>
          <Icono.alerta tam={20} />
          <span>
            <b>{pendientes.map((u) => u.corto).join(', ')}</b> {pendientes.length === 1 ? 'pidió' : 'pidieron'} una contraseña nueva.
            Usa el botón «Contraseña» de su fila y díselas en persona.
          </span>
        </section>
      )}

      <section className="tarjeta" style={{ padding: 0 }}>
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr><th>Nombre</th><th>Usuario</th><th>Interfaz</th><th>Último ingreso</th><th><span className="sr">Acciones</span></th></tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.usuario}>
                  <td>
                    <b>{u.nombre}</b>
                    {u.usuario === datos.yo && <span className="chip" style={{ marginLeft: '.4rem' }}>tú</span>}
                    {u.solicitudClave && <div><span className="chip prueba">pidió contraseña · {fechaHora(u.solicitudClave)}</span></div>}
                  </td>
                  <td className="num">{u.usuario}</td>
                  <td>{u.rol === 'gerente' ? 'Gerencia' : 'Producción'}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{u.ultimoIngreso ? fechaHora(u.ultimoIngreso) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className={`btn chico ${u.solicitudClave ? '' : 'sec'}`} onClick={() => { setCambiar(u); setClave(''); }}>
                      <Icono.lapiz tam={16} />Contraseña
                    </button>{' '}
                    {u.usuario !== datos.yo && (
                      <button className="btn fantasma icono chico" onClick={() => setBorrar(u)} aria-label={`Eliminar la cuenta de ${u.corto}`}>
                        <Icono.basura tam={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cambiar && (
        <Modal titulo={`Contraseña nueva para ${cambiar.corto}`} onCerrar={() => setCambiar(null)} ancho={460}>
          <form onSubmit={guardarClave} style={{ display: 'grid', gap: '1rem' }}>
            <label className="campo">
              <span>Contraseña nueva (mínimo 8 caracteres)</span>
              <input className="entrada" type="text" value={clave} onChange={(e) => setClave(e.target.value)}
                autoComplete="off" minLength={8} maxLength={100} required autoFocus />
              <small style={{ color: 'var(--gris)' }}>Se muestra para que puedas dictársela. {cambiar.corto} puede seguir usándola o pedir otra.</small>
            </label>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn sec" onClick={() => setCambiar(null)}>Cancelar</button>
              <button className="btn">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
      {borrar && (
        <Modal titulo={`¿Eliminar la cuenta de ${borrar.corto}?`} onCerrar={() => setBorrar(null)} ancho={460}
          pie={<><button className="btn sec" onClick={() => setBorrar(null)}>Cancelar</button><button className="btn peligro" onClick={confirmarBorrar}>Eliminar</button></>}>
          <p>{borrar.nombre} ({borrar.usuario}) ya no podrá entrar. Los defectos y avances que registró se conservan.</p>
        </Modal>
      )}
      {aviso}
    </>
  );
}
