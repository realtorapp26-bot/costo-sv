// ============================================================
//  Costo SV — Configuración CENTRAL del sitio
//  Editá los valores SOLO acá. app.js y las páginas leen de aquí.
// ============================================================
window.SITE_CONFIG = {
  // Dominio final (con https://, sin barra final). Registrado en Cloudflare
  // el 28/07/2026. El ápex es el canónico; www redirige al ápex en Vercel.
  // Fuente única: build-seo.mjs lee este valor para canonical/OG/JSON-LD.
  SITE_URL: 'https://guerrero-properties.com',

  // WhatsApp de contacto: número internacional LIMPIO (sin +, espacios ni guiones).
  // Confirmado 28/07/2026: +503 7038-1941  ->  50370381941
  WHATSAPP_NUMBER: '50370381941',

  // Webhook de leads (n8n/CRM). VACÍO = no configurado: no se simula éxito,
  // se degrada a WhatsApp y se guarda el lead localmente. Cuando exista uno real,
  // pegar la URL acá y se activa el envío automático.
  WEBHOOK_URL: '',

  // Backend propio de Costo SV (Supabase, proyecto separado del de Cavaler).
  // La SUPABASE_ANON_KEY es pública por diseño (clave "publishable") — está
  // pensada para exponerse en el navegador. Nunca poner acá la secret/service_role.
  SUPABASE_URL: 'https://iseoyfiteeobzvtfjhoe.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_EWNNEWfk4DjuIGwkrbtx4g_PFMtzhSv',

  // Datos comprobados para SEO/JSON-LD (solo lo verificable que ya está en el sitio).
  BUSINESS: {
    name: 'Walter Guerrero',
    jobTitle: 'Agente Inmobiliario',
    affiliation: 'RE/MAX Elite',
    areaServed: 'El Salvador',
    telephone: '+503 7038-1941',
    email: 'walter.guerrero@remax.com.sv',
  },
};
