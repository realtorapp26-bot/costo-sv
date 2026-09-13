// ============================================================
//  Costo SV — Agendar Visita
//  Formulario corto (propiedad, recurso económico, fecha/hora, datos de
//  contacto). Al enviar: guarda contacto+lead+actividad en Supabase, genera
//  un PDF de confirmación, ofrece agregar la visita a Google Calendar (link,
//  sin OAuth) y abre WhatsApp con el resumen para Walter.
//  Página: /agendar-visita.html · acceso solo por link (noindex, sin login).
// ============================================================
(function () {
  'use strict';

  var form = document.getElementById('visitForm');
  var el = function (id) { return document.getElementById(id); };
  var errorBox = el('errorBox');
  var errorList = el('errorList');
  var generateBtn = el('generateBtn');
  var btnTxt = generateBtn.querySelector('.co-generate-txt');
  var okBox = el('okBox');
  var calLink = el('calLink');

  function showErrors(list) {
    errorList.innerHTML = '';
    list.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; errorList.appendChild(li); });
    errorBox.classList.remove('d-none');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function hideErrors() {
    errorBox.classList.add('d-none');
    errorList.innerHTML = '';
    Array.prototype.forEach.call(form.querySelectorAll('.is-invalid'), function (n) { n.classList.remove('is-invalid'); });
  }

  function collectValues() {
    hideErrors();
    var errors = [];
    var firstInvalid = null;
    function val(name) { return (form.elements[name] && form.elements[name].value ? String(form.elements[name].value) : '').trim(); }
    function bad(node, msg) { if (node) { node.classList.add('is-invalid'); if (!firstInvalid) firstInvalid = node; } errors.push(msg); }

    if (!val('propiedad')) bad(form.elements['propiedad'], 'Contanos qué propiedad querés visitar.');
    if (!val('recurso')) bad(form.elements['recurso'], 'Seleccioná la forma de pago.');
    if (!val('fecha_visita')) bad(form.elements['fecha_visita'], 'Elegí una fecha para la visita.');
    if (!val('hora_visita')) bad(form.elements['hora_visita'], 'Elegí una hora disponible.');
    if (!val('nombre')) bad(form.elements['nombre'], 'Ingresá tu nombre completo.');
    var correo = val('correo');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) bad(form.elements['correo'], 'Ingresá un correo válido.');
    if (val('telefono').replace(/\D/g, '').length < 8) bad(form.elements['telefono'], 'Ingresá un número de contacto válido.');

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      return null;
    }

    return {
      propiedad: val('propiedad'),
      recurso: val('recurso'),
      recursoExplicacion: val('recurso_explicacion'),
      fechaVisita: val('fecha_visita'),
      horaVisita: val('hora_visita'),
      nombre: val('nombre'),
      correo: correo,
      telefono: val('telefono'),
    };
  }

  // ---------- fecha para mostrar ----------
  function fechaLarga(fechaISO, hora) {
    var d = new Date(fechaISO + 'T' + hora + ':00');
    if (isNaN(d.getTime())) return fechaISO + ' ' + hora;
    var texto = d.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var horaTxt = d.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
    return texto.charAt(0).toUpperCase() + texto.slice(1) + ' — ' + horaTxt;
  }

  // ---------- link de Google Calendar (sin OAuth, "quick add") ----------
  // El Salvador no usa horario de verano: UTC-6 todo el año.
  function toGCalUTC(fechaISO, hora, minutosDuracion) {
    var partes = fechaISO.split('-').map(Number);
    var horaPartes = hora.split(':').map(Number);
    var utcMs = Date.UTC(partes[0], partes[1] - 1, partes[2], horaPartes[0] + 6, horaPartes[1]) + (minutosDuracion || 0) * 60000;
    return new Date(utcMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  function construirLinkCalendario(v) {
    var inicio = toGCalUTC(v.fechaVisita, v.horaVisita, 0);
    var fin = toGCalUTC(v.fechaVisita, v.horaVisita, 45);
    var detalles = 'Visita solicitada por ' + v.nombre + ' (' + v.telefono + ' / ' + v.correo + ').' +
      ' Forma de pago: ' + v.recurso + (v.recursoExplicacion ? ' — ' + v.recursoExplicacion : '') + '.';
    var params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Visita: ' + v.propiedad,
      dates: inicio + '/' + fin,
      details: detalles,
      location: v.propiedad,
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  // ---------- PDF de confirmación ----------
  function fitText(pdf, text, width, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 11.4;
    var minFontSize = opts.minFontSize || Math.max(9.2, fontSize - 2.2);
    var maxLines = opts.maxLines || 0;
    var lines = [];
    for (var size = fontSize; size >= minFontSize; size -= 0.2) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(size);
      lines = pdf.splitTextToSize(text || '', width);
      fontSize = size;
      if (!maxLines || lines.length <= maxLines) break;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    return { lines: lines, fontSize: fontSize, lineHeight: opts.lineHeight || (fontSize * 1.4) };
  }
  function fieldRow(pdf, index, label, value, x, y, width) {
    var fit = fitText(pdf, value || '—', width - 48, { fontSize: 11.4, minFontSize: 9.6, maxLines: 3 });
    var h = Math.max(46, 26 + fit.lines.length * fit.lineHeight);
    pdf.setFillColor(250, 252, 255);
    pdf.setDrawColor(229, 235, 243);
    pdf.roundedRect(x, y - 16, width, h, 10, 10, 'FD');
    pdf.setTextColor(229, 57, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.2);
    pdf.text(String(index) + '.', x + 14, y + 2);
    pdf.setTextColor(11, 45, 92);
    pdf.text(label, x + 34, y + 2);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fit.fontSize);
    pdf.text(fit.lines, x + 34, y + 20);
    return y + h + 12;
  }

  function buildPdf(v) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    var pageW = pdf.internal.pageSize.getWidth();
    var x = 46;
    var width = pageW - 92;

    pdf.setFillColor(229, 57, 53);
    pdf.rect(0, 0, pageW * 0.34, 14, 'F');
    pdf.setFillColor(11, 45, 92);
    pdf.rect(pageW * 0.34, 0, pageW * 0.66, 14, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(30, 24, pageW - 60, 106, 22, 22, 'F');
    pdf.setDrawColor(225, 232, 240);
    pdf.roundedRect(30, 24, pageW - 60, 106, 22, 22, 'S');
    pdf.setTextColor(229, 57, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Guerrero Properties', 50, 54);
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('CONFIRMACIÓN DE VISITA', 50, 80);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text('Solicitud de visita a propiedad', 50, 102);
    pdf.setDrawColor(229, 57, 53);
    pdf.setLineWidth(1.2);
    pdf.line(50, 114, 188, 114);

    var y = 152;
    pdf.setTextColor(15, 23, 42);
    var intro = fitText(pdf, 'Hola ' + v.nombre + ', confirmamos que recibimos tu solicitud de visita con los siguientes datos:', width, { fontSize: 11.8, lineHeight: 16.8, maxLines: 3 });
    pdf.text(intro.lines, x, y, { baseline: 'top' });
    y += intro.lines.length * intro.lineHeight + 12;

    y = fieldRow(pdf, 1, 'Propiedad', v.propiedad, x, y, width);
    y = fieldRow(pdf, 2, 'Fecha y hora propuestas', fechaLarga(v.fechaVisita, v.horaVisita), x, y, width);
    y = fieldRow(pdf, 3, 'Forma de pago', v.recurso + (v.recursoExplicacion ? ' — ' + v.recursoExplicacion : ''), x, y, width);
    y = fieldRow(pdf, 4, 'Contacto', v.nombre + ' · ' + v.telefono + ' · ' + v.correo, x, y, width);

    y += 8;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(219, 228, 239);
    var notaTexto = 'Esta solicitud queda sujeta a la disponibilidad del agente. Te contactaremos por WhatsApp o correo para confirmar el horario definitivo de la visita.';
    var notaFit = fitText(pdf, notaTexto, width - 28, { fontSize: 10.4, minFontSize: 9.4, maxLines: 4 });
    var notaH = Math.max(50, 24 + notaFit.lines.length * notaFit.lineHeight);
    pdf.roundedRect(x, y, width, notaH, 12, 12, 'FD');
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(notaFit.fontSize);
    pdf.text(notaFit.lines, x + 14, y + 20, { baseline: 'top' });

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(9);
    pdf.text('Guerrero Properties · Documento generado electrónicamente', pageW / 2, pdf.internal.pageSize.getHeight() - 30, { align: 'center' });

    return pdf;
  }

  // ---------- registro en el CRM (no bloqueante) ----------
  function registrarEnCRM(v, pdfBlob) {
    var CFG = window.SITE_CONFIG || {};
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var headers = { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY, Prefer: 'return=minimal' };
    var contactoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2));
    var resumen = 'Visita solicitada — ' + v.propiedad + ' — ' + fechaLarga(v.fechaVisita, v.horaVisita) +
      ' — Forma de pago: ' + v.recurso + (v.recursoExplicacion ? ' (' + v.recursoExplicacion + ')' : '');

    fetch(CFG.SUPABASE_URL + '/rest/v1/contactos', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ id: contactoId, nombre: v.nombre, telefono: v.telefono, correo: v.correo }),
    }).then(function (c) {
      if (!c.ok) return c.text().then(function (t) { throw new Error('contactos ' + c.status + ': ' + t); });
      return fetch(CFG.SUPABASE_URL + '/rest/v1/leads', {
        method: 'POST', headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
        body: JSON.stringify({ contacto_id: contactoId, origen: 'formulario_web', interes: 'comprar', propiedad_referencia: v.propiedad, notas: resumen }),
      });
    }).then(function (l) {
      if (!l.ok) return l.text().then(function (t) { throw new Error('leads ' + l.status + ': ' + t); });
      return l.json().then(function (rows) {
        var leadId = rows && rows[0] && rows[0].id;
        if (!leadId) return;
        var acts = fetch(CFG.SUPABASE_URL + '/rest/v1/actividades', {
          method: 'POST', headers: headers,
          body: JSON.stringify({ lead_id: leadId, tipo: 'cita', detalle: resumen }),
        });
        if (!pdfBlob) return acts;
        // Sube la confirmación al mismo bucket privado que usan las cartas de
        // oferta/respuesta, y la enlaza al lead para descargarla desde el panel.
        var path = new Date().getFullYear() + '/' + leadId + '.pdf';
        var up = fetch(CFG.SUPABASE_URL + '/storage/v1/object/ofertas/' + path, {
          method: 'POST',
          headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
          body: pdfBlob,
        }).then(function (u) {
          if (!u.ok) { console.error('subida de la confirmación de visita:', u.status); return; }
          return fetch(CFG.SUPABASE_URL + '/rest/v1/leads?id=eq.' + leadId, {
            method: 'PATCH', headers: headers, body: JSON.stringify({ oferta_pdf_path: path }),
          });
        });
        return Promise.all([acts, up]);
      });
    }).catch(function (e) { console.error('registro agendar-visita:', e); });
  }

  function abrirWhatsApp(v) {
    var CFG = window.SITE_CONFIG || {};
    var n = String(CFG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!n) return;
    var msg = 'Hola Walter, soy ' + v.nombre + '. Quiero agendar una visita a "' + v.propiedad + '" el ' +
      fechaLarga(v.fechaVisita, v.horaVisita) + '. Forma de pago: ' + v.recurso +
      (v.recursoExplicacion ? ' (' + v.recursoExplicacion + ')' : '') + '. Mi contacto: ' + v.telefono + ' / ' + v.correo + '.';
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  }

  function generar() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showErrors(['No se pudo cargar el generador de PDF. Recargá la página e intentá de nuevo.']);
      return;
    }
    var v = collectValues();
    if (!v) return;

    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    btnTxt.textContent = 'Enviando…';
    try {
      var pdf = buildPdf(v);
      var slug = (v.nombre || 'visita').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'visita';
      var pdfBlob = pdf.output('blob');
      pdf.save('confirmacion-visita-' + slug + '.pdf');
      registrarEnCRM(v, pdfBlob);
      calLink.href = construirLinkCalendario(v);
      form.classList.add('d-none');
      okBox.classList.add('show');
      okBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      abrirWhatsApp(v);
    } catch (ex) {
      console.error('PDF agendar-visita:', ex);
      showErrors(['No se pudo generar el PDF: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = 'Enviar solicitud de visita';
    }
  }

  // ---------- prefill por querystring (propiedad) ----------
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('propiedad')) el('propiedad').value = q.get('propiedad');
  }

  var hoy = new Date().toISOString().slice(0, 10);
  el('fecha_visita').min = hoy;

  generateBtn.addEventListener('click', generar);
  prefill();
})();
