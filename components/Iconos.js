// Íconos de trazo (24×24). Los de las 6M se dibujaron para esta plataforma.

function Svg({ children, tam = 24, grosor = 2, className = '', titulo }) {
  return (
    <svg
      className={className}
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      {children}
    </svg>
  );
}

function engranaje() {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = 12 + Math.cos(a) * 6.6, y1 = 12 + Math.sin(a) * 6.6;
    const x2 = 12 + Math.cos(a) * 9.4, y2 = 12 + Math.sin(a) * 9.4;
    d += `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return d;
}
const DIENTES = engranaje();

export const Icono6M = {
  mano_obra: (p) => (
    <Svg {...p}>
      <path d="M8 12.5V6.2a1.4 1.4 0 0 1 2.8 0V11" />
      <path d="M10.8 10.8V4.6a1.4 1.4 0 0 1 2.8 0v6.2" />
      <path d="M13.6 11V5.8a1.4 1.4 0 0 1 2.8 0V12" />
      <path d="M16.4 12V8.6a1.4 1.4 0 0 1 2.8 0v5.2c0 4.2-3 7.2-7 7.2h-.6c-2.3 0-3.8-1-5.1-2.8l-2.6-3.7a1.5 1.5 0 0 1 2.4-1.8L8 14.3" />
    </Svg>
  ),
  medio_ambiente: (p) => (
    <Svg {...p}>
      <path d="M3 9h9.5a2.8 2.8 0 1 0-2.8-2.8" />
      <path d="M3 13h14a2.8 2.8 0 1 1-2.8 2.8" />
      <path d="M3 17h6" />
      <circle cx="19.5" cy="6.5" r=".6" fill="currentColor" />
      <circle cx="21" cy="10" r=".6" fill="currentColor" />
      <circle cx="17" cy="20" r=".6" fill="currentColor" />
    </Svg>
  ),
  maquinaria: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="6.6" />
      <circle cx="12" cy="12" r="2.4" />
      <path d={DIENTES} />
    </Svg>
  ),
  materia_prima: (p) => (
    <Svg {...p}>
      <path d="M10 2.5h4V5c0 1.2 3.2 2.3 3.2 5.6v9.2a1.8 1.8 0 0 1-1.8 1.8H8.6a1.8 1.8 0 0 1-1.8-1.8v-9.2C6.8 7.3 10 6.2 10 5z" />
      <path d="M6.8 12.5h10.4M6.8 17h10.4" />
    </Svg>
  ),
  metodo: (p) => (
    <Svg {...p}>
      <path d="M9 3.5h6v3H9z" />
      <path d="M7.2 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1.2" />
      <path d="M8.3 12.3l2 2 3.6-3.6M8.3 17.5h7.4" />
    </Svg>
  ),
  medicion: (p) => (
    <Svg {...p}>
      <path d="M3.6 17.5a8.4 8.4 0 1 1 16.8 0" />
      <path d="M12 17.5l4.2-5.3" />
      <circle cx="12" cy="17.5" r="1.3" fill="currentColor" />
      <path d="M6.7 13l1.1.8M12 9.2v1.3M17.3 13l-1.1.8" />
    </Svg>
  ),
};

export const Icono = {
  alerta: (p) => (<Svg {...p}><path d="M12 3.2 2.6 19.5h18.8z" /><path d="M12 10v4.2M12 17h.01" /></Svg>),
  check: (p) => (<Svg {...p}><path d="M4.5 12.5l4.5 4.5L19.5 6.5" /></Svg>),
  checkCirculo: (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.7 2.7L16.2 9.4" /></Svg>),
  x: (p) => (<Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>),
  mas: (p) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>),
  menos: (p) => (<Svg {...p}><path d="M5 12h14" /></Svg>),
  deshacer: (p) => (<Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>),
  salir: (p) => (<Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></Svg>),
  expandir: (p) => (<Svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>),
  descarga: (p) => (<Svg {...p}><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15" /></Svg>),
  imagen: (p) => (<Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-5-5-8 8.5" /></Svg>),
  lapiz: (p) => (<Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Svg>),
  basura: (p) => (<Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></Svg>),
  arriba: (p) => (<Svg {...p}><path d="m6 15 6-6 6 6" /></Svg>),
  abajo: (p) => (<Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>),
  derecha: (p) => (<Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>),
  play: (p) => (<Svg {...p}><path d="M7 4.5v15l12-7.5z" /></Svg>),
  pausa: (p) => (<Svg {...p}><path d="M8 5v14M16 5v14" /></Svg>),
  bandera: (p) => (<Svg {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Svg>),
  reloj: (p) => (<Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>),
  resumen: (p) => (<Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></Svg>),
  trabajos: (p) => (<Svg {...p}><rect x="3.5" y="4" width="7" height="16" rx="1.5" /><rect x="13.5" y="4" width="7" height="10" rx="1.5" /></Svg>),
  registros: (p) => (<Svg {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Svg>),
  reporte: (p) => (<Svg {...p}><path d="M7 3.5h7.5L19 8v12.5H7z" /><path d="M14 3.5V8h5M10 13h6M10 16.5h4" /></Svg>),
  pantalla: (p) => (<Svg {...p}><rect x="2.5" y="4" width="19" height="13" rx="1.5" /><path d="M8 20.5h8M12 17v3.5" /></Svg>),
  whatsapp: (p) => (<Svg {...p}><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.6 18.6z" /><path d="M9.2 9.2c.2 2.4 2.6 4.8 5.2 5.4l1.2-1.2-1.8-1-.8.7c-.9-.4-1.9-1.4-2.3-2.3l.7-.8-1-1.8z" /></Svg>),
  copiar: (p) => (<Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></Svg>),
  imprimir: (p) => (<Svg {...p}><path d="M7 9V3.5h10V9M7 17.5H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9.5h14a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-2" /><path d="M7 14h10v6.5H7z" /></Svg>),
  tabla: (p) => (<Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" /></Svg>),
  grafico: (p) => (<Svg {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></Svg>),
  ojo: (p) => (<Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Svg>),
  ojoOculto: (p) => (<Svg {...p}><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.8A10.5 10.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.4 3.2M6.2 6.2C3.8 7.7 2.5 12 2.5 12s3.5 6.5 9.5 6.5a10 10 0 0 0 3-.5" /></Svg>),
  bombillo: (p) => (<Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></Svg>),
  usuario: (p) => (<Svg {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>),
  repetir: (p) => (<Svg {...p}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" /></Svg>),
};
