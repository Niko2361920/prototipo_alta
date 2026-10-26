'use client';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';
import { USUARIOS_BASE } from '@/lib/catalogo';

export default function Configurar() {
  const [estado, setEstado] = useState(null);
  const [claves, setClaves] = useState({});
  const [clavesVisibles, setClavesVisibles] = useState({});
  const [prueba, setPrueba] = useState(true);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch('/api/configurar').then((r) => r.json()).then(setEstado).catch(() => setEstado({ error: 'Sin conexión' }));
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/configurar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claves, datosPrueba: prueba }),
      });
      const d = await r.json().catch(() => ({})); // si el servidor responde HTML (p. ej. 504 de Vercel)
      if (!r.ok) throw new Error(d.error || 'No se pudo guardar. Revisa /api/salud.');
      setListo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="config">
      <form className="config-caja" onSubmit={guardar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo alto={60} />
          <div>
            <span className="sticker">Primer uso</span>
            <h1 style={{ fontSize: '1.6rem', marginTop: '.5rem' }}>Configurar la plataforma</h1>
          </div>
        </div>

        {!estado && <p>Revisando la base de datos…</p>}
        {estado?.error && <p className="error-form"><Icono.alerta tam={18} />{estado.error}</p>}
        {estado && !estado.error && !estado.necesitaConfigurar && !listo && (
          <>
            <p>La plataforma ya está configurada. Si olvidaron una contraseña, hay que cambiarla desde MongoDB Atlas (ver la guía del repositorio).</p>
            <a className="btn" href="/">Ir a entrar</a>
          </>
        )}

        {listo && (
          <>
            <p className="estado bien"><Icono.checkCirculo tam={22} />Listo. Ya pueden entrar con su usuario y contraseña.</p>
            <a className="btn" href="/">Ir a entrar</a>
          </>
        )}

        {estado?.necesitaConfigurar && !listo && (
          <>
            {estado.memoria && (
              <p className="aviso-prueba">Modo de prueba local: los datos se guardan en este computador, no en MongoDB.</p>
            )}
            <p style={{ color: 'var(--tinta-2)' }}>
              Escriban una contraseña para cada persona (mínimo 6 caracteres). Solo se puede hacer una vez: después esta página se bloquea.
            </p>
            {USUARIOS_BASE.map((u) => (
              <div className="campo" key={u.usuario}>
                <label htmlFor={`clave-${u.usuario}`}>{u.nombre} · usuario <code>{u.usuario}</code> · {u.rol === 'gerente' ? 'Gerencia' : 'Producción'}</label>
                <div className="entrada-con-accion">
                  <input id={`clave-${u.usuario}`} className="entrada" type={clavesVisibles[u.usuario] ? 'text' : 'password'} minLength={6} required autoComplete="new-password"
                    value={claves[u.usuario] || ''} onChange={(e) => setClaves({ ...claves, [u.usuario]: e.target.value })} />
                  <button className="boton-ver-clave" type="button" aria-label={clavesVisibles[u.usuario] ? `Ocultar contraseña de ${u.corto}` : `Mostrar contraseña de ${u.corto}`} aria-pressed={Boolean(clavesVisibles[u.usuario])} onClick={() => setClavesVisibles({ ...clavesVisibles, [u.usuario]: !clavesVisibles[u.usuario] })}>
                    {clavesVisibles[u.usuario] ? <Icono.ojoOculto tam={20} /> : <Icono.ojo tam={20} />}
                  </button>
                </div>
              </div>
            ))}
            <label className="check">
              <input type="checkbox" checked={prueba} onChange={(e) => setPrueba(e.target.checked)} />
              Cargar datos de prueba para mostrar la plataforma (se borran con un botón desde Gerencia)
            </label>
            {error && <p className="error-form"><Icono.alerta tam={18} />{error}</p>}
            <button className="btn" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar y terminar'}</button>
          </>
        )}
      </form>
    </main>
  );
}
