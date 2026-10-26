import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/600.css';
import '@fontsource/quicksand/700.css';
import './globals.css';

export const metadata = {
  title: 'Two Glass · Registro 6M',
  description: 'Registro de causas de defectos en el estampado de Two Glass (Proyecto Integrador I, TeamGlass).',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icono-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Two Glass 6M', statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#3b4053',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
