'use client';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';

export default function Registro() {
  const [rol, setRol] = useState(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('rol') === 'gerente' ? 'gerente' : 'produccion'));
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function crear(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, usuario, clave, rol, codigo: rol === 'gerente' ? codigo : undefined }),
      });
      const d = await r.json().catch(() => ({})); // si el servidor responde HTML (p. ej. 504 de Vercel)
      if (!r.ok) throw new Error(d.error || 'No se pudo crear la cuenta.');
      window.location.href = d.destino;
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="config">
      <form className="config-caja" onSubmit={crear}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo alto={60} />
          <h1 style={{ fontSize: '1.6rem' }}>Crear cuenta</h1>
        </div>

        <div>
          <p style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--tinta-2)', marginBottom: '.4rem' }}>Me registro como</p>
          <div className="quienes" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[['gerente', 'Gerencia'], ['produccion', 'Producción']].map(([id, texto]) => (
              <button type="button" key={id} className="quien" aria-pressed={rol === id} onClick={() => setRol(id)}>
                <span className={`avatar ${id === 'produccion' ? 'prod' : ''}`}>{texto[0]}</span>
                <b>{texto}</b>
              </button>
            ))}
          </div>
        </div>
        {rol === 'gerente' && (
          <label className="campo">
            <span>Código de gerencia</span>
            <input className="entrada" type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)}
              autoComplete="off" maxLength={100} required />
            <small style={{ color: 'var(--gris)' }}>Te lo da quien administra la plataforma. Sin el código no se puede crear una cuenta de gerencia.</small>
          </label>
        )}
        <label className="campo">
          <span>Nombre</span>
          <input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)}
            autoComplete="name" maxLength={60} required />
        </label>
        <label className="campo">
          <span>Usuario</span>
          <input className="entrada" value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())}
            autoComplete="username" autoCapitalize="none" minLength={3} maxLength={30} required />
        </label>
        <div className="campo">
          <label htmlFor="clave-nueva">Contraseña (mínimo 8 caracteres)</label>
          <div className="entrada-con-accion">
            <input id="clave-nueva" className="entrada" type={ver ? 'text' : 'password'} value={clave}
              onChange={(e) => setClave(e.target.value)} autoComplete="new-password" minLength={8} maxLength={100} required />
            <button className="boton-ver-clave" type="button" aria-pressed={ver}
              aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVer(!ver)}>
              {ver ? <Icono.ojoOculto tam={20} /> : <Icono.ojo tam={20} />}
            </button>
          </div>
        </div>

        {error && <p className="error-form" role="alert"><Icono.alerta tam={18} />{error}</p>}
        <button className="btn" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
        <a href="/" style={{ fontSize: '.9rem' }}>Ya tengo cuenta · Entrar</a>
      </form>
    </main>
  );
}
