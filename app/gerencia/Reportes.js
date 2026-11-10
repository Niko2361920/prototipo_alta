'use client';
// Sección «Reporte»: el del día (WhatsApp) y el del mes (materia prima y presupuesto).
import { useEffect, useState } from 'react';
import Reporte from './Reporte';
import ReporteMes from './ReporteMes';

export default function Reportes(props) {
  const [vista, setVista] = useState('dia');
  useEffect(() => {
    try { if (localStorage.getItem('tg_vista_reporte') === 'mes') setVista('mes'); } catch {}
  }, []);
  const cambiar = (v) => {
    setVista(v);
    try { localStorage.setItem('tg_vista_reporte', v); } catch {}
  };
  return (
    <>
      <div className="segmento no-imprimir" role="group" aria-label="Tipo de reporte" style={{ marginBottom: '1rem' }}>
        <button aria-pressed={vista === 'dia'} onClick={() => cambiar('dia')}>Del día</button>
        <button aria-pressed={vista === 'mes'} onClick={() => cambiar('mes')}>Del mes · materia prima</button>
      </div>
      {vista === 'dia' ? <Reporte {...props} /> : <ReporteMes {...props} />}
    </>
  );
}
