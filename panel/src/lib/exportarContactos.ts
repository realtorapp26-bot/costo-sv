// ============================================================
//  Costo SV — Exportar los contactos del pipeline a CSV
//
//  Para qué: trabajar los leads fuera del panel — subirlos como Audiencia
//  Personalizada en Meta, importarlos a WhatsApp Business, o repasarlos en
//  una hoja de cálculo. Exporta SIEMPRE la lista que se está viendo, con
//  los filtros aplicados.
// ============================================================

import type { LeadConContacto } from './types';
import { ORIGEN_LABEL, formatearCampana } from './enums';

// Meta cruza mejor los números en formato internacional. Un número suelto de
// 8 dígitos en El Salvador es local -> se le pone +503. Los que ya traen
// código de país (extranjeros) se respetan tal cual.
// Ojo con inventar código de país: un número cargado como "700 028384" tiene
// 9 dígitos y no es ni salvadoreño de 8 ni un internacional reconocible — si
// se le pusiera "+" delante quedaría "+700028384", un país inexistente. En
// esos casos se devuelve tal cual: que Meta no lo cruce es mejor que cruzarlo
// mal.
export function telefonoParaMeta(tel: string | null | undefined): string {
  const limpio = String(tel || '').replace(/[^\d+]/g, '');
  if (!limpio) return '';
  if (limpio.startsWith('+')) return limpio;
  if (limpio.length === 8) return '+503' + limpio;                  // local
  if (limpio.length === 11 && limpio.startsWith('503')) return '+' + limpio;
  if (limpio.length >= 10 && limpio.length <= 15) return '+' + limpio; // internacional plausible
  return limpio;                                                    // ambiguo: sin tocar
}

const celda = (v: unknown): string => {
  const t = v == null ? '' : String(v);
  return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};

export function exportarContactos(leads: LeadConContacto[]): void {
  const columnas = ['Nombre', 'Telefono', 'Telefono internacional', 'Correo', 'Origen',
    'Interes', 'Estado', 'Campana', 'Pagina', 'Propiedad o anuncio', 'Fecha', 'Notas'];

  const filas = leads.map((l) => {
    const c = l.contactos || { nombre: '', telefono: '', correo: '' };
    const camp = formatearCampana(l.campana);
    return [
      c.nombre, c.telefono, telefonoParaMeta(c.telefono), c.correo,
      ORIGEN_LABEL[l.origen] ?? l.origen, l.interes, l.estado,
      [camp.titulo, camp.fuente].filter(Boolean).join(' — '),
      l.pagina, l.propiedad_referencia,
      new Date(l.created_at).toLocaleString('es-SV'),
      (l.notas || '').replace(/\s*\n\s*/g, ' | '),
    ].map(celda).join(',');
  });

  // El BOM es lo que hace que Excel abra los acentos bien.
  const csv = '﻿' + columnas.join(',') + '\n' + filas.join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contactos-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
