// Fechas en hora de Colombia (UTC-5, sin horario de verano).
const OFFSET_MS = 5 * 60 * 60 * 1000;

// Inicio del día en Bogotá para una fecha dada, como Date en UTC
export function inicioDia(fecha = new Date()) {
  const local = new Date(fecha.getTime() - OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + OFFSET_MS);
}

export function sumarDias(fecha, dias) {
  return new Date(fecha.getTime() + dias * 86400000);
}

// "2026-10-25" (día en Bogotá)
export function claveDia(fecha) {
  return new Date(new Date(fecha).getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

// Recibe 'AAAA-MM-DD' y devuelve el inicio de ese día en Bogotá
export function desdeClave(clave) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d) + OFFSET_MS);
}

export const PERIODOS = [
  { id: 'hoy', nombre: 'Hoy', dias: 1 },
  { id: '7d', nombre: '7 días', dias: 7 },
  { id: '30d', nombre: '30 días', dias: 30 },
  { id: '90d', nombre: '90 días', dias: 90 },
  { id: 'todo', nombre: 'Todo', dias: null },
];

export function rangoPeriodo(id, ahora = new Date()) {
  const p = PERIODOS.find((x) => x.id === id) || PERIODOS[2];
  const hasta = sumarDias(inicioDia(ahora), 1);
  const desde = p.dias ? sumarDias(hasta, -p.dias) : new Date(Date.UTC(2020, 0, 1));
  return { desde, hasta, periodo: p };
}
