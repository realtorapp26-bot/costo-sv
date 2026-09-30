// ============================================================
//  Costo SV — Dossier de venta de Golden Lake (PDF, 2 páginas)
//  Se carga solo en golden-lake.html. Lee window.GL_DOSSIER_DATA, que
//  cargarProyecto() arma ahí mismo una vez que resuelve el proyecto
//  (o el respaldo). Expone window.abrirDossierGL().
//
//  Flujo: botón "Descargar dossier" (reemplaza al viejo "Quiero reservar")
//  -> modal con formulario (nombre, correo, teléfono) -> al enviar: guarda
//  el lead (mismo /api/lead de siempre, dispara el aviso de Telegram),
//  arma el PDF (página 1: carta de venta + amenidades, página 2: la casa +
//  contacto de Walter) y abre WhatsApp como seguimiento -- mismo patrón que
//  dossier.js (fichas individuales), pero con dos páginas y contenido del
//  proyecto en vez de una sola propiedad.
// ============================================================
(function () {
  'use strict';

  var D = window.GL_DOSSIER_DATA;
  if (!D) return;

  var LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  };
  var NAVY = '#0a0f1c';
  var GOLD = '#d4af37';
  var AGENTE = {
    nombre: 'Walter Guerrero',
    titulo: 'Asociado · RE/MAX Elite',
    telefono: '+503 7038-1941',
    email: 'walter.guerrero@remax.com.sv',
    foto: '/assets/walter-guerrero-retocada.png',
  };

  // ---------- estilos del modal (la plantilla del PDF lleva estilos inline) ----------
  var css = document.createElement('style');
  css.textContent = [
    '.gldsr-overlay{position:fixed;inset:0;z-index:6000;background:rgba(5,8,15,.72);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:20px}',
    '.gldsr-overlay.show{display:flex}',
    '.gldsr-card{background:#fff;border-radius:18px;width:100%;max-width:420px;padding:30px 28px 26px;box-shadow:0 30px 70px rgba(0,0,0,.35);font-family:"Outfit",system-ui,sans-serif;position:relative;animation:gldsr-in .22s ease}',
    '@keyframes gldsr-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.gldsr-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:1rem;cursor:pointer;line-height:34px}',
    '.gldsr-x:hover{background:#e2e8f0}',
    '.gldsr-eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + GOLD + '}',
    '.gldsr-title{font-family:"Playfair Display",Georgia,serif;font-size:1.4rem;color:' + NAVY + ';margin:6px 0 4px;line-height:1.25}',
    '.gldsr-sub{font-size:.86rem;color:#64748b;margin:0 0 20px}',
    '.gldsr-field{margin-bottom:14px}',
    '.gldsr-field label{display:block;font-size:.78rem;font-weight:600;color:#475569;margin-bottom:6px}',
    '.gldsr-field input{width:100%;padding:13px 15px;border:1.5px solid #e2e8f0;border-radius:11px;font:inherit;font-size:.95rem;color:' + NAVY + ';background:#f8fafc;transition:border-color .15s,background .15s;box-sizing:border-box}',
    '.gldsr-field input:focus{outline:0;border-color:' + NAVY + ';background:#fff;box-shadow:0 0 0 3px rgba(10,15,28,.1)}',
    '.gldsr-err{color:#dc1c2e;font-size:.8rem;margin:2px 0 10px;display:none}',
    '.gldsr-err.show{display:block}',
    '.gldsr-go{width:100%;margin-top:6px;padding:14px;border:0;border-radius:12px;background:' + NAVY + ';color:#fff;font:inherit;font-size:.98rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px}',
    '.gldsr-go:hover{background:#151c30}',
    '.gldsr-go:disabled{opacity:.7;cursor:progress}',
    '.gldsr-spin{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:gldsr-rot .7s linear infinite;display:none}',
    '.gldsr-go.loading .gldsr-spin{display:block}',
    '@keyframes gldsr-rot{to{transform:rotate(360deg)}}',
    '.gldsr-nota{font-size:.72rem;color:#94a3b8;text-align:center;margin:14px 0 0}',
    '.gldsr-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:' + NAVY + ';color:#fff;padding:13px 24px;border-radius:30px;font-family:"Outfit",sans-serif;font-size:.86rem;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:6100}',
    '.gldsr-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
  ].join('');
  document.head.appendChild(css);

  // ---------- modal ----------
  var overlay = document.createElement('div');
  overlay.className = 'gldsr-overlay';
  overlay.innerHTML =
    '<div class="gldsr-card" role="dialog" aria-modal="true" aria-label="Recibir el dossier de venta de Golden Lake">' +
      '<button class="gldsr-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<div class="gldsr-eyebrow">Dossier de venta</div>' +
      '<h2 class="gldsr-title">Descargá la información completa de Golden Lake</h2>' +
      '<p class="gldsr-sub">Precios, características de la casa y contacto directo con Walter, en un PDF.</p>' +
      '<form id="gldsr-form" novalidate>' +
        '<div class="gldsr-field"><label for="gldsr-nombre">Nombre</label>' +
          '<input id="gldsr-nombre" name="nombre" type="text" autocomplete="name" required></div>' +
        '<div class="gldsr-field"><label for="gldsr-mail">Correo</label>' +
          '<input id="gldsr-mail" name="correo" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" required></div>' +
        '<div class="gldsr-field"><label for="gldsr-tel">Teléfono</label>' +
          '<input id="gldsr-tel" name="telefono" type="tel" inputmode="tel" autocomplete="tel" placeholder="7000 0000" required></div>' +
        '<p class="gldsr-err" id="gldsr-err"></p>' +
        '<button class="gldsr-go" type="submit"><span class="gldsr-spin"></span><span class="gldsr-go-txt">Descargar dossier PDF</span></button>' +
        '<p class="gldsr-nota">Usamos tus datos solo para dar seguimiento sobre Golden Lake.</p>' +
      '</form>' +
    '</div>';
  document.body.appendChild(overlay);

  var toast = document.createElement('div');
  toast.className = 'gldsr-toast';
  document.body.appendChild(toast);

  var form = overlay.querySelector('#gldsr-form');
  var errBox = overlay.querySelector('#gldsr-err');
  var btn = overlay.querySelector('.gldsr-go');
  var btnTxt = overlay.querySelector('.gldsr-go-txt');

  overlay.querySelector('.gldsr-x').addEventListener('click', cerrar);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('show')) cerrar(); });

  window.abrirDossierGL = function () {
    overlay.classList.add('show');
    setTimeout(function () { var n = document.getElementById('gldsr-nombre'); if (n) n.focus(); }, 60);
  };
  function cerrar() { overlay.classList.remove('show'); }

  function mostrarToast(txt) {
    toast.textContent = txt;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 3600);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errBox.classList.remove('show');

    var nombre = form.nombre.value.trim();
    var correo = form.correo.value.trim();
    var telefono = form.telefono.value.trim();
    var digitos = telefono.replace(/\D/g, '');

    if (!nombre) return err('Escribí tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Escribí un correo válido.');
    if (digitos.length < 8) return err('Escribí un número de teléfono válido.');

    btn.disabled = true;
    btn.classList.add('loading');
    btnTxt.textContent = 'Generando…';

    // El lead se guarda aunque el PDF falle; el PDF se genera aunque el lead falle.
    guardarLead(nombre, correo, telefono);

    try {
      await cargarLibs();
      await generarPDF();
      abrirWhatsApp(nombre);
      cerrar();
      mostrarToast('Listo — revisá tu carpeta de descargas 📄');
      form.reset();
    } catch (ex) {
      console.error('dossier Golden Lake PDF:', ex);
      err('No se pudo generar el PDF. Probá de nuevo o escribinos por WhatsApp.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btnTxt.textContent = 'Descargar dossier PDF';
    }
  });

  function err(msg) { errBox.textContent = msg; errBox.classList.add('show'); }

  // ---------- lead ----------
  // Mismo endpoint que el resto del sitio (app.js, dossier.js, agendar-visita.js):
  // server-side con service_role, inmune a RLS, y dispara el aviso de Telegram.
  function guardarLead(nombre, correo, telefono) {
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre,
        telefono: telefono,
        correo: correo,
        origen: 'formulario_web',
        interes: 'comprar',
        propiedad_referencia: 'Golden Lake',
        notas: 'Solicitó el dossier de venta de Golden Lake — ' + (D.url || ''),
      }),
    }).catch(function (ex) { console.error('lead dossier Golden Lake:', ex); });
  }

  function abrirWhatsApp(nombre) {
    var n = '50370381941';
    var msg = 'Hola Walter, soy ' + nombre + '. Descargué el dossier de Golden Lake y quiero más información.';
    var url = 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      var appUrl = 'whatsapp://send?phone=' + n + '&text=' + encodeURIComponent(msg);
      var seFueLaApp = false;
      var marcar = function () { seFueLaApp = true; };
      document.addEventListener('visibilitychange', marcar, { once: true });
      window.location.href = appUrl;
      setTimeout(function () {
        document.removeEventListener('visibilitychange', marcar);
        if (!seFueLaApp) window.location.href = url;
      }, 1300);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  // ---------- librerías ----------
  function cargarScript(src) {
    return new Promise(function (ok, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = function () { rej(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  async function cargarLibs() {
    if (!window.html2canvas) await cargarScript(LIBS.html2canvas);
    if (!window.jspdf) await cargarScript(LIBS.jspdf);
    if (!window.QRCode) await cargarScript(LIBS.qrcode);
  }

  // ---------- utils ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function proxear(u) {
    if (!u) return '';
    if (/^data:/i.test(u) || u.charAt(0) === '/') return u;
    return '/api/img?u=' + encodeURIComponent(u);
  }

  // Recorta la foto original (mismo criterio que object-fit:cover, que
  // html2canvas no soporta) y la dibuja en un canvas -- para insertarla ya
  // recortada como <img> plano, sin depender de que html2canvas la recorte
  // bien (no lo hace: la estira). Devuelve un data URL listo para <img src>.
  async function fotoRecortadaDataUrl(foto, anchoPx, altoPx, radioPx) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    var cargo = new Promise(function (res, rej) {
      img.onload = function () { res(); };
      img.onerror = function () { rej(new Error('no cargó')); };
    });
    img.src = proxear(foto);
    await cargo;

    var ESCALA = 2.5;
    var cw = Math.round(anchoPx * ESCALA);
    var ch = Math.round(altoPx * ESCALA);
    var escalaCover = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    var anchoFuente = cw / escalaCover;
    var altoFuente = ch / escalaCover;
    var sx = (img.naturalWidth - anchoFuente) / 2;
    var sy = (img.naturalHeight - altoFuente) / 2;

    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    var radio = (radioPx || 0) * ESCALA;
    if (radio) {
      ctx.beginPath();
      ctx.moveTo(radio, 0);
      ctx.arcTo(cw, 0, cw, ch, radio);
      ctx.arcTo(cw, ch, 0, ch, radio);
      ctx.arcTo(0, ch, 0, 0, radio);
      ctx.arcTo(0, 0, cw, 0, radio);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(img, sx, sy, anchoFuente, altoFuente, 0, 0, cw, ch);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  function precioTxt(p) {
    p = String(p || '').trim();
    if (!p || /consultar/i.test(p)) return 'Precio a consultar';
    return /^\s*(usd|us\$|\$)/i.test(p) ? p : '$' + p;
  }

  var ICONOS_HEX = ['&#128274;', '&#127966;', '&#9875;', '&#127934;', '&#127958;', '&#128200;'];

  function amenidadesHtml() {
    var lista = (D.amenidades || []).slice(0, 6);
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 22px;margin-top:8px">' +
      lista.map(function (a, i) {
        var titulo = typeof a === 'string' ? a : (a.titulo || '');
        var desc = typeof a === 'string' ? '' : (a.descripcion || '');
        return '<div style="display:flex;gap:10px;align-items:flex-start">' +
          '<span style="flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,' + GOLD + ',#b8912c);display:flex;align-items:center;justify-content:center;font-size:12px">' + (ICONOS_HEX[i % ICONOS_HEX.length]) + '</span>' +
          '<div><div style="font-size:12.5px;font-weight:700;color:' + NAVY + ';margin-bottom:2px">' + esc(titulo) + '</div>' +
          (desc ? '<div style="font-size:11px;color:#64748b;line-height:1.5">' + esc(recortar(desc, 110)) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>';
  }

  function recortar(t, n) {
    var s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    var corte = s.slice(0, n);
    var esp = corte.lastIndexOf(' ');
    return (esp > 0 ? corte.slice(0, esp) : corte).trim() + '…';
  }

  function statsHtml() {
    var items = (D.modeloStats || '').split('·').map(function (s) { return s.trim(); }).filter(Boolean);
    return items.map(function (t) {
      return '<span style="display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;border-radius:20px;padding:6px 14px;font-size:11.5px;color:' + NAVY + ';font-weight:600;margin:0 8px 8px 0">' +
        '<span style="color:' + GOLD + '">&#9642;</span>' + esc(t) + '</span>';
    }).join('');
  }

  function incluyeHtml() {
    var items = D.modeloIncluye || [];
    if (!items.length) return '';
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;margin-top:14px">' +
      items.map(function (t) {
        return '<div style="font-size:11.5px;color:#374151;display:flex;gap:7px;align-items:baseline"><span style="color:#25a35a;font-weight:700">&#10003;</span>' + esc(t) + '</div>';
      }).join('') + '</div>';
  }

  // ---------- construcción de páginas ----------
  async function construirPagina1() {
    var fotoDataUrl = D.foto ? await fotoRecortadaDataUrl(D.foto, 710, 300, 14).catch(function () { return null; }) : null;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;background:#fff;' +
      'font-family:"Outfit",system-ui,sans-serif;color:' + NAVY + ';padding:42px;box-sizing:border-box;' +
      'display:flex;flex-direction:column';
    wrap.innerHTML =
      '<div style="flex:1 1 auto;min-height:0;overflow:hidden">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">' +
          '<img src="/assets/logo-remax.png" style="height:32px;display:block" alt="RE/MAX">' +
          '<span style="background:' + GOLD + ';color:' + NAVY + ';font-size:11.5px;font-weight:700;letter-spacing:.06em;padding:7px 15px;border-radius:20px">PROMOCIÓN EN PLANOS</span>' +
        '</div>' +
        (fotoDataUrl
          ? '<div style="width:100%;height:300px;border-radius:14px;overflow:hidden;background:#e5e7eb"><img src="' + fotoDataUrl + '" style="width:100%;height:100%;display:block" alt=""></div>'
          : '') +
        '<h1 style="font-family:\'Playfair Display\',Georgia,serif;font-size:2.6rem;margin:22px 0 4px;color:' + NAVY + '">Golden Lake</h1>' +
        '<div style="font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:' + GOLD + ';margin-bottom:18px">' + esc(D.ubicacionCorta || 'Costa del Sol, La Herradura, La Paz') + '</div>' +
        '<div style="font-size:13px;line-height:1.85;color:#374151;max-width:680px">' +
          '<p style="margin:0 0 14px">¿Y si pudieras tener una propiedad en Costa del Sol para disfrutar hoy y, al mismo tiempo, sumarla a tu patrimonio a largo plazo? <strong>Golden Lake</strong> es un desarrollo residencial privado en La Herradura que combina calidad de vida, amenidades y ubicación en una de las zonas costeras con mayor desarrollo inmobiliario de El Salvador.</p>' +
          '<p style="margin:0">Comunidad cerrada, lagos artificiales, muelle privado al estero de Jaltepeque y membresía VIP a Tesoro Beach, el club de playa de la zona — todo incluido en tu compra.</p>' +
        '</div>' +
        '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:15px;color:' + NAVY + ';font-weight:700;margin:26px 0 4px">¿Por qué Golden Lake?</div>' +
        amenidadesHtml() +
      '</div>' +
      '<div style="flex:0 0 auto;margin-top:16px;padding-top:12px;border-top:1px solid #ececec;font-size:9.5px;color:#94a3b8;text-align:center">' +
        'Página 1 de 2 · guerrero-properties.com/golden-lake.html' +
      '</div>';

    document.body.appendChild(wrap);
    return wrap;
  }

  async function construirPagina2() {
    var agenteFotoDataUrl = await fotoRecortadaDataUrl(AGENTE.foto, 84, 84, 42).catch(function () { return null; });
    var hayPromocion = D.modeloPrecioRegular && D.modeloPrecio && D.modeloPrecioRegular !== D.modeloPrecio;

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;background:#fff;' +
      'font-family:"Outfit",system-ui,sans-serif;color:' + NAVY + ';padding:42px;box-sizing:border-box;' +
      'display:flex;flex-direction:column';
    wrap.innerHTML =
      '<div style="flex:1 1 auto;min-height:0;overflow:hidden">' +
        '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + GOLD + ';margin-bottom:6px">Así son las casas nuevas</div>' +
        '<h2 style="font-family:\'Playfair Display\',Georgia,serif;font-size:1.5rem;margin:0 0 16px;color:' + NAVY + ';line-height:1.3">' + esc(D.modeloNombre || '') + '</h2>' +
        '<div style="margin-bottom:18px">' + statsHtml() + '</div>' +
        '<div style="background:' + NAVY + ';color:#fff;border-radius:14px;padding:22px 26px;margin-bottom:18px">' +
          (hayPromocion ? '<div style="font-size:15px;color:rgba(255,255,255,.55);text-decoration:line-through;margin-bottom:2px">' + esc(precioTxt(D.modeloPrecioRegular)) + '</div>' : '') +
          '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:1.9rem;font-weight:700;color:' + GOLD + '">' + esc(precioTxt(D.modeloPrecio)) + '</div>' +
          (D.modeloReserva ? '<div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:4px">' + esc(D.modeloReserva) + '</div>' : '') +
          (hayPromocion ? '<div style="font-size:10.5px;color:rgba(255,255,255,.55);margin-top:8px">Precio especial sujeto a disponibilidad y condiciones de la promoción en planos.</div>' : '') +
        '</div>' +
        incluyeHtml() +
      '</div>' +
      '<div style="flex:0 0 auto;margin-top:18px;border-top:1px solid #ececec;padding-top:18px;display:flex;gap:18px;align-items:center">' +
        (agenteFotoDataUrl ? '<img src="' + agenteFotoDataUrl + '" style="width:64px;height:64px;border-radius:50%;flex:none" alt="">' : '') +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:700;color:' + NAVY + '">' + esc(AGENTE.nombre) + '</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-bottom:4px">' + esc(AGENTE.titulo) + '</div>' +
          '<div style="font-size:11px;color:#374151;line-height:1.6">' + esc(AGENTE.telefono) + ' · ' + esc(AGENTE.email) + '</div>' +
        '</div>' +
        '<div id="gldsr-qr" style="flex:none"></div>' +
      '</div>' +
      '<div style="flex:0 0 auto;margin-top:12px;background:' + GOLD + ';color:' + NAVY + ';border-radius:12px;padding:13px 20px;text-align:center;font-size:12.5px;font-weight:700">' +
        '¿Querés conocer Golden Lake en persona? Escribinos por WhatsApp al ' + esc(AGENTE.telefono) +
      '</div>' +
      '<div style="flex:0 0 auto;margin-top:10px;font-size:9.5px;color:#94a3b8;text-align:center">Página 2 de 2 · Costa del Sol, La Herradura, La Paz</div>';

    document.body.appendChild(wrap);
    try {
      new window.QRCode(wrap.querySelector('#gldsr-qr'), {
        text: D.url || 'https://guerrero-properties.com/golden-lake.html', width: 84, height: 84,
        colorDark: NAVY, colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M,
      });
    } catch (ex) { console.error('QR Golden Lake:', ex); }
    await new Promise(function (r) { setTimeout(r, 120); });
    return wrap;
  }

  async function generarPDF() {
    var p1 = await construirPagina1();
    var p2 = await construirPagina2();
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    try {
      var c1 = await window.html2canvas(p1, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 794, windowHeight: 1123 });
      pdf.addImage(c1.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595.28, 841.89);
      pdf.addPage();
      var c2 = await window.html2canvas(p2, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 794, windowHeight: 1123 });
      pdf.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595.28, 841.89);
      pdf.save('dossier-golden-lake.pdf');
    } finally {
      if (p1 && p1.parentNode) p1.parentNode.removeChild(p1);
      if (p2 && p2.parentNode) p2.parentNode.removeChild(p2);
    }
  }
})();
