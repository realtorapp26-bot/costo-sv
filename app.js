// ============================================================
//  Costo SV — Lógica de UI y captación de leads
//  WhatsApp, dominio y webhook viven en config.js (window.SITE_CONFIG).
//  PRIVACIDAD: no se persisten datos personales en el navegador
//  (sin localStorage). Los datos viven solo en memoria durante el envío.
// ============================================================
(function () {
  const CFG = window.SITE_CONFIG || {};
  const WA_NUMBER = String(CFG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const WEBHOOK_URL = CFG.WEBHOOK_URL || '';
  const WEBHOOK_ENABLED = !!WEBHOOK_URL;
  const SUPA_URL = CFG.SUPABASE_URL || '';
  const SUPA_KEY = CFG.SUPABASE_ANON_KEY || '';
  const SUPA_ENABLED = !!(SUPA_URL && SUPA_KEY);

  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  function mapInteres(path) {
    if (path.includes('vender')) return 'vender';
    if (path.includes('comprar')) return 'comprar';
    if (path.includes('invertir')) return 'invertir';
    return 'otro';
  }

  // Guarda el lead en el CRM propio (Supabase). Independiente del webhook de
  // n8n: corre siempre que haya credenciales configuradas, sin bloquear ni
  // condicionar la experiencia de WhatsApp del visitante.
  async function guardarLeadEnCRM(payload, path) {
    if (!SUPA_ENABLED) return false;
    const headers = {
      'Content-Type': 'application/json',
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      Prefer: 'return=minimal',
    };
    const contactoId = crypto.randomUUID();

    const contactoRes = await fetch(`${SUPA_URL}/rest/v1/contactos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: contactoId,
        nombre: payload.nombre || 'Sin nombre',
        telefono: payload.telefono || payload.whatsapp || '',
        correo: payload.email || '',
      }),
    });
    if (!contactoRes.ok) return false;

    const leadRes = await fetch(`${SUPA_URL}/rest/v1/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contacto_id: contactoId,
        origen: 'formulario_web',
        interes: mapInteres(path),
        propiedad_referencia: payload.tipo_propiedad || null,
        notas: payload.mensaje || null,
      }),
    });
    return leadRes.ok;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // Mensaje contextual de WhatsApp por página
    let waMessage = 'Hola Walter, me gustaría recibir asesoría inmobiliaria.';
    if (path.includes('vender')) waMessage = 'Hola Walter, estoy interesado en vender mi propiedad.';
    else if (path.includes('comprar')) waMessage = 'Hola Walter, estoy interesado en comprar una propiedad.';
    else if (path.includes('invertir')) waMessage = 'Hola Walter, soy inversionista y me interesan las oportunidades en El Salvador.';
    else if (path.includes('menajes')) waMessage = 'Hola Walter, quiero información sobre menajes y mudanza a El Salvador.';
    else if (path.includes('costo-vida')) waMessage = 'Hola Walter, vi el comparador de costo de vida y quiero recibir asesoría.';
    else if (path.includes('propiedades')) waMessage = 'Hola Walter, quiero conocer más sobre las propiedades disponibles.';

    // Enlaces de WhatsApp: marcados EXPLÍCITAMENTE con [data-whatsapp] (no por ícono).
    if (WA_NUMBER) {
      document.querySelectorAll('a[data-whatsapp]').forEach((a) => {
        a.href = waLink(a.getAttribute('data-wa') || waMessage); // data-wa: mensaje propio opcional
        a.target = '_blank';
        a.rel = 'noopener';
      });
    }

    // Formularios de captación
    document.querySelectorAll('.webhook-form').forEach((form) => setupForm(form, path));

    // Menú móvil
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) mobileBtn.addEventListener('click', () => navLinks.classList.toggle('active'));

    // Botón flotante de WhatsApp: se oculta mientras el botón de WhatsApp
    // propio del hero esté visible, para no superponerse con él (pasaba en
    // el hero de index.html, sobre todo en móvil).
    const floatingWa = document.querySelector('.floating-whatsapp');
    const heroWaButtons = document.querySelectorAll('.hero .btn-whatsapp');
    if (floatingWa && heroWaButtons.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const algunoVisible = entries.some((entry) => entry.isIntersecting);
        floatingWa.style.opacity = algunoVisible ? '0' : '';
        floatingWa.style.pointerEvents = algunoVisible ? 'none' : '';
      }, { threshold: 0.15 });
      heroWaButtons.forEach((btn) => observer.observe(btn));
    }
  });

  // Payload SOLO en memoria: todos los campos del formulario + metadatos.
  function buildPayload(form, path) {
    const payload = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });
    if (!payload.pagina_origen) payload.pagina_origen = path;
    payload.fecha_creado = new Date().toISOString();
    return payload;
  }

  // Mensaje de WhatsApp con los datos cargados (se arma al vuelo, no se almacena).
  function resumenLead(p) {
    const campos = [
      ['Nombre', p.nombre], ['Email', p.email], ['Teléfono', p.telefono], ['WhatsApp', p.whatsapp],
      ['Servicio', p.servicio], ['Motivo', p.motivo], ['Tipo de propiedad', p.tipo_propiedad],
      ['Interés', p.interes_inmobiliario], ['Tiempo', p.tiempo], ['Presupuesto', p.presupuesto],
      ['Ciudad de origen', p.ciudad_origen], ['Mensaje', p.mensaje],
    ].filter(([, v]) => v);
    return 'Hola Walter, quiero contactarte:\n' + campos.map(([k, v]) => `${k}: ${v}`).join('\n');
  }

  function setupForm(form, path) {
    let box = form.querySelector('.form-alert');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-alert';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      box.style.cssText = 'display:none;margin-bottom:16px;padding:12px 16px;border-radius:8px;font-weight:500;';
      form.prepend(box);
    }
    const show = (msg, ok) => {
      box.innerHTML = msg;
      box.style.background = ok ? '#e7f7ec' : '#fff4e5';
      box.style.color = ok ? '#1b5e20' : '#7a4a00';
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const btnText = btn ? btn.innerHTML : '';
      if (btn) { btn.innerHTML = 'Enviando...'; btn.disabled = true; }

      const payload = buildPayload(form, path);   // en memoria; no se persiste
      const wa = waLink(resumenLead(payload));

      guardarLeadEnCRM(payload, path).catch((err) => console.error('No se pudo guardar el lead en el CRM:', err));

      try {
        if (!WEBHOOK_ENABLED) {
          // Sin webhook real: NO simular éxito, NO decir que guardamos, NO limpiar el form.
          // Se abre WhatsApp con el mensaje ya preparado. Los campos quedan llenos para reintentar.
          const win = window.open(wa, '_blank', 'noopener');
          const extra = win ? '' : ` Si no se abrió, <a href="${wa}" target="_blank" rel="noopener" style="font-weight:700;text-decoration:underline;">tocá aquí para abrir WhatsApp</a>.`;
          show('El envío automático aún no está activo. Enviaremos tu información mediante WhatsApp.' + extra, false);
          return;
        }
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (res.ok) {                              // ÚNICA confirmación real
          show('¡Información enviada con éxito! Walter se pondrá en contacto pronto.', true);
          form.reset();                            // limpiar SOLO con confirmación del webhook
        } else {
          show(`No pudimos enviar el formulario (código ${res.status}). <a href="${wa}" target="_blank" rel="noopener" style="font-weight:700;text-decoration:underline;">Escribinos por WhatsApp</a> y no perdés tu consulta.`, false);
        }
      } catch (err) {
        console.error('Error enviando el lead:', err);
        show(`Hubo un problema de conexión. <a href="${wa}" target="_blank" rel="noopener" style="font-weight:700;text-decoration:underline;">Enviá tu información por WhatsApp</a>.`, false);
      } finally {
        if (btn) { btn.innerHTML = btnText; btn.disabled = false; }
      }
    });
  }
})();
