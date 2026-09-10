// Tipos de fila escritos a mano (v1). Reemplazar por `supabase gen types typescript`
// cuando haya token de Supabase. Reflejan supabase/migrations/20260724000000_core_leads_schema.sql
// + 20260909000000_ofertas_pdf.sql.

export type Origen = 'whatsapp' | 'formulario_web' | 'marketplace' | 'referido' | 'otro';
export type Interes = 'comprar' | 'vender' | 'invertir' | 'otro';
export type Estado = 'nuevo' | 'contactado' | 'calificado' | 'perdido' | 'cerrado';
export type TipoActividad = 'llamada' | 'whatsapp' | 'nota' | 'cita' | 'correo' | 'otro';

export interface Contacto {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  contacto_id: string;
  origen: Origen;
  interes: Interes;
  propiedad_referencia: string | null;
  estado: Estado;
  notas: string | null;
  oferta_pdf_path: string | null;
  created_at: string;
  updated_at: string;
}

// Lo que devuelve useLeads(): lead + contacto embebido.
export interface LeadConContacto {
  id: string;
  origen: Origen;
  interes: Interes;
  propiedad_referencia: string | null;
  estado: Estado;
  notas: string | null;
  oferta_pdf_path: string | null;
  created_at: string;
  contactos: Pick<Contacto, 'nombre' | 'telefono' | 'correo'> | null;
}

export interface Actividad {
  id: string;
  lead_id: string;
  tipo: TipoActividad;
  detalle: string | null;
  created_at: string;
}
