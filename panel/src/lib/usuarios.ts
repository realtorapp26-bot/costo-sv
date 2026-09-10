// Mapa de correos conocidos del equipo -> nombre para mostrar.
// Cuando exista el modelo de usuarios/roles del núcleo, esto sale de la base.
const NOMBRES: Record<string, string> = {
  'walter.oana@gmail.com': 'Walter Guerrero',
  'walter.guerrero@remax.com.sv': 'Walter Guerrero',
};

export function nombreDe(email: string | null | undefined): string {
  if (!email) return 'Equipo';
  return NOMBRES[email.toLowerCase()] ?? email.split('@')[0];
}
