import { NextResponse } from 'next/server';
import { COOKIE, leerSesion, inicioDe } from './lib/sesion';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const sesion = await leerSesion(req.cookies.get(COOKIE)?.value);

  if (pathname === '/') {
    if (sesion) return NextResponse.redirect(new URL(inicioDe(sesion.rol), req.url));
    return NextResponse.next();
  }
  if (!sesion) return NextResponse.redirect(new URL('/', req.url));
  if (pathname.startsWith('/gerencia') && sesion.rol !== 'gerente') {
    return NextResponse.redirect(new URL('/produccion', req.url));
  }
  // La gerente también puede abrir la vista de producción (para revisarla)
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/gerencia/:path*', '/produccion/:path*'],
};
