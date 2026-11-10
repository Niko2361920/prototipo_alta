'use client';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';

// Tarjetas que se quitaron de «¿Quién eres?» en este dispositivo. Solo se
// ocultan aquí: la cuenta sigue existiendo (para borrarla: Gerencia → Usuarios).
const LLAVE_OCULTOS = 'tg_ocultos';
function leerOcultos() {
  try { return JSON.parse(localStorage.getItem(LLAVE_OCULTOS) || '[]'); } catch { return []; }
}
function guardarOcultos(lista) {
  try { localStorage.setItem(LLAVE_OCULTOS, JSON.stringify(lista)); } catch {}
}

export default function Ingreso() {
  const [usuarios, setUsuarios] = useState(null);
  const [ocultos, setOcultos] = useState([]);
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    fetch('/api/configurar').then((r) => r.json()).then(setEstado).catch(() => setEstado({ error: true }));
    fetch('/api/usuarios').then((r) => r.json()).then((d) => setUsuarios(d.usuarios || [])).catch(() => setUsuarios([]));
    setOcultos(leerOcultos());
  }, []);

  const visibles = (usuarios || []).filter((u) => !ocultos.includes(u.usuario));
  const quitar = (u) => {
    const lista = [...new Set([...ocultos, u])];
    setOcultos(lista);
    guardarOcultos(lista);
    if (usuario === u) setUsuario('');
  };
  const mostrarTodos = () => { setOcultos([]); guardarOcultos([]); };

  async function entrar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave }),
      });
      const d = await r.json().catch(() => ({})); // si el servidor responde HTML (p. ej. 504 de Vercel)
      if (!r.ok) throw new Error(d.error || 'No se pudo entrar.');
      window.location.href = d.destino;
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="ingreso">
      <section className="ingreso-marca">
        <Logo alto={86} />
        <div>
          <span className="sticker">Registro de causas 6M</span>
          <h1 style={{ marginTop: '1.2rem' }}>
            Registra el defecto<br />cuando <em>ocurre</em>.<br />
            <span className="trazo">Decide con datos.</span>
          </h1>
          <p className="bajada">
            Producción ve el boceto, el trabajo y lo que falló antes en trabajos parecidos.
            Gerencia ve todo organizado desde cualquier lugar.
          </p>
        </div>
        <small style={{ fontWeight: 700, color: '#2b3a36' }}>Two Glass S.A.S. BIC · Cali · Prototipo de TeamGlass</small>
        <svg className="burbujas" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="120" cy="120" r="70" fill="none" stroke="#fff" strokeWidth="10" />
          <circle cx="60" cy="60" r="26" fill="none" stroke="#fff" strokeWidth="8" />
          <circle cx="170" cy="40" r="12" fill="#fff" />
        </svg>
      </section>

      <section className="ingreso-form">
        <form onSubmit={entrar}>
          <h2>Entrar</h2>
          <div className="registro-arriba" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '.85rem', fontWeight: 700 }}>¿Primera vez? Regístrate como:</span>
            <a className="btn chico" href="/registro?rol=gerente">Gerencia</a>
            <a className="btn chico" href="/registro?rol=produccion">Producción</a>
          </div>
          {estado?.necesitaConfigurar && (
            <div className="aviso-prueba">
              <span>Es la primera vez que se abre la plataforma.</span>
              <a className="btn chico" href="/configurar">Configurar</a>
            </div>
          )}
          {estado?.error && (
            <div className="error-form" role="alert"><Icono.alerta tam={18} />
              {/* /api/configurar ya devuelve la causa y qué hacer; si no hubo respuesta, mensaje genérico */}
              {typeof estado.error === 'string' ? estado.error : 'No hay conexión con la base de datos.'}
            </div>
          )}

          {(visibles.length > 0 || ocultos.length > 0) && (
            <div>
              <p style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--tinta-2)', marginBottom: '.4rem' }}>¿Quién eres?</p>
              <div className="quienes quienes-ingreso">
                {visibles.map((u) => (
                  <div key={u.usuario} className="quien-caja">
                    <button type="button" className="quien" aria-pressed={usuario === u.usuario} title={u.nombre}
                      onClick={() => { setUsuario(u.usuario); document.getElementById('clave')?.focus(); }}>
                      <span className={`avatar ${u.rol === 'produccion' ? 'prod' : ''}`}>{(u.corto[0] || '?').toUpperCase()}</span>
                      <b>{u.corto}</b>
                      <small>{u.rol === 'gerente' ? 'Gerencia' : 'Producción'}</small>
                    </button>
                    <button type="button" className="quien-quitar" onClick={() => quitar(u.usuario)}
                      aria-label={`Quitar a ${u.corto} de esta pantalla`} title="Quitar de esta pantalla">
                      <Icono.x tam={14} />
                    </button>
                  </div>
                ))}
              </div>
              {ocultos.length > 0 && (
                <button type="button" className="enlace-boton" onClick={mostrarTodos}>
                  Mostrar todos ({ocultos.length} {ocultos.length === 1 ? 'oculto' : 'ocultos'})
                </button>
              )}
            </div>
          )}

          <label className="campo">
            <span>Usuario</span>
            <input className="entrada" value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())} autoComplete="username" autoCapitalize="none" required />
          </label>
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <div className="entrada-con-accion">
              <input id="clave" className="entrada" type={mostrarClave ? 'text' : 'password'} value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
              <button className="boton-ver-clave" type="button" aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarClave} onClick={() => setMostrarClave(!mostrarClave)}>
                {mostrarClave ? <Icono.ojoOculto tam={20} /> : <Icono.ojo tam={20} />}
              </button>
            </div>
          </div>
          <a href={`/recuperar${usuario ? `?u=${encodeURIComponent(usuario)}` : ''}`} style={{ fontSize: '.88rem', justifySelf: 'end', marginTop: '-.5rem' }}>
            ¿Olvidaste tu contraseña?
          </a>
          {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
          <button className="btn" disabled={enviando} style={{ minHeight: 52 }}>
            {enviando ? 'Entrando…' : 'Entrar'} <Icono.derecha tam={18} />
          </button>
          {estado && !estado.error && !estado.necesitaConfigurar && (
            <p style={{ textAlign: 'center', margin: 0 }}>
              ¿No tienes cuenta? <a href="/registro">Crear cuenta</a>
            </p>
          )}
          <p style={{ color: 'var(--gris)', fontSize: '.82rem' }}>
            Gerencia entra al panel de gestión. Producción entra a la pantalla del televisor.
          </p>
        </form>
      </section>
    </main>
  );
}
