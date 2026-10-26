'use client';
// GERENCIA · Angélica ve todo organizado desde el computador, la tablet o el celular.
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Icono } from '@/components/Iconos';
import { api } from '@/components/ui';
import Resumen from './Resumen';
import Trabajos from './Trabajos';
import Registros from './Registros';
import Reporte from './Reporte';

const SECCIONES = [
  { id: 'resumen', nombre: 'Resumen', Ico: Icono.resumen, C: Resumen },
  { id: 'trabajos', nombre: 'Trabajos', Ico: Icono.trabajos, C: Trabajos },
  { id: 'registros', nombre: 'Registros', Ico: Icono.registros, C: Registros },
  { id: 'reporte', nombre: 'Reporte', Ico: Icono.reporte, C: Reporte },
];

export default function Gerencia() {
  const [seccion, setSeccion] = useState('resumen');
  const [yo, setYo] = useState(null);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (SECCIONES.some((s) => s.id === h)) setSeccion(h);
    api('/api/auth/yo').then(setYo).catch(() => {});
    const f = () => {
      const x = window.location.hash.slice(1);
      if (SECCIONES.some((s) => s.id === x)) setSeccion(x);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const ir = (id) => {
    setSeccion(id);
    history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  };
  const salir = async () => {
    await fetch('/api/auth/salir', { method: 'POST' });
    window.location.href = '/';
  };
  const Actual = SECCIONES.find((s) => s.id === seccion).C;
  const primerNombre = yo?.nombre?.split(' ')[0] || 'Angélica';

  return (
    <div className="ger">
      <aside className="ger-lateral">
        <div className="ger-logo">
          <span className="logo-caja"><Logo alto={44} /></span>
          <div><b>Gerencia</b><small>Registro de causas 6M</small></div>
        </div>
        <nav className="ger-nav" aria-label="Secciones">
          {SECCIONES.map((s) => (
            <button key={s.id} aria-current={seccion === s.id ? 'page' : undefined} onClick={() => ir(s.id)}>
              <s.Ico tam={20} />{s.nombre}
            </button>
          ))}
          <a href="/produccion" target="_blank" rel="noreferrer"><Icono.pantalla tam={20} />Ver pantalla de producción</a>
        </nav>
        <div className="ger-usuario">
          <span className="avatar" style={{ background: 'var(--menta)', color: '#111' }}>{primerNombre[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: '.92rem' }}>{yo?.nombre || 'Angélica Alejo Aguilar'}</b>
            <small>Gerente</small>
          </div>
          <button className="btn fantasma icono chico" style={{ color: '#fff' }} onClick={salir} aria-label="Salir"><Icono.salir tam={18} /></button>
        </div>
      </aside>

      <header className="movil-cab">
        <span className="logo-caja"><Logo alto={30} /></span>
        <b style={{ flex: 1 }}>Gerencia</b>
        <a className="btn fantasma icono chico" style={{ color: '#fff' }} href="/produccion" aria-label="Ver pantalla de producción"><Icono.pantalla tam={20} /></a>
        <button className="btn fantasma icono chico" style={{ color: '#fff' }} onClick={salir} aria-label="Salir"><Icono.salir tam={20} /></button>
      </header>

      <main className="ger-main">
        <Actual nombre={primerNombre} ir={ir} />
      </main>

      <nav className="movil-nav" aria-label="Secciones">
        {SECCIONES.map((s) => (
          <button key={s.id} aria-current={seccion === s.id ? 'page' : undefined} onClick={() => ir(s.id)}>
            <s.Ico tam={22} />{s.nombre}
          </button>
        ))}
      </nav>
    </div>
  );
}
