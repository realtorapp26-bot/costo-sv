// ============================================================
//  Costo SV — Lógica de UI y captación de leads
//  WhatsApp, dominio y webhook viven en config.js (window.SITE_CONFIG).
//  PRIVACIDAD: no se persisten datos personales en el navegador
//  (sin localStorage). Los datos viven solo en memoria durante el envío.
// ============================================================

// Las fotos vienen directo del CDN de RE/MAX o de Supabase Storage a su
// tamaño y peso original (algunas pesan varios MB) aunque en el sitio se
// muestren en una tarjeta de 300-400px. Esta función las reescribe para
// que pasen por el optimizador de imágenes de Vercel (recorta al ancho
// pedido y comprime) -- ver "images" en vercel.json para los dominios
// permitidos. Si la URL no es de uno de esos dominios, se devuelve igual.
//
// Vercel solo acepta anchos "w" que estén en la lista "sizes" de
// vercel.json -- cualquier otro valor responde 400 y la imagen no carga.
// Por eso acá se redondea siempre hacia arriba al tamaño permitido más
// cercano, en vez de pasar el ancho pedido tal cual.
var IMG_OPT_TAMANOS = [160, 280, 400, 600, 800, 1080, 1600, 1920];
function imgOptTamano(w) {
  var deseado = w || 800;
  for (var i = 0; i < IMG_OPT_TAMANOS.length; i++) {
    if (IMG_OPT_TAMANOS[i] >= deseado) return IMG_OPT_TAMANOS[i];
  }
  return IMG_OPT_TAMANOS[IMG_OPT_TAMANOS.length - 1];
}
window.imgOpt = function (url, w, q) {
  if (!url || typeof url !== 'string') return url;
  if (!/^https?:\/\//i.test(url)) return url;
  if (!/remaxcaribbeanandcentralamerica\.azureedge\.net|iseoyfiteeobzvtfjhoe\.supabase\.co/i.test(url)) return url;
  return '/_vercel/image?url=' + encodeURIComponent(url) + '&w=' + imgOptTamano(w) + '&q=' + (q || 75);
};

(function () {
  const CFG = window.SITE_CONFIG || {};
  const WA_NUMBER = String(CFG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const WEBHOOK_URL = CFG.WEBHOOK_URL || '';
  const WEBHOOK_ENABLED = !!WEBHOOK_URL;

  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  function mapInteres(path) {
    if (path.includes('vender')) return 'vender';
    if (path.includes('comprar')) return 'comprar';
    if (path.includes('invertir')) return 'invertir';
    if (path.includes('golden-lake')) return 'comprar';
    return 'otro';
  }

  // De qué campaña viene el visitante. Hasta ahora NO se guardaba: un lead
  // entraba como "formulario_web" o "whatsapp" y no había forma de saber si
  // lo trajo una pauta de Meta, un posteo orgánico o una búsqueda — así que
  // "esta campaña funcionó / no funcionó" no se podía responder con datos.
  // Los parámetros van a sessionStorage (no localStorage) porque la persona
  // suele llegar por un anuncio a una página y recién convertir en otra: si
  // solo se leyera la URL del momento del envío, la atribución se perdería.
  // No son datos personales — son las etiquetas del anuncio.
  const CAMPANA_KEY = 'csv_campana';
  const UTM_CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  function capturarCampana() {
    try {
      const q = new URLSearchParams(window.location.search);
      const partes = [];
      UTM_CAMPOS.forEach((k) => { const v = q.get(k); if (v) partes.push(`${k.replace('utm_', '')}: ${v}`); });
      if (q.get('fbclid') && !partes.length) partes.push('source: facebook'); // anuncio de Meta sin UTM puestas a mano
      if (!partes.length) return;                        // visita sin etiquetas: no sobreescribir una campaña ya guardada
      sessionStorage.setItem(CAMPANA_KEY, partes.join(' | '));
    } catch (e) { /* sin sessionStorage seguimos igual, solo sin atribución */ }
  }
  function campanaActual() {
    try { return sessionStorage.getItem(CAMPANA_KEY) || null; } catch (e) { return null; }
  }
  capturarCampana();                                     // antes del DOMContentLoaded: la URL ya está disponible

  // Meta Pixel — evento de conversión. El Pixel solo marcaba PageView (y
  // ViewContent en las fichas): la pauta no tenía con qué optimizar hacia
  // "esta persona SÍ escribió", y en Ads Manager los leads del sitio no
  // aparecían como resultado. Best-effort; nunca romper la UI si no cargó.
  function marcarLeadPixel(detalle) {
    try {
      if (typeof window.fbq !== 'function') return;
      const params = { content_category: mapInteres(path) };
      if (detalle) params.content_name = detalle;
      window.fbq('track', 'Lead', params);
    } catch (e) { /* noop */ }
  }

  // Un click en WhatsApp no trae nombre/teléfono todavía (a diferencia de un
  // formulario) — se registra igual como lead "en blanco" (origen whatsapp,
  // el mensaje completo queda en notas) para que quede en el pipeline y Walter
  // le ponga el nombre cuando chateen. Máximo 1 por sesión de navegador (no
  // uno por cada click) para no llenar Leads de filas repetidas.
  const WA_LEAD_FLAG = 'csv_wa_lead_creado';
  // Id del lead creado por el clic, para poder COMPLETARLO con el teléfono si
  // la persona después lo deja en el aviso (en vez de crear una fila nueva).
  let leadWhatsappId = null;
  function registrarLeadWhatsapp(mensaje) {
    try {
      if (sessionStorage.getItem(WA_LEAD_FLAG)) return;
      sessionStorage.setItem(WA_LEAD_FLAG, '1'); // antes del fetch, para no duplicar con doble click
    } catch (e) { /* sin sessionStorage seguimos igual, solo sin el freno de duplicados */ }

    const tituloMatch = mensaje.match(/"([^"]+)"/); // el texto suele citar el título de la propiedad entre comillas
    marcarLeadPixel(tituloMatch ? tituloMatch[1] : null);
    fetch('/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Contacto por WhatsApp', origen: 'whatsapp', interes: mapInteres(path),
        propiedad_referencia: tituloMatch ? tituloMatch[1] : null, notas: mensaje,
        campana: campanaActual(), pagina: path,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.leadId) leadWhatsappId = d.leadId; })
      .catch((err) => console.error('No se pudo registrar el lead de WhatsApp:', err));
  }

  // Aviso al hacer click en WhatsApp: el link solo PRECARGA el mensaje, la
  // persona igual tiene que tocar Enviar adentro de WhatsApp -- mucha gente
  // no lo sabe y abandona ahí. En computadora, si no tiene WhatsApp Web ya
  // vinculado en ese navegador, el link le muestra un código QR y la
  // mayoría no lo escanea desde la misma compu. Por eso este aviso (con el
  // teléfono como respaldo) en vez de asumir que el mensaje llegó solo.
  let waAvisoTimer = null;
  let avisoWhatsappActivo = false;

  // El aviso se escondía solo a los 9 segundos — justo mientras la persona
  // estaba DENTRO de WhatsApp. Al volver al navegador ya no quedaba nada en
  // pantalla, así que la casilla para dejar el número no la veía nadie, que
  // es exactamente a quien está dirigida. Ahora: mientras la pestaña está
  // oculta el reloj se detiene, y cuando la persona vuelve el aviso reaparece
  // y YA NO se cierra solo — volver de WhatsApp es la señal más fuerte de que
  // la conversación no arrancó.
  document.addEventListener('visibilitychange', () => {
    if (!avisoWhatsappActivo) return;
    const aviso = document.getElementById('wa-aviso');
    if (!aviso) return;
    if (document.hidden) { clearTimeout(waAvisoTimer); return; }
    clearTimeout(waAvisoTimer);
    aviso.style.opacity = '1';
    aviso.style.transform = 'translateX(-50%) translateY(0)';
    aviso.style.pointerEvents = 'auto';
  });

  // Guarda el número que la persona deja en el aviso. Completa el lead que ya
  // creó el clic; si ese id no está a mano (p. ej. hizo el clic en otra página
  // de la misma sesión), crea uno nuevo — el número importa más que evitar una
  // fila repetida.
  function prepararCapturaWhatsapp(aviso) {
    const form = aviso.querySelector('[data-wa-captura]');
    if (!form) return;
    const input = form.querySelector('[name=telefono]');
    const msg = form.querySelector('[data-wa-captura-msg]');
    const decir = (texto, ok) => {
      msg.textContent = texto;
      msg.style.color = ok ? '#1b5e20' : '#9a3412';
      msg.style.display = 'block';
    };

    // Mientras escribe, el aviso no se cierra solo.
    ['focus', 'input'].forEach((ev) => input.addEventListener(ev, () => clearTimeout(waAvisoTimer)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearTimeout(waAvisoTimer);
      const telefono = input.value.trim();
      if (telefono.replace(/\D/g, '').length < 8) { decir('Escribí un número completo, con código de país si estás fuera de El Salvador.', false); return; }

      const btn = form.querySelector('button[type=submit]');
      const btnTexto = btn.textContent;
      btn.disabled = true; btn.textContent = '...';

      const cuerpo = leadWhatsappId
        ? { completar_lead: leadWhatsappId, telefono }
        : { nombre: 'Dejó su número tras el clic de WhatsApp', telefono, origen: 'whatsapp',
            interes: mapInteres(path), notas: 'Dejó su número en el aviso posterior al clic de WhatsApp.',
            campana: campanaActual(), pagina: path };

      try {
        const res = await fetch('/api/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        });
        if (!res.ok) throw new Error('respuesta ' + res.status);
        form.innerHTML = '<div style="font-size:.84rem;color:#1b5e20;">¡Gracias! Walter te escribe a ese número.</div>';
        avisoWhatsappActivo = false;              // ya dejó el dato: se puede ir solo
        waAvisoTimer = setTimeout(() => { aviso.style.opacity = '0'; aviso.style.pointerEvents = 'none'; }, 6000);
      } catch (err) {
        console.error('No se pudo guardar el número:', err);
        btn.disabled = false; btn.textContent = btnTexto;
        decir('No se pudo guardar. Probá de nuevo o escribinos al ' + formatearTelefono(WA_NUMBER) + '.', false);
      }
    });
  }

  function mostrarAvisoWhatsapp(conCaptura) {
    let aviso = document.getElementById('wa-aviso');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'wa-aviso';
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-live', 'polite');
      aviso.style.cssText =
        'position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(16px);' +
        'max-width:340px;width:calc(100% - 32px);background:#fff;border:1px solid #e2e8f0;' +
        'border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:14px 36px 14px 16px;' +
        'z-index:9999;font-family:inherit;font-size:.85rem;line-height:1.4;color:#0f172a;' +
        'opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;';
      // Además del recordatorio de tocar Enviar, acá se le pide el número.
      // Es el único momento en que se puede: el clic de WhatsApp no le dice
      // al sitio quién es la persona, así que sin esto el lead queda sin
      // teléfono y no hay a quién devolverle el contacto. Va DESPUÉS del
      // clic, nunca antes, para no ponerle un trámite delante al que sí va
      // a escribir por WhatsApp.
      aviso.innerHTML =
        '<button type="button" data-cerrar aria-label="Cerrar" style="position:absolute;top:4px;right:8px;background:none;border:none;' +
        'font-size:1.1rem;color:#94a3b8;cursor:pointer;line-height:1;padding:6px;">&times;</button>' +
        'Se abrió WhatsApp con tu mensaje listo — <strong>tocá Enviar</strong> para mandarlo.<br>' +
        '¿No se abrió? Escribinos al <a href="tel:+' + WA_NUMBER + '" style="color:#25D366;font-weight:700;text-decoration:underline;">' +
        formatearTelefono(WA_NUMBER) + '</a>.' +
        '<form data-wa-captura style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">' +
          '<label for="wa-captura-tel" style="display:block;font-size:.8rem;color:#475569;margin-bottom:6px;">' +
            'O dejame tu número y te escribo yo:</label>' +
          '<div style="display:flex;gap:6px;">' +
            '<input id="wa-captura-tel" name="telefono" type="tel" inputmode="tel" autocomplete="tel" required ' +
              'placeholder="7000 0000" style="flex:1 1 auto;min-width:0;padding:9px 11px;border:1.5px solid #e2e8f0;' +
              'border-radius:9px;font:inherit;font-size:.85rem;background:#f8fafc;box-sizing:border-box;">' +
            '<button type="submit" style="flex:0 0 auto;padding:9px 14px;border:none;border-radius:9px;' +
              'background:#003da5;color:#fff;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;">Enviar</button>' +
          '</div>' +
          '<div data-wa-captura-msg style="display:none;margin-top:8px;font-size:.8rem;"></div>' +
        '</form>';
      document.body.appendChild(aviso);
      aviso.querySelector('[data-cerrar]').addEventListener('click', () => {
        avisoWhatsappActivo = false;              // cerrado a mano: no vuelve a aparecer
        aviso.style.opacity = '0';
        aviso.style.pointerEvents = 'none';
      });
      prepararCapturaWhatsapp(aviso);
    }
    // Si ya dejó el número antes de abrir WhatsApp, no se le vuelve a pedir.
    const captura = aviso.querySelector('[data-wa-captura]');
    if (captura) captura.hidden = conCaptura === false || yaDioNumero();

    aviso.style.opacity = '1';
    aviso.style.transform = 'translateX(-50%) translateY(0)';
    aviso.style.pointerEvents = 'auto';
    avisoWhatsappActivo = true;
    clearTimeout(waAvisoTimer);
    waAvisoTimer = setTimeout(() => { aviso.style.opacity = '0'; aviso.style.pointerEvents = 'none'; }, 9000);
  }
  function formatearTelefono(soloDigitos) {
    // "50370381941" -> "+503 7038-1941" (formato ya usado en el resto del sitio).
    const m = soloDigitos.match(/^(\d{3})(\d{4})(\d{4})$/);
    return m ? `+${m[1]} ${m[2]}-${m[3]}` : `+${soloDigitos}`;
  }

  // ---- Pedir el número ANTES de abrir WhatsApp -------------------------
  // El clic de WhatsApp no le devuelve el número a nadie: ese dato vive en la
  // app. Y la mayoría de los clics no terminaba en conversación — quedaban
  // leads "Contacto por WhatsApp" con teléfono vacío, interés visible y nadie
  // a quien llamar. Por eso se pide acá, con un enlace claro para saltarlo:
  // nadie queda bloqueado, pero el que se va sin escribir deja un rastro.
  const WA_NUMERO_FLAG = 'csv_wa_numero_dado';
  function yaDioNumero() {
    try { return !!sessionStorage.getItem(WA_NUMERO_FLAG); } catch (e) { return false; }
  }

  function pedirNumeroYAbrir(mensaje) {
    const previo = document.getElementById('wa-pedir');
    if (previo) previo.remove();

    const tituloMatch = mensaje.match(/"([^"]+)"/);
    const referencia = tituloMatch ? tituloMatch[1] : null;

    const capa = document.createElement('div');
    capa.id = 'wa-pedir';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', 'Dejanos tu número antes de abrir WhatsApp');
    capa.style.cssText =
      'position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.55);display:flex;' +
      'align-items:center;justify-content:center;padding:20px;font-family:inherit;';
    capa.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;padding:22px 20px;' +
        'box-shadow:0 20px 50px rgba(15,23,42,.3);color:#0f172a;">' +
        '<div style="font-size:1.05rem;font-weight:700;margin-bottom:6px;">Te abro WhatsApp</div>' +
        '<p style="font-size:.88rem;line-height:1.5;color:#475569;margin:0 0 16px;">' +
          'Dejame tu número por si el chat no llega a enviarse, y te escribo yo.</p>' +
        '<form data-pedir-form>' +
          '<input name="telefono" type="tel" inputmode="tel" autocomplete="tel" placeholder="7000 0000" ' +
            'style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;' +
            'font:inherit;font-size:.95rem;background:#f8fafc;box-sizing:border-box;">' +
          '<div data-pedir-msg style="display:none;margin-top:8px;font-size:.8rem;color:#9a3412;"></div>' +
          '<button type="submit" style="width:100%;margin-top:12px;padding:13px;border:none;border-radius:10px;' +
            'background:#25D366;color:#fff;font:inherit;font-size:.95rem;font-weight:700;cursor:pointer;">' +
            'Abrir WhatsApp</button>' +
        '</form>' +
        '<button type="button" data-pedir-saltar style="display:block;width:100%;margin-top:10px;background:none;' +
          'border:none;color:#64748b;font:inherit;font-size:.82rem;text-decoration:underline;cursor:pointer;padding:6px;">' +
          'Abrir sin dejar mi número</button>' +
      '</div>';
    document.body.appendChild(capa);

    const form = capa.querySelector('[data-pedir-form]');
    const input = capa.querySelector('[name=telefono]');
    const msg = capa.querySelector('[data-pedir-msg]');
    setTimeout(() => input.focus(), 80);

    // Abrir WhatsApp SIEMPRE dentro del gesto del usuario: si se esperara a
    // que termine el fetch, en computadora el navegador bloquea la ventana.
    const abrir = (conCaptura) => {
      capa.remove();
      mostrarAvisoWhatsapp(conCaptura);
      if (esMobile) abrirWhatsAppMobil(mensaje);
      else window.open(waLink(mensaje), '_blank', 'noopener');
    };

    capa.querySelector('[data-pedir-saltar]').addEventListener('click', () => {
      registrarLeadWhatsapp(mensaje);          // lead en blanco: queda el interés
      abrir(true);                             // y el aviso le da una segunda chance
    });

    capa.addEventListener('click', (e) => {    // tocar fuera = saltar
      if (e.target === capa) { registrarLeadWhatsapp(mensaje); abrir(true); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const telefono = input.value.trim();
      if (telefono.replace(/\D/g, '').length < 8) {
        msg.textContent = 'Escribí un número completo, con código de país si estás fuera de El Salvador.';
        msg.style.display = 'block';
        return;
      }
      try { sessionStorage.setItem(WA_NUMERO_FLAG, '1'); sessionStorage.setItem(WA_LEAD_FLAG, '1'); } catch (err) { /* noop */ }
      marcarLeadPixel(referencia);
      fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Contacto por WhatsApp', telefono, origen: 'whatsapp', interes: mapInteres(path),
          propiedad_referencia: referencia, notas: mensaje + '\nDejó su número antes de abrir WhatsApp.',
          campana: campanaActual(), pagina: path,
        }),
      }).catch((err) => console.error('No se pudo guardar el número:', err));
      abrir(false);                            // ya dejó el dato: el aviso va sin casilla
    });
  }

  // wa.me a veces NO abre la app en celular: según el navegador/Android, en
  // vez de disparar el intent de la app carga la página web de WhatsApp con
  // un botón "Abrir aplicación" que después tira "La acción no se pudo
  // completar" (decisión del lado de wa.me, no controlable con target=_blank
  // ni con navegación en la misma pestaña). El truco confiable: probar
  // primero el esquema nativo whatsapp://, que el sistema operativo maneja
  // directo sin pasar por ningún servidor de WhatsApp — y si no pasó nada
  // (la pestaña sigue visible) después de un momento, recién ahí caer a
  // wa.me como respaldo para quien no tenga la app instalada.
  function abrirWhatsAppMobil(mensaje) {
    const appUrl = `whatsapp://send?phone=${WA_NUMBER}&text=${encodeURIComponent(mensaje)}`;
    let seFueLaApp = false;
    const marcar = () => { seFueLaApp = true; };
    document.addEventListener('visibilitychange', marcar, { once: true });
    window.location.href = appUrl;
    setTimeout(() => {
      document.removeEventListener('visibilitychange', marcar);
      if (!seFueLaApp) window.location.href = waLink(mensaje); // el esquema nativo no abrió nada
    }, 1300);
  }

  // Enlaces de WhatsApp: marcados EXPLÍCITAMENTE con [data-whatsapp] (no por
  // ícono). Reusable: además de correr sobre todo el documento al cargar la
  // página, páginas que arman tarjetas dinámicas (propiedades.html) la llaman
  // de nuevo pasándole el contenedor recién insertado — si no, esos botones
  // quedarían sin href/click porque no existían todavía en el DOMContentLoaded.
  function procesarEnlacesWhatsapp(root, waMessage) {
    if (!WA_NUMBER) return;
    (root || document).querySelectorAll('a[data-whatsapp]').forEach((a) => {
      if (a.dataset.waListo) return; // no duplicar el listener de click
      a.dataset.waListo = '1';
      const mensaje = a.getAttribute('data-wa') || waMessage || 'Hola Walter, me gustaría recibir asesoría inmobiliaria.';
      a.href = waLink(mensaje); // respaldo por si el click no llega a dispararse por JS
      if (!esMobile) { a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', (e) => {
        // Si ya dejó el número en esta sesión no se le pide de nuevo: va directo.
        if (yaDioNumero()) {
          registrarLeadWhatsapp(mensaje);
          mostrarAvisoWhatsapp(false);
          if (esMobile) { e.preventDefault(); abrirWhatsAppMobil(mensaje); }
          return;
        }
        e.preventDefault();                    // se frena para poder pedirle el número
        pedirNumeroYAbrir(mensaje);
      });
    });
  }

  // Guarda el lead en el CRM propio (Supabase). Independiente del webhook de
  // n8n: corre siempre que haya credenciales configuradas, sin bloquear ni
  // condicionar la experiencia de WhatsApp del visitante.
  async function guardarLeadEnCRM(payload, path) {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: payload.nombre || 'Sin nombre',
        telefono: payload.telefono || payload.whatsapp || '',
        correo: payload.email || '',
        origen: 'formulario_web',
        interes: mapInteres(path),
        propiedad_referencia: payload.tipo_propiedad || null,
        notas: notasCompletas(payload),
        campana: campanaActual(), pagina: path,
      }),
    });
    return res.ok;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Mensaje contextual de WhatsApp por página
    let waMessage = 'Hola Walter, me gustaría recibir asesoría inmobiliaria.';
    if (path.includes('vender')) waMessage = 'Hola Walter, estoy interesado en vender mi propiedad.';
    else if (path.includes('comprar')) waMessage = 'Hola Walter, estoy interesado en comprar una propiedad.';
    else if (path.includes('invertir')) waMessage = 'Hola Walter, soy inversionista y me interesan las oportunidades en El Salvador.';
    else if (path.includes('menajes')) waMessage = 'Hola Walter, quiero información sobre menajes y mudanza a El Salvador.';
    else if (path.includes('costo-vida')) waMessage = 'Hola Walter, vi el comparador de costo de vida y quiero recibir asesoría.';
    else if (path.includes('propiedades')) waMessage = 'Hola Walter, quiero conocer más sobre las propiedades disponibles.';

    procesarEnlacesWhatsapp(document, waMessage);

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

  // Todas las respuestas del formulario para guardar en el CRM (sin los datos
  // de contacto, que ya van aparte en nombre/telefono/correo) — antes esto se
  // perdía: solo sobrevivía al mensaje de WhatsApp, nunca llegaba a Supabase.
  function notasCompletas(p) {
    const campos = [
      ['Servicio', p.servicio], ['Motivo', p.motivo], ['Tipo de propiedad', p.tipo_propiedad],
      ['Interés', p.interes_inmobiliario], ['Tiempo', p.tiempo], ['Presupuesto', p.presupuesto],
      ['Ciudad de origen', p.ciudad_origen], ['Mensaje', p.mensaje],
    ].filter(([, v]) => v);
    return campos.length ? campos.map(([k, v]) => `${k}: ${v}`).join('\n') : null;
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

      // La confirmación depende del guardado REAL (Supabase + aviso por
      // Telegram a Walter), no del webhook de n8n, que es opcional y hoy está
      // vacío en config.js. Antes se tomaba el webhook como única prueba de
      // éxito: sin webhook, a TODO el que llenaba el formulario se le decía
      // que el envío "aún no está activo", no se le limpiaba el formulario y
      // se lo empujaba a WhatsApp — aunque su lead sí había quedado guardado
      // y Walter ya tenía el aviso en el teléfono. Para el visitante se leía
      // como que algo falló, y además nunca se registraba el lead_submit, así
      // que en las métricas el formulario figuraba siempre en cero.
      let guardado = false;
      try {
        guardado = await guardarLeadEnCRM(payload, path);
      } catch (err) {
        console.error('No se pudo guardar el lead en el CRM:', err);
      }

      // Integración externa, cuando exista: no decide lo que ve el visitante.
      if (WEBHOOK_ENABLED) {
        fetch(WEBHOOK_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        }).catch((err) => console.error('Webhook de leads:', err));
      }

      if (btn) { btn.innerHTML = btnText; btn.disabled = false; }

      if (guardado) {
        marcarLeadPixel(payload.servicio || payload.tipo_propiedad || null);
        if (window.CostoSVMetricas) window.CostoSVMetricas.registrarEvento('lead_submit');
        // Ya no se abre WhatsApp a la fuerza: eso era el parche por el
        // formulario que "no estaba activo". Queda como opción para quien
        // quiera hablar en el momento.
        show(`¡Listo! Recibimos tus datos y Walter se pone en contacto con vos. Si querés hablar ahora mismo, <a href="${wa}" target="_blank" rel="noopener" style="font-weight:700;text-decoration:underline;">escribinos por WhatsApp</a>.`, true);
        form.reset();                              // limpiar SOLO con guardado confirmado
        return;
      }

      // No se pudo guardar: no se simula éxito y los campos quedan llenos para reintentar.
      show(`No pudimos enviar tu información. <a href="${wa}" target="_blank" rel="noopener" style="font-weight:700;text-decoration:underline;">Escribinos por WhatsApp</a> y no perdés tu consulta.`, false);
    });
  }

  // Para páginas que arman botones de WhatsApp dinámicamente (tarjetas de
  // propiedades cargadas por fetch, insertadas después de DOMContentLoaded).
  window.CostoSVWhatsApp = { procesarEnlacesWhatsapp };
})();

