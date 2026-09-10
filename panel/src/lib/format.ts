export function esHoy(fechaIso: string): boolean {
  return new Date(fechaIso).toDateString() === new Date().toDateString();
}

export function formatearFecha(fechaIso: string): string {
  const f = new Date(fechaIso);
  const hora = f.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  return esHoy(fechaIso) ? `Hoy ${hora}` : `${f.toLocaleDateString('es-SV')} ${hora}`;
}

export function diasDesde(fechaIso: string): number {
  return Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86_400_000);
}

export function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
