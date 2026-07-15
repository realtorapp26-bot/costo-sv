// ============================================================
//  Costo SV — Configuración CENTRAL del sitio
//  Editá los valores SOLO acá. app.js y las páginas leen de aquí.
// ============================================================
window.SITE_CONFIG = {
  // Dominio final (con https://, sin barra final). PENDIENTE: dejar vacío
  // hasta tenerlo. La validación pre-deploy (predeploy-check.mjs) FALLA si
  // sigue vacío o si quedan marcadores %%SITE_URL%% sin resolver.
  // NO publicar canonical/sitemap/JSON-LD con un dominio inventado.
  SITE_URL: '',

  // WhatsApp de contacto: número internacional LIMPIO (sin +, espacios ni guiones).
  // Provisional confirmado: +503 7038-4194  ->  50370384194
  WHATSAPP_NUMBER: '50370384194',

  // Webhook de leads (n8n/CRM). VACÍO = no configurado: no se simula éxito,
  // se degrada a WhatsApp y se guarda el lead localmente. Cuando exista uno real,
  // pegar la URL acá y se activa el envío automático.
  WEBHOOK_URL: '',

  // Datos comprobados para SEO/JSON-LD (solo lo verificable que ya está en el sitio).
  BUSINESS: {
    name: 'Walter Guerrero',
    jobTitle: 'Agente Inmobiliario',
    affiliation: 'RE/MAX El Salvador',
    areaServed: 'El Salvador',
    telephone: '+503 7038-4194',
    email: 'walter.guerrero@remax.com.sv',
  },
};
