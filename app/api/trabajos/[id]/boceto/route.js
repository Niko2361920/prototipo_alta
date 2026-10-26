import { guardarBoceto, leerBoceto } from '@/lib/datos';
import { cuerpo, error, exigir, ok } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { respuesta } = await exigir();
  if (respuesta) return respuesta;
  const { id } = await params;
  const b = await leerBoceto(id);
  if (!b) return error(404, 'Sin boceto.');
  return new Response(Buffer.from(b.base64, 'base64'), {
    headers: {
      'Content-Type': b.tipo,
      'Cache-Control': 'private, max-age=31536000, immutable',
      // Un SVG puede traer <script>. Dentro de <img> no se ejecuta, pero si alguien
      // abre la URL directo sí. La CSP con sandbox bloquea scripts y formularios
      // en ese caso; nosniff evita que el navegador lo interprete como otro tipo.
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function PUT(req, { params }) {
  const { respuesta } = await exigir('gerente');
  if (respuesta) return respuesta;
  const { id } = await params;
  try {
    const { dataUrl } = await cuerpo(req);
    const version = await guardarBoceto(id, dataUrl);
    return ok({ version });
  } catch (e) {
    return error(400, e.message);
  }
}
