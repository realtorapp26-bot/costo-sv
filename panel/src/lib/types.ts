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

export type TipoListado = 'exclusivo' | 'no_exclusivo';
export type ContratoEstado = 'pendiente' | 'firmado' | 'cancelado';

export interface ItemInventario {
  item: string;
  descripcion: string;
  cantidad: string;
}

// Refleja supabase/migrations/20261020000000_contratos_schema.sql. El
// vendedor completa vendedor_firma_nombre/fecha y pdf_path desde
// contrato-firma.html (server-side, vía /api/lead) -- quedan en null hasta
// que firma.
export interface ContratoComercializacion {
  id: string;
  numero: string;
  fecha_acuerdo: string;
  vendedor_nombre: string;
  corredor_nombre: string;
  propiedad_descripcion: string;
  propiedad_registro: string | null;
  propiedad_direccion: string | null;
  propiedad_gravamenes: string | null;
  propiedad_certificado: string | null;
  precio_lista: number;
  tipo_listado: TipoListado;
  comision_porcentaje: number;
  comision_incluye_iva: boolean;
  plazo_meses: number;
  plazo_inicio: string;
  plazo_fin: string;
  periodo_proteccion_dias: number;
  inventario: ItemInventario[];
  notas: string | null;
  estado: ContratoEstado;
  corredor_firma_path: string | null;
  vendedor_firma_nombre: string | null;
  vendedor_firma_fecha: string | null;
  pdf_path: string | null;
  completado_at: string | null;
  created_at: string;
  updated_at: string;
}

// Campos reusables de un contrato (sin fechas ni firma -- esas siempre se
// vuelven a poner frescas en cada contrato nuevo que se crea desde el
// borrador). Refleja supabase/migrations/20261021000000_contrato_borradores.sql.
export interface CamposContratoBorrador {
  vendedor_nombre: string;
  corredor_nombre: string;
  propiedad_descripcion: string;
  propiedad_registro: string | null;
  propiedad_direccion: string | null;
  propiedad_gravamenes: string | null;
  propiedad_certificado: string | null;
  precio_lista: number;
  tipo_listado: TipoListado;
  comision_porcentaje: number;
  comision_incluye_iva: boolean;
  plazo_meses: number;
  periodo_proteccion_dias: number;
  inventario: ItemInventario[];
  notas: string | null;
}

export interface ContratoBorrador {
  id: string;
  nombre: string;
  campos: CamposContratoBorrador;
  created_at: string;
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

export type CartaTipo = 'oferta' | 'oferta_venta' | 'presentacion' | 'aceptacion' | 'contraoferta';

// Plantilla reusable de una propiedad para la carta de oferta: precarga el
// inmueble, el precio de lista, la forma de pago y el listado de bienes o
// generalidades. La lectura es pública (carta-oferta.html la usa sin login);
// crear, editar y borrar es solo del panel.
export interface ItemInventarioOferta {
  item: string;
  descripcion: string;
  cantidad: string;
}

export interface OfertaBorrador {
  id: string;
  nombre: string;
  tipo_oferta: 'VENTA' | 'ALQUILER' | null;
  ciudad_emision: string | null;
  propiedad_municipio: string | null;
  propiedad_departamento: string | null;
  propiedad_direccion: string | null;
  precio_lista: number | null;
  rental_term: string | null;
  owner_conditions: string | null;
  payment_method: string | null;
  payment_details: string | null;
  notas_adicionales: string | null;
  titulo_inventario: string | null;
  inventario: ItemInventarioOferta[] | null;
  created_at: string;
}

export type NuevoOfertaBorrador = Omit<OfertaBorrador, 'id' | 'created_at'>;

export interface GastosCierre {
  transferTax: number;
  cnrFee: number;
  total: number;
  grandTotal: number;
}

// Archivo de cartas generadas y firmadas: ofertas de compra (las firma el
// comprador), ofertas de venta (las firma el propietario y van dirigidas al
// comprador), aceptaciones y contraofertas. Las inserta el servidor desde
// /api/lead; el panel solo lee y borra.
export interface Carta {
  id: string;
  numero: string;
  tipo: CartaTipo;
  transaccion: 'VENTA' | 'ALQUILER';
  idioma: string;
  cliente_nombre: string | null;
  cliente_documento: string | null;
  propietario_nombre: string | null;
  propietario_documento: string | null;
  propiedad_municipio: string | null;
  propiedad_departamento: string | null;
  propiedad_direccion: string | null;
  monto: number | null;
  precio_lista: number | null;
  vigencia: string | null;
  sujeto_venta_previa: boolean | null;
  forma_pago: string | null;
  detalle_pago: string | null;
  plazo: string | null;
  bienes: string[] | null;
  gastos_cierre: GastosCierre | null;
  notas: string | null;
  pdf_path: string | null;
  created_at: string;
}