// ============================================================
//  Métricas propias: pageviews y clics clave, guardados en la tabla
//  "eventos" de Supabase para verlos en el panel (pestaña Métricas).
//  Todo el tracking es best-effort (fetch sin await, sin bloquear la
//  UX) y no guarda ningún dato personal del visitante.
// ============================================================
(function () {
  const CFG = window.SITE_CONFIG || {};
  const SUPA_URL = CFG.SUPABASE_URL || '';
  const SUPA_KEY = CFG.SUPABASE_ANON_KEY || '';
  if (!SUPA_URL || !SUPA_KEY) return;

  // Se registra vía RPC (función de base de datos) y no con un INSERT directo
  // a la tabla: así el sitio público nunca tiene acceso de escritura directo.
  // La campaña se guarda también en las VISITAS, no solo en los leads: es la
  // única forma de distinguir "la pauta no trajo a nadie" de "trajo gente y
  // no escribió" — dos problemas con soluciones opuestas. La escribe el
  // bloque de captación de leads de arriba, en la misma clave.
  function campanaDeLaSesion() {
    try { return sessionStorage.getItem('csv_campana') || null; } catch (e) { return null; }
  }

  function registrarEvento(tipo, detalle) {
    try {
      const pagina = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      fetch(`${SUPA_URL}/rest/v1/rpc/registrar_evento_publico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
        body: JSON.stringify({ p_tipo: tipo, p_pagina: pagina, p_detalle: detalle || null, p_campana: campanaDeLaSesion() }),
      }).catch(() => {});
    } catch (e) { /* nunca romper la pagina por esto */ }
  }

  window.CostoSVMetricas = { registrarEvento };

  document.addEventListener('DOMContentLoaded', () => {
    registrarEvento('pageview');
    document.querySelectorAll('a[data-whatsapp]').forEach((a) => {
      a.addEventListener('click', () => registrarEvento('whatsapp_click'));
    });
  });
})();

// ============================================================
//  Visor de fotos ampliado (lightbox), compartido en todas las
//  páginas que muestran tarjetas de propiedades/franquicias.
//  Requiere el markup #lightbox-overlay (ver franquicias.html /
//  propiedades.html / index.html) — si no está en la página, no hace nada.
// ============================================================
(function () {
  let fotosActuales = [];
  let idxActual = 0;
  let compartirInfo = null;

  function renderLightbox() {
    const img = document.getElementById('lightbox-img');
    const contador = document.getElementById('lightbox-contador');
    const prev = document.getElementById('lightbox-prev');
    const next = document.getElementById('lightbox-next');
    if (img) img.src = fotosActuales[idxActual] || '';
    const varias = fotosActuales.length > 1;
    if (contador) contador.textContent = varias ? `${idxActual + 1} / ${fotosActuales.length}` : '';
    if (prev) prev.style.display = varias ? 'flex' : 'none';
    if (next) next.style.display = varias ? 'flex' : 'none';
  }

  function mostrarToastLightbox(texto) {
    const toast = document.getElementById('lightbox-toast');
    if (!toast) return;
    toast.textContent = texto;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  window.abrirLightbox = function (fotos, idx, compartir) {
    const overlay = document.getElementById('lightbox-overlay');
    fotosActuales = (fotos || []).filter(Boolean);
    if (!overlay || !fotosActuales.length) return;
    idxActual = idx || 0;
    compartirInfo = compartir || null;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderLightbox();
  };

  // Atajo para abrir el lightbox directo desde una miniatura de tarjeta:
  // lee las fotos/índice actual del carrusel contenedor y los datos de
  // compartir desde atributos data- en la propia imagen.
  window.abrirLightboxImg = function (imgEl, tipoEntidad, paginaDestino) {
    const cont = imgEl.closest('[data-fotos]');
    if (!cont) return;
    const fotos = cont.getAttribute('data-fotos').split(',').filter(Boolean);
    const idx = parseInt(cont.getAttribute('data-idx'), 10) || 0;
    const titulo = imgEl.getAttribute('data-share-titulo') || '';
    const id = imgEl.getAttribute('data-share-id') || '';
    const slug = imgEl.getAttribute('data-share-slug') || '';
    const param = tipoEntidad === 'franquicia' ? 'franquicia' : 'propiedad';
    // Para propiedades preferimos la página propia /propiedad/<slug> (preview y
    // pixel propios); si aún no hay slug, caemos al deep-link ?propiedad=<id>.
    let url = `${location.origin}/${paginaDestino}`;
    if (tipoEntidad === 'propiedad' && (slug || id)) url = `${location.origin}/propiedad/${slug || id}`;
    else if (id) url = `${location.origin}/${paginaDestino}?${param}=${id}`;
    window.abrirLightbox(fotos, idx, { titulo, url });
    if (window.CostoSVMetricas && titulo) window.CostoSVMetricas.registrarEvento('ficha_view', titulo);

    // Meta Pixel — ViewContent por propiedad: permite optimizar la pauta
    // hacia "vio ESTE inmueble" y armar publicos de retargeting por listing.
    // Best-effort; nunca romper la UI si el Pixel no cargo.
    if (tipoEntidad === 'propiedad' && id && typeof window.fbq === 'function') {
      try {
        const precioNum = Number(String(imgEl.getAttribute('data-share-precio') || '').replace(/[^0-9.]/g, ''));
        const params = { content_type: 'home_listing', content_ids: [id], content_name: titulo };
        if (precioNum > 0) { params.value = precioNum; params.currency = 'USD'; }
        window.fbq('track', 'ViewContent', params);
      } catch (e) { /* noop */ }
    }
  };

  window.cerrarLightbox = function () {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  window.moverLightbox = function (dir) {
    if (!fotosActuales.length) return;
    idxActual = (idxActual + dir + fotosActuales.length) % fotosActuales.length;
    renderLightbox();
  };

  window.compartirLightbox = async function () {
    if (!compartirInfo) return;
    const { titulo, url } = compartirInfo;
    if (navigator.share) {
      try { await navigator.share({ title: titulo, text: titulo, url }); } catch (e) { /* el usuario cerró el share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      mostrarToastLightbox('Link copiado');
    } catch (e) {
      mostrarToastLightbox('No se pudo copiar el link');
    }
  };

  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay || !overlay.classList.contains('show')) return;
    if (e.key === 'Escape') window.cerrarLightbox();
    if (e.key === 'ArrowLeft') window.moverLightbox(-1);
    if (e.key === 'ArrowRight') window.moverLightbox(1);
  });
})();
