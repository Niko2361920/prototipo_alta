'use client';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';

export default function Registro() {
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
        body: JSON.stringify({ nombre, usuario, clave }),
      });
      const d = await r.json();
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
