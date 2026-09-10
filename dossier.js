// ============================================================
//  Costo SV — Dossier de venta en PDF por propiedad
//  Se carga en la ficha pública (/propiedad/<slug>). Lee window.DOSSIER_DATA
//  que inyecta api/propiedad.js. Expone window.abrirDossier().
//
//  Flujo: botón "Descargar dossier" -> modal con formulario (nombre, WhatsApp,
//  correo) -> al enviar: guarda el lead en Supabase (contactos + leads),
//  arma el PDF de una página A4 con html2canvas + jsPDF + QR, y abre WhatsApp.
//
//  Librerías desde cdnjs, carga perezosa al enviar el formulario la 1ª vez.
// ============================================================
(function () {
  'use strict';

  var D = window.DOSSIER_DATA;
  if (!D) return;

  var LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  };
  var AZUL = '#003da5';
  var ROJO = '#dc1c2e';

  // ---------- estilos (modal; la plantilla del PDF lleva estilos inline) ----------
  var css = document.createElement('style');
  css.textContent = [
    '.dsr-overlay{position:fixed;inset:0;z-index:6000;background:rgba(8,12,22,.66);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:20px}',
    '.dsr-overlay.show{display:flex}',
    '.dsr-card{background:#fff;border-radius:18px;width:100%;max-width:420px;padding:30px 28px 26px;box-shadow:0 30px 70px rgba(0,0,0,.35);font-family:"Outfit",system-ui,sans-serif;position:relative;animation:dsr-in .22s ease}',
    '@keyframes dsr-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.dsr-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:1rem;cursor:pointer;line-height:34px}',
    '.dsr-x:hover{background:#e2e8f0}',
    '.dsr-eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + AZUL + '}',
    '.dsr-title{font-family:"Playfair Display",Georgia,serif;font-size:1.4rem;color:#0f172a;margin:6px 0 4px;line-height:1.25}',
    '.dsr-sub{font-size:.86rem;color:#64748b;margin:0 0 20px}',
    '.dsr-field{margin-bottom:14px}',
    '.dsr-field label{display:block;font-size:.78rem;font-weight:600;color:#475569;margin-bottom:6px}',
    '.dsr-field input{width:100%;padding:13px 15px;border:1.5px solid #e2e8f0;border-radius:11px;font:inherit;font-size:.95rem;color:#0f172a;background:#f8fafc;transition:border-color .15s,background .15s;box-sizing:border-box}',
    '.dsr-field input:focus{outline:0;border-color:' + AZUL + ';background:#fff;box-shadow:0 0 0 3px rgba(0,61,165,.12)}',
    '.dsr-err{color:' + ROJO + ';font-size:.8rem;margin:2px 0 10px;display:none}',
    '.dsr-err.show{display:block}',
    '.dsr-go{width:100%;margin-top:6px;padding:14px;border:0;border-radius:12px;background:' + AZUL + ';color:#fff;font:inherit;font-size:.98rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px}',
    '.dsr-go:hover{background:#00307f}',
    '.dsr-go:disabled{opacity:.7;cursor:progress}',
    '.dsr-spin{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:dsr-rot .7s linear infinite;display:none}',
    '.dsr-go.loading .dsr-spin{display:block}',
    '@keyframes dsr-rot{to{transform:rotate(360deg)}}',
    '.dsr-nota{font-size:.72rem;color:#94a3b8;text-align:center;margin:14px 0 0}',
    '.dsr-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:#0f172a;color:#fff;padding:13px 24px;border-radius:30px;font-family:"Outfit",sans-serif;font-size:.86rem;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:6100}',
    '.dsr-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
  ].join('');
  document.head.appendChild(css);

  // ---------- modal ----------
  var overlay = document.createElement('div');
  overlay.className = 'dsr-overlay';
  overlay.innerHTML =
    '<div class="dsr-card" role="dialog" aria-modal="true" aria-label="Recibir el dossier de la propiedad">' +
      '<button class="dsr-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<div class="dsr-eyebrow">Dossier de la propiedad</div>' +
      '<h2 class="dsr-title">Te enviamos la ficha completa en PDF</h2>' +
      '<p class="dsr-sub">' + esc(D.titulo) + '</p>' +
      '<form id="dsr-form" novalidate>' +
        '<div class="dsr-field"><label for="dsr-nombre">Nombre</label>' +
          '<input id="dsr-nombre" name="nombre" type="text" autocomplete="name" required></div>' +
        '<div class="dsr-field"><label for="dsr-wa">WhatsApp</label>' +
          '<input id="dsr-wa" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" placeholder="7000 0000" required></div>' +
        '<div class="dsr-field"><label for="dsr-mail">Correo</label>' +
          '<input id="dsr-mail" name="correo" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" required></div>' +
        '<p class="dsr-err" id="dsr-err"></p>' +
        '<button class="dsr-go" type="submit"><span class="dsr-spin"></span><span class="dsr-go-txt">Descargar dossier PDF</span></button>' +
        '<p class="dsr-nota">Usamos tus datos solo para dar seguimiento a esta propiedad.</p>' +
      '</form>' +
    '</div>';
  document.body.appendChild(overlay);

  var toast = document.createElement('div');
  toast.className = 'dsr-toast';
  document.body.appendChild(toast);

  var card = overlay.querySelector('.dsr-card');
  var form = overlay.querySelector('#dsr-form');
  var errBox = overlay.querySelector('#dsr-err');
  var btn = overlay.querySelector('.dsr-go');
  var btnTxt = overlay.querySelector('.dsr-go-txt');

  overlay.querySelector('.dsr-x').addEventListener('click', cerrar);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('show')) cerrar(); });

  window.abrirDossier = function () {
    overlay.classList.add('show');
    setTimeout(function () { var n = document.getElementById('dsr-nombre'); if (n) n.focus(); }, 60);
    metrica('dossier_abrir');
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
    var whatsapp = form.whatsapp.value.trim();
    var correo = form.correo.value.trim();
    var digitos = whatsapp.replace(/\D/g, '');

    if (!nombre) return err('Escribí tu nombre.');
    if (digitos.length < 8) return err('Escribí un número de WhatsApp válido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return err('Escribí un correo válido.');

    btn.disabled = true;
    btn.classList.add('loading');
    btnTxt.textContent = 'Generando…';

    // El lead se guarda aunque el PDF falle; el PDF se genera aunque el lead falle.
    guardarLead(nombre, whatsapp, correo);

    try {
      await cargarLibs();
      await generarPDF();
      metrica('dossier_pdf');
      abrirWhatsApp(nombre);
      cerrar();
      mostrarToast('Listo — revisá tu carpeta de descargas 📄');
      form.reset();
    } catch (ex) {
      console.error('dossier PDF:', ex);
      err('No se pudo generar el PDF. Probá de nuevo o escribinos por WhatsApp.');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btnTxt.textContent = 'Descargar dossier PDF';
    }
  });

  function err(msg) { errBox.textContent = msg; errBox.classList.add('show'); }

  // ---------- lead (mismo patrón que guardarLeadEnCRM de app.js) ----------
  async function guardarLead(nombre, whatsapp, correo) {
    var CFG = window.SITE_CONFIG || {};
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var headers = {
      'Content-Type': 'application/json',
      apikey: CFG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
      Prefer: 'return=minimal',
    };
    var contactoId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : (Date.now() + '-' + Math.random().toString(16).slice(2));
    try {
      var c = await fetch(CFG.SUPABASE_URL + '/rest/v1/contactos', {
        method: 'POST', headers: headers,
        body: JSON.stringify({ id: contactoId, nombre: nombre, telefono: whatsapp, correo: correo }),
      });
      if (!c.ok) return;
      await fetch(CFG.SUPABASE_URL + '/rest/v1/leads', {
        method: 'POST', headers: headers,
        body: JSON.stringify({
          contacto_id: contactoId,
          origen: 'formulario_web',
          interes: 'comprar',
          propiedad_referencia: D.titulo,
          notas: 'Solicitó dossier — ' + D.url,
        }),
      });
    } catch (ex) {
      console.error('lead dossier:', ex);
    }
  }

  function abrirWhatsApp(nombre) {
    var n = String(D.waNumber || '').replace(/\D/g, '');
    if (!n) return;
    var msg = 'Hola Walter, soy ' + nombre + '. Descargué el dossier de "' + D.titulo +
      '" (' + D.url + ') y quiero más información.';
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  function metrica(nota) {
    try {
      if (window.CostoSVMetricas) window.CostoSVMetricas.registrarEvento('ficha_view', nota + ': ' + D.titulo);
    } catch (ex) {}
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

  // ---------- plantilla del dossier ----------
  function proxear(u) {
    if (!u) return '';
    if (/^data:/i.test(u) || u.charAt(0) === '/') return u;
    return '/api/img?u=' + encodeURIComponent(u);
  }

  function cargarImagen(img) {
    return new Promise(function (res) {
      if (img.complete && img.naturalWidth) return res();
      img.onload = function () { res(); };
      img.onerror = function () { img.style.visibility = 'hidden'; res(); };
      setTimeout(res, 6000);
    });
  }

  function chipsHtml() {
    var chips = [];
    if (D.tipo) chips.push(['', D.tipo]);
    if (D.habitaciones) chips.push([D.habitaciones, 'Habitaciones']);
    if (D.banos) chips.push([D.banos, 'Baños']);
    if (D.garage) chips.push(['', 'Con parqueo']);
    if (D.m2) chips.push([D.m2, 'm²']);
    else if (D.tamanoLote) chips.push(['', 'Lote ' + D.tamanoLote]);
    return chips.slice(0, 4).map(function (c) {
      return '<span style="display:inline-flex;align-items:baseline;gap:6px;border:1px solid #e5e7eb;border-radius:22px;padding:8px 16px;font-size:13px;color:#1f2937;font-weight:500">' +
        (c[0] ? '<b style="color:' + AZUL + ';font-size:14px">' + esc(c[0]) + '</b>' : '') + esc(c[1]) + '</span>';
    }).join('');
  }

  function thumbsHtml() {
    var extra = (D.fotos || []).slice(1, 4).filter(Boolean);
    if (extra.length < 2) return '';
    return '<div style="display:flex;gap:10px;margin-top:10px">' +
      extra.map(function (u) {
        return '<div style="flex:1;height:104px;border-radius:10px;overflow:hidden;background:#e5e7eb">' +
          '<img src="' + esc(proxear(u)) + '" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>';
      }).join('') + '</div>';
  }

  function caracteristicasHtml() {
    var items = [];
    if (D.tipo) items.push('Tipo: ' + D.tipo);
    if (D.tamanoLote) items.push('Lote: ' + D.tamanoLote);
    if (D.tamanoConstruccion) items.push('Construcción: ' + D.tamanoConstruccion);
    if (D.m2 && !D.garage && !D.habitaciones) items.push('Área: ' + D.m2 + ' m²');
    if (D.nueva) items.push('Propiedad nueva');
    if (D.comunidadCerrada) items.push('Comunidad cerrada');
    if (D.hoa) items.push('Cuota de mantenimiento (HOA)');
    if (D.categoria) items.push('Categoría: ' + D.categoria);
    if (D.fechaPublicacion) items.push('Publicado: ' + D.fechaPublicacion);
    if (!items.length) return '';
    return '<div style="margin-top:16px">' +
      '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:14px;color:' + AZUL + ';font-weight:700;margin-bottom:7px;letter-spacing:.02em">CARACTERÍSTICAS</div>' +
      '<ul style="margin:0;padding:0;list-style:none;font-size:12px;color:#374151;line-height:1.85">' +
      items.map(function (t) {
        return '<li style="padding-left:16px;position:relative"><span style="position:absolute;left:0;color:' + AZUL + '">&#9642;</span>' + esc(t) + '</li>';
      }).join('') + '</ul></div>';
  }

  async function construirPlantilla() {
    var badge = 'EN ' + String(D.contrato || '').toUpperCase();
    var descripcion = recortar(D.descripcion, 620);
    var wrap = document.createElement('div');
    wrap.id = 'dsr-doc';
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;background:#fff;overflow:hidden;' +
      'display:flex;flex-direction:column;font-family:"Outfit",system-ui,sans-serif;color:#1a1a2e;padding:42px;box-sizing:border-box';
    wrap.innerHTML =
      // barra superior
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
        '<img src="/assets/logo-remax.png" style="height:32px;display:block" alt="RE/MAX">' +
        '<span style="background:' + ROJO + ';color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.06em;padding:7px 15px;border-radius:20px">' + esc(badge) + '</span>' +
      '</div>' +
      // foto principal con precio
      '<div style="position:relative;width:100%;height:388px;border-radius:14px;overflow:hidden;background:#e5e7eb">' +
        '<img id="dsr-hero" src="' + esc(proxear(D.foto)) + '" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block" alt="">' +
        '<span style="position:absolute;left:16px;bottom:16px;background:rgba(15,23,42,.88);color:#fff;font-size:19px;font-weight:700;padding:9px 18px;border-radius:10px">' + esc(precioTxt(D.precio)) + '</span>' +
      '</div>' +
      thumbsHtml() +
      // título + dirección
      '<h1 style="font-family:\'Playfair Display\',Georgia,serif;font-size:22px;line-height:1.25;margin:16px 0 4px;color:#0f172a">' + esc(D.titulo) + '</h1>' +
      (D.ubicacion ? '<div style="font-size:12.5px;color:#6b7280">' + esc(D.ubicacion) + '</div>' : '') +
      // chips
      '<div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:12px;padding:13px 0;border-top:1px solid #ececec;border-bottom:1px solid #ececec">' + chipsHtml() + '</div>' +
      // cuerpo: descripción + características (izq) / tarjeta agente (der)
      '<div style="display:flex;gap:22px;margin-top:16px">' +
        '<div style="flex:1 1 auto;min-width:0">' +
          (descripcion ?
            '<div style="font-family:\'Playfair Display\',Georgia,serif;font-size:14px;color:' + AZUL + ';font-weight:700;margin-bottom:7px;letter-spacing:.02em">DESCRIPCIÓN</div>' +
            '<div style="font-size:12.5px;color:#374151;line-height:1.75">' + esc(descripcion) + '</div>'
            : '') +
          caracteristicasHtml() +
        '</div>' +
        '<div style="flex:0 0 224px;border:1px solid #e5e7eb;border-radius:14px;padding:18px 16px;text-align:center">' +
          '<img src="' + esc(D.agente.foto) + '" style="width:62px;height:62px;border-radius:50%;object-fit:cover;margin:0 auto 9px;display:block" alt="">' +
          '<div style="font-size:14.5px;font-weight:700;color:#0f172a">' + esc(D.agente.nombre) + '</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-bottom:9px">' + esc(D.agente.titulo) + '</div>' +
          '<div style="font-size:11px;color:#374151;line-height:1.65;word-break:break-word">' + esc(D.agente.telefono) + '<br>' + esc(D.agente.email) + '</div>' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:.14em;color:' + AZUL + ';margin:13px 0 7px">VER MÁS</div>' +
          '<div id="dsr-qr" style="display:flex;justify-content:center"></div>' +
        '</div>' +
      '</div>' +
      // empuja el CTA y el pie hacia abajo
      '<div style="flex:1 1 auto;min-height:14px"></div>' +
      // CTA
      '<div style="background:' + AZUL + ';color:#fff;border-radius:12px;padding:15px 22px;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-size:13.5px;font-weight:600">¿Querés visitarla? Escribime por WhatsApp</span>' +
        '<span style="font-size:15px;font-weight:800">' + esc(D.agente.telefono) + '</span>' +
      '</div>' +
      // pie
      '<div style="padding-top:11px;margin-top:11px;border-top:1px solid #ececec;font-size:10px;color:#94a3b8;text-align:center">' +
        esc([D.idExterno || D.slug, D.ubicacion, D.agente.email, D.agente.telefono].filter(Boolean).join('  •  ')) +
      '</div>';

    document.body.appendChild(wrap);

    // QR
    try {
      new window.QRCode(wrap.querySelector('#dsr-qr'), {
        text: D.url, width: 124, height: 124,
        colorDark: '#0f172a', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } catch (ex) { console.error('QR:', ex); }

    await Promise.all(Array.prototype.map.call(wrap.querySelectorAll('img'), cargarImagen));
    await new Promise(function (r) { setTimeout(r, 120); }); // deja pintar el QR
    return wrap;
  }

  async function generarPDF() {
    var el = await construirPlantilla();
    try {
      var canvas = await window.html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: 794, height: 1123, windowWidth: 794, windowHeight: 1123,
      });
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595.28, 841.89);
      pdf.save('dossier-' + (D.slug || 'propiedad') + '.pdf');
    } finally {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }

  // ---------- utils ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function precioTxt(p) {
    p = String(p || '').trim();
    if (!p || /consultar/i.test(p)) return 'Precio a consultar';
    return /^\s*(usd|us\$|\$)/i.test(p) ? p : 'USD ' + p;
  }
  function recortar(t, n) {
    var s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    var corte = s.slice(0, n);
    var esp = corte.lastIndexOf(' ');
    return (esp > 0 ? corte.slice(0, esp) : corte).trim() + '…';
  }
})();
