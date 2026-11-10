'use client';
// «Olvidé mi contraseña». No hay correo: o se le pide a gerencia, o se usa el código de gerencia.
import { useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';

export default function Recuperar() {
  const [modo, setModo] = useState('pedir'); // 'pedir' | 'codigo'
  const [usuario, setUsuario] = useState(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('u') || '' : ''));
  const [codigo, setCodigo] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const url = modo === 'pedir' ? '/api/clave/solicitar' : '/api/clave/restablecer';
      const body = modo === 'pedir' ? { usuario } : { usuario, codigo, clave };
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo enviar.');
      setListo(modo === 'pedir'
        ? 'Listo. Si el usuario existe, gerencia verá tu solicitud en Gerencia → Usuarios y te pondrá una contraseña nueva. Pídesela en persona.'
        : 'Contraseña cambiada. Ya puedes entrar con la nueva.');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="config">
      <form className="config-caja" onSubmit={enviar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo alto={60} />
          <h1 style={{ fontSize: '1.6rem' }}>Olvidé mi contraseña</h1>
        </div>

        {listo ? (
          <>
            <p className="aviso-prueba" role="status"><Icono.checkCirculo tam={20} /> <span>{listo}</span></p>
            <a className="btn" href="/">Volver a entrar</a>
          </>
        ) : (
          <>
            <div className="quienes" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" className="quien" aria-pressed={modo === 'pedir'} onClick={() => { setModo('pedir'); setError(''); }}>
                <b>Pedirle a gerencia</b><small>Producción</small>
              </button>
              <button type="button" className="quien" aria-pressed={modo === 'codigo'} onClick={() => { setModo('codigo'); setError(''); }}>
                <b>Tengo el código de gerencia</b><small>Gerencia</small>
              </button>
            </div>
            <p style={{ color: 'var(--tinta-2)', fontSize: '.9rem', margin: 0 }}>
              {modo === 'pedir'
                ? 'Escribe tu usuario. Gerencia recibe la solicitud y te asigna una contraseña nueva.'
                : 'Con el código de gerencia puedes poner una contraseña nueva a cualquier cuenta, también a la de la gerente.'}
            </p>

            <label className="campo">
              <span>Usuario</span>
              <input className="entrada" value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())}
                autoComplete="username" autoCapitalize="none" maxLength={30} required />
            </label>
            {modo === 'codigo' && (
              <>
                <label className="campo">
                  <span>Código de gerencia</span>
                  <input className="entrada" type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" maxLength={100} required />
                </label>
                <div className="campo">
                  <label htmlFor="clave-nueva">Contraseña nueva (mínimo 8 caracteres)</label>
                  <div className="entrada-con-accion">
                    <input id="clave-nueva" className="entrada" type={ver ? 'text' : 'password'} value={clave}
                      onChange={(e) => setClave(e.target.value)} autoComplete="new-password" minLength={8} maxLength={100} required />
                    <button className="boton-ver-clave" type="button" aria-pressed={ver}
                      aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVer(!ver)}>
                      {ver ? <Icono.ojoOculto tam={20} /> : <Icono.ojo tam={20} />}
                    </button>
                  </div>
                </div>
              </>
            )}
            {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
            <button className="btn" disabled={enviando}>
              {enviando ? 'Enviando…' : modo === 'pedir' ? 'Enviar solicitud' : 'Cambiar contraseña'}
            </button>
            <a href="/" style={{ fontSize: '.9rem' }}>Volver a entrar</a>
          </>
        )}
      </form>
    </main>
  );
}
