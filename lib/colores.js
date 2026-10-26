// Color aproximado de la tinta para mostrar una muestra junto al nombre
const MAPA = {
  blanco: '#f4f4f2', blanca: '#f4f4f2', negro: '#1d1f24', negra: '#1d1f24', dorado: '#c9a227', dorada: '#c9a227',
  plateado: '#b8bec4', plateada: '#b8bec4', rojo: '#c0392b', roja: '#c0392b', azul: '#1f5fa8', verde: '#2f7d5b',
  amarillo: '#f2c230', amarilla: '#f2c230', naranja: '#e8742a', rosado: '#e58fb0', rosada: '#e58fb0', morado: '#6d3fa0',
  morada: '#6d3fa0', gris: '#8a9199', cafe: '#7a4b2a', café: '#7a4b2a', vinotinto: '#6b1f2e', turquesa: '#21a5a5',
};
export function colorTinta(nombre) {
  const k = (nombre || '').toLowerCase().trim().split(/\s+/)[0];
  return MAPA[k] || null;
}
