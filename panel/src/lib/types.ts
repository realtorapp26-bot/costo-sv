// Tipos de fila escritos a mano (v1). Reemplazar por `supabase gen types typescript`
// cuando haya token de Supabase. Reflejan supabase/migrations/20260724000000_core_leads_schema.sql
// + 20260909000000_ofertas_pdf.sql.

export type Origen = 'whatsapp' | 'formulario_web' | 'marketplace' | 'referido' | 'otro' | 'facebook_ads';
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

export type KycClienteTipo = 'persona_natural' | 'persona_juridica';
export type KycEstado = 'pendiente' | 'cerrado' | 'cancelado';

// Refleja supabase/migrations/20261018000000_kyc_schema.sql +
// 20261018020000_kyc_cliente_fase2.sql. Los campos cliente_* y pdf_path
// los llena el cliente desde kyc-cliente.html (server-side, vía
// /api/kyc-completar) -- quedan en null hasta que completa su parte.
export interface KycSolicitud {
  id: string;
  numero: string;
  oficina: string;
  solicitante: string;
  cliente_tipo: KycClienteTipo;
  cliente_nombre: string;
  cliente_correo: string | null;
  motivo_diligencia: string;
  estado: KycEstado;
  doc_frontal_path: string | null;
  doc_reverso_path: string | null;
  vence_at: string | null;
  cliente_fecha_nacimiento: string | null;
  cliente_nacionalidad: string | null;
  cliente_pais_residencia: string | null;
  cliente_direccion: string | null;
  cliente_documento_tipo: 'DUI' | 'NIT' | 'PASAPORTE' | null;
  cliente_documento_numero: string | null;
  cliente_telefono: string | null;
  cliente_ocupacion: string | null;
  pdf_path: string | null;
  completado_at: string | null;
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

export type Categoria =
  | 'Vivienda Residencial'
  | 'RE/MAX Exclusive (Lujo)'
  | 'Comercial / Industrial'
  | 'Proyectos y Desarrollos';
export type TipoContrato = 'venta' | 'alquiler';

// Refleja la tabla propiedades tal cual (confirmado contra una fila real).
// habitaciones/banos/m2/tamano_lote/tamano_construccion son texto libre,
// no numéricos -- así los trata el panel clásico y así vienen de RE/MAX.
export interface Propiedad {
  id: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
  orden: number | null;
  publicada: boolean;
  titulo: string;
  precio: string;
  ubicacion: string | null;
  categoria: Categoria;
  tipo_contrato: TipoContrato;
  tipo_propiedad_detalle: string | null;
  habitaciones: string | null;
  banos: string | null;
  m2: string | null;
  tamano_lote: string | null;
  tamano_construccion: string | null;
  latitud: number | null;
  longitud: number | null;
  garage: boolean | null;
  hoa: boolean | null;
  comunidad_cerrada: boolean | null;
  propiedad_nueva: boolean | null;
  fotos: string[] | null;
  tour_virtual_url: string | null;
  video_url: string | null;
  descripcion_original: string | null;
  copy_venta: string | null;
  // Procedencia (importación RE/MAX) -- solo lectura en el panel nuevo por ahora.
  link_referencia: string | null;
  id_externo: string | null;
  fecha_publicacion: string | null;
}
