import type { CartaTipo, Categoria, ContratoEstado, Estado, Interes, KycClienteTipo, KycEstado, Origen, TipoContrato, TipoListado } from './types';

export const ESTADOS: Estado[] = ['nuevo', 'contactado', 'calificado', 'perdido', 'cerrado'];
export const ORIGENES: Origen[] = ['whatsapp', 'formulario_web', 'facebook_ads', 'marketplace', 'referido', 'otro'];
export const INTERESES: Interes[] = ['comprar', 'vender', 'invertir', 'otro'];

export const ORIGEN_LABEL: Record<Origen, string> = {
  whatsapp: 'WhatsApp',
  formulario_web: 'Sitio Web',
  facebook_ads: 'Facebook Ads',
  marketplace: 'Marketplace',
  referido: 'Referido',
  otro: 'Otro',
};

// Para identificar el origen de un vistazo (lista y tarjetas de leads).
export const ORIGEN_ICONO: Record<Origen, string> = {
  whatsapp: 'fab fa-whatsapp',
  formulario_web: 'fas fa-globe',
  facebook_ads: 'fab fa-facebook',
  marketplace: 'fas fa-store',
  referido: 'fas fa-people-arrows',
  otro: 'fas fa-circle-question',
};

export const ESTADO_LABEL: Record<Estado, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  perdido: 'Perdido',
  cerrado: 'Cerrado',
};

export const INTERES_LABEL: Record<Interes, string> = {
  comprar: 'Comprar',
  vender: 'Vender',
  invertir: 'Invertir',
  otro: 'Otro',
};

// Clases Tailwind por estado (chip / columna del pipeline).
export const ESTADO_CLASE: Record<Estado, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-amber-100 text-amber-800',
  calificado: 'bg-emerald-100 text-emerald-800',
  perdido: 'bg-slate-200 text-slate-600',
  cerrado: 'bg-violet-100 text-violet-800',
};

export const CATEGORIAS: Categoria[] = [
  'Vivienda Residencial',
  'RE/MAX Exclusive (Lujo)',
  'Comercial / Industrial',
  'Proyectos y Desarrollos',
];

export const CATEGORIA_ICONO: Record<Categoria, string> = {
  'Vivienda Residencial': 'fas fa-house',
  'RE/MAX Exclusive (Lujo)': 'fas fa-gem',
  'Comercial / Industrial': 'fas fa-building',
  'Proyectos y Desarrollos': 'fas fa-city',
};

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
};

export const PUBLICADA_CLASE: Record<'si' | 'no', string> = {
  si: 'bg-emerald-100 text-emerald-700',
  no: 'bg-slate-200 text-slate-600',
};

export const KYC_ESTADOS: KycEstado[] = ['pendiente', 'cerrado', 'cancelado'];

export const KYC_ESTADO_LABEL: Record<KycEstado, string> = {
  pendiente: 'Pendiente',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export const KYC_ESTADO_CLASE: Record<KycEstado, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  cerrado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-slate-200 text-slate-600',
};

export const KYC_CLIENTE_TIPO_LABEL: Record<KycClienteTipo, string> = {
  persona_natural: 'Persona natural',
  persona_juridica: 'Persona jurídica',
};

// Borradores editables -- el agente los ajusta antes de guardar. No incluir
// resultados de AML ni decisiones de Cumplimiento (así lo pide el formulario
// de referencia de Walter).
export const KYC_MOTIVO_PLANTILLAS: Record<string, { label: string; texto: string }> = {
  captacion: {
    label: 'Captación',
    texto: 'Diligencia de captación de inmueble en gestión con el cliente. Describí el inmueble, su ubicación aproximada y cómo se originó la relación con el cliente.',
  },
  cliente_comprador: {
    label: 'Cliente comprador',
    texto: 'Cliente interesado en comprar un inmueble. Describí el inmueble de interés, el monto aproximado de la operación y cómo se originó la relación con el cliente.',
  },
  oferta_compra: {
    label: 'Oferta de compra',
    texto: 'El cliente presentó una oferta de compra. Describí el inmueble, el monto ofrecido, la forma de pago y cómo se originó la relación con el cliente.',
  },
  venta: {
    label: 'Venta',
    texto: 'Cliente propietario en proceso de venta de un inmueble. Describí el inmueble, el monto aproximado de la operación y cómo se originó la relación con el cliente.',
  },
  alquiler_inquilino: {
    label: 'Alquiler - inquilino',
    texto: 'Cliente interesado en alquilar un inmueble. Describí el inmueble de interés, el monto aproximado del alquiler y cómo se originó la relación con el cliente.',
  },
  alquiler_propietario: {
    label: 'Alquiler - propietario',
    texto: 'Cliente propietario que pone un inmueble en alquiler. Describí el inmueble, el monto aproximado del alquiler y cómo se originó la relación con el cliente.',
  },
};

export const CONTRATO_ESTADOS: ContratoEstado[] = ['pendiente', 'firmado', 'cancelado'];

export const CONTRATO_ESTADO_LABEL: Record<ContratoEstado, string> = {
  pendiente: 'Pendiente',
  firmado: 'Firmado',
  cancelado: 'Cancelado',
};

export const CONTRATO_ESTADO_CLASE: Record<ContratoEstado, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  firmado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-slate-200 text-slate-600',
};

export const TIPO_LISTADO_LABEL: Record<TipoListado, string> = {
  exclusivo: 'Exclusivo',
  no_exclusivo: 'No exclusivo',
};

export const CARTA_TIPOS: CartaTipo[] = ['oferta', 'oferta_venta', 'presentacion', 'aceptacion', 'contraoferta'];

export const CARTA_TIPO_LABEL: Record<CartaTipo, string> = {
  oferta: 'Oferta de compra',
  oferta_venta: 'Oferta de venta',
  presentacion: 'Presentación',
  aceptacion: 'Aceptación',
  contraoferta: 'Contraoferta',
};

export const CARTA_TIPO_CLASE: Record<CartaTipo, string> = {
  oferta: 'bg-blue-100 text-blue-800',
  oferta_venta: 'bg-indigo-100 text-indigo-800',
  presentacion: 'bg-slate-100 text-slate-700',
  aceptacion: 'bg-emerald-100 text-emerald-800',
  contraoferta: 'bg-amber-100 text-amber-800',
};
