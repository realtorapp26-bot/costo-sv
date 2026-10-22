// ============================================================
//  Costo SV — KYC: formulario público que completa el cliente
//  (link generado por el agente desde el panel al crear el caso).
//  Página: /kyc-cliente.html · acceso solo por link (noindex).
//  jsPDF nativo, igual patrón que carta-oferta.js/carta-respuesta.js.
//  Por defecto en inglés (clientes mayormente estadounidenses), con
//  anexo en español en el mismo PDF.
// ============================================================
(function () {
  'use strict';

  var form = document.getElementById('kycForm');
  var el = function (id) { return document.getElementById(id); };

  // ---------- datos precargados por el link ----------
  var q = new URLSearchParams(window.location.search);
  var casoId = q.get('caso') || '';
  var numero = q.get('numero') || '';
  var nombre = q.get('nombre') || '';
  var correo = q.get('correo') || '';
  var tipoCliente = q.get('tipo') || 'persona_natural';
  var tipoClienteLabel = tipoCliente === 'persona_juridica' ? 'Legal entity / Persona jurídica' : 'Individual / Persona natural';

  if (!casoId || !nombre) {
    el('loadError').classList.remove('d-none');
    el('formWrap').classList.add('d-none');
    return;
  }

  el('numero_view').value = numero;
  el('cliente_tipo_view').value = tipoClienteLabel;
  el('nombre_view').value = nombre;
  el('correo_view').value = correo;

  var documentLanguage = el('document_language');
  var fechaNacimiento = el('fecha_nacimiento');
  var nacionalidad = el('nacionalidad');
  var paisResidencia = el('pais_residencia');
  var telefono = el('telefono');
  var direccion = el('direccion');
  var ocupacion = el('ocupacion');
  var documentoTipo = el('documento_tipo');
  var documentoNumero = el('documento_numero');
  var declaracion = el('declaracion_veracidad');
  var errorBox = el('errorBox');
  var errorList = el('errorList');
  var canvas = el('signaturePad');
  var generateBtn = el('generateBtn');
  var btnTxt = generateBtn.querySelector('.co-generate-txt');
  var btnTxtEn = generateBtn.querySelector('.co-generate-txt-en');

  // ---------- fecha / hora ----------
  function nowParts() {
    var now = new Date();
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var mesesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var yyyy = String(now.getFullYear());
    var hh = String(now.getHours()).padStart(2, '0');
    var min = String(now.getMinutes()).padStart(2, '0');
    return {
      dateInput: dd + '/' + mm + '/' + yyyy,
      dateLong: now.getDate() + ' de ' + meses[now.getMonth()] + ' de ' + now.getFullYear(),
      dateLongEnglish: mesesEn[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
      time: hh + ':' + min,
    };
  }
  function formatDateHuman(isoDate, language) {
    if (!isoDate) return '';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    var y = parts[0], m = parts[1], d = parts[2];
    return language === 'en' ? (m + '/' + d + '/' + y) : (d + '/' + m + '/' + y);
  }

  // ---------- idioma ----------
  function toggleDocumentLanguage() {
    // El idioma elegido solo decide el orden/énfasis del PDF -- el
    // formulario en pantalla ya muestra ambos idiomas en todo momento.
  }
  documentLanguage.addEventListener('change', toggleDocumentLanguage);

  // ---------- firma (canvas) ----------
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var hasSignature = false;
  var signatureData = '';

  function initCanvas() {
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(Math.floor(rect.width), 300);
    var height = Math.max(Math.floor(rect.height), 180);
    var previous = hasSignature ? canvas.toDataURL('image/png') : signatureData;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b2d5c';
    if (previous) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, width, height); hasSignature = true; };
      img.src = previous;
    }
  }
  function point(e) {
    var rect = canvas.getBoundingClientRect();
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }
  function startDraw(e) { e.preventDefault(); drawing = true; var p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function moveDraw(e) { if (!drawing) return; e.preventDefault(); var p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSignature = true; }
  function endDraw(e) {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    ctx.closePath();
    signatureData = hasSignature ? canvas.toDataURL('image/png') : '';
  }
  ['mousedown', 'touchstart'].forEach(function (ev) { canvas.addEventListener(ev, startDraw, { passive: false }); });
  ['mousemove', 'touchmove'].forEach(function (ev) { canvas.addEventListener(ev, moveDraw, { passive: false }); });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (ev) { canvas.addEventListener(ev, endDraw, { passive: false }); });
  window.addEventListener('resize', initCanvas);
  el('clearSignature').addEventListener('click', function () { hasSignature = false; signatureData = ''; initCanvas(); });

  // ---------- documentos de identidad (sin recorte agresivo -- es un
  // documento legal, se prioriza nitidez sobre peso del archivo; solo se
  // convierte HEIC a JPEG porque el navegador no puede mostrarlo ni
  // jsPDF/el servidor procesarlo tal cual) ----------
  async function prepararDocumentoIdentidad(file) {
    var esHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    if (!esHeic) return file;
    if (typeof window.heic2any !== 'function') {
      throw new Error('no se pudo convertir este formato HEIC -- recargá la página e intentá de nuevo');
    }
    var resultado = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    var blob = Array.isArray(resultado) ? resultado[0] : resultado;
    var nombreNuevo = file.name.replace(/\.hei[cf]$/i, '.jpg');
    return new File([blob], nombreNuevo, { type: 'image/jpeg' });
  }
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- helpers PDF (paginación real -- igual patrón que
  // carta-respuesta.js, porque acá hay demasiados campos para entrar fijos
  // en una sola página como carta-oferta.js, y antes se superponían con la
  // firma cuando el contenido era más largo) ----------
  function fitText(pdf, text, width, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 10.2;
    var minFontSize = opts.minFontSize || Math.max(8.2, fontSize - 1.6);
    var fontStyle = opts.fontStyle || 'normal';
    var maxLines = opts.maxLines || 0;
    var lines = [];
    for (var size = fontSize; size >= minFontSize; size -= 0.2) {
      pdf.setFont('helvetica', fontStyle);
      pdf.setFontSize(size);
      lines = pdf.splitTextToSize(text || '', width);
      fontSize = size;
      if (!maxLines || lines.length <= maxLines) break;
    }
    pdf.setFont('helvetica', fontStyle);
    pdf.setFontSize(fontSize);
    return { lines: lines, fontSize: fontSize, lineHeight: opts.lineHeight || (fontSize * 1.36) };
  }
  function paragraph(pdf, text, x, y, width, opts) {
    var f = fitText(pdf, text, width, opts || {});
    pdf.setFont('helvetica', (opts && opts.fontStyle) || 'normal');
    pdf.setFontSize(f.fontSize);
    pdf.text(f.lines, x, y, { baseline: 'top' });
    return y + (f.lines.length * f.lineHeight);
  }
  function sectionLabel(pdf, text, x, y) {
    pdf.setFillColor(229, 57, 53);
    pdf.roundedRect(x, y + 1, 3, 11, 1.5, 1.5, 'F');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.0);
    pdf.text(String(text).toUpperCase(), x + 10, y, { baseline: 'top' });
    pdf.setTextColor(22, 31, 49);
    return y + 16;
  }
  function buildInfoRows(pdf, items, width, fontSize) {
    var rows = [];
    var index = 0;
    while (index < items.length) {
      var first = items[index];
      if (first.span || index === items.length - 1 || items[index + 1].span) {
        rows.push([{ item: first, width: width }]);
        index += 1;
      } else {
        rows.push([{ item: first, width: width / 2 }, { item: items[index + 1], width: width / 2 }]);
        index += 2;
      }
    }
    rows.forEach(function (row) {
      row.forEach(function (cell) {
        pdf.setFont('helvetica', cell.item.bold ? 'bold' : 'normal');
        pdf.setFontSize(fontSize);
        cell.lines = pdf.splitTextToSize(String(cell.item.value || '—'), cell.width - 24);
      });
      row.height = Math.max.apply(null, row.map(function (cell) {
        return 21 + (Math.max(1, cell.lines.length) * (fontSize * 1.20));
      }));
      row.height = Math.max(34, row.height);
    });
    return rows;
  }
  function infoGrid(pdf, items, x, y, width, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 9.4;
    var rows = buildInfoRows(pdf, items, width, fontSize);
    var height = rows.reduce(function (s, r) { return s + r.height; }, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(210, 219, 231);
    pdf.roundedRect(x, y, width, height, 7, 7, 'FD');
    var rowY = y;
    rows.forEach(function (row, ri) {
      if (ri > 0) { pdf.setDrawColor(224, 230, 239); pdf.line(x, rowY, x + width, rowY); }
      var cellX = x;
      row.forEach(function (cell, ci) {
        if (ci > 0) { pdf.setDrawColor(224, 230, 239); pdf.line(cellX, rowY + 7, cellX, rowY + row.height - 7); }
        pdf.setTextColor(73, 91, 117);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.4);
        pdf.text(String(cell.item.label || '').toUpperCase(), cellX + 12, rowY + 9, { baseline: 'top' });
        pdf.setTextColor(17, 27, 45);
        pdf.setFont('helvetica', cell.item.bold ? 'bold' : 'normal');
        pdf.setFontSize(fontSize);
        pdf.text(cell.lines, cellX + 12, rowY + 21, { baseline: 'top' });
        cellX += cell.width;
      });
      rowY += row.height;
    });
    return y + height;
  }
  function drawPageHeader(pdf, title, continuation, language) {
    var isEnglish = language === 'en';
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(252, 253, 255);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.setFillColor(229, 57, 53);
    pdf.rect(0, 0, pageW * 0.31, 8, 'F');
    pdf.setFillColor(11, 45, 92);
    pdf.rect(pageW * 0.31, 0, pageW * 0.69, 8, 'F');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(continuation ? 10.5 : 13);
    pdf.text('Guerrero Properties', 64, continuation ? 28 : 34, { baseline: 'top' });
    pdf.setTextColor(83, 100, 125);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text(continuation ? (isEnglish ? 'CONTINUED' : 'CONTINUACIÓN') : (isEnglish ? 'CUSTOMER IDENTIFICATION FORM' : 'FORMULARIO DE IDENTIFICACIÓN DEL CLIENTE'), pageW - 64, continuation ? 29 : 36, { align: 'right' });
    var lineY = continuation ? 72 : 91;
    pdf.setDrawColor(205, 214, 227);
    pdf.line(64, lineY, pageW - 64, lineY);
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(continuation ? 11.3 : 15.6);
    pdf.text(title, 64, continuation ? 88 : 108, { baseline: 'top' });
    return continuation ? 116 : 140;
  }
  function ensureSpace(pdf, y, requiredHeight, title, language) {
    var usableBottom = pdf.internal.pageSize.getHeight() - 54;
    if (y + requiredHeight <= usableBottom) return y;
    pdf.addPage();
    return drawPageHeader(pdf, title, true, language);
  }
  function addPageFooters(pdf, englishPageCount) {
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var total = pdf.getNumberOfPages();
    for (var page = 1; page <= total; page++) {
      pdf.setPage(page);
      var isEnglish = !!englishPageCount && page <= englishPageCount;
      pdf.setDrawColor(218, 225, 235);
      pdf.line(64, pageH - 24, pageW - 64, pageH - 24);
      pdf.setTextColor(105, 119, 140);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.text(isEnglish ? 'Guerrero Properties · Electronically generated document' : 'Guerrero Properties · Documento generado electrónicamente', 64, pageH - 10);
      pdf.text((isEnglish ? 'Page ' : 'Página ') + page + (isEnglish ? ' of ' : ' de ') + total, pageW - 64, pageH - 10, { align: 'right' });
    }
  }
  function drawSignatureBlock(pdf, values, contentY, title, language) {
    var isEnglish = language === 'en';
    var pageH = pdf.internal.pageSize.getHeight();
    var x = 64;
    var width = pdf.internal.pageSize.getWidth() - 128;
    // La fecha y la firma siguen al contenido. Antes estaban clavadas en 580 y
    // 668, así que cuando el texto terminaba arriba quedaba un hueco enorme
    // entre el cuerpo y la firma.
    var dateY = contentY + 24;
    var signatureLineY = dateY + 70;
    if (signatureLineY + 60 > pageH - 24) {
      pdf.addPage();
      drawPageHeader(pdf, title, true, language);
      dateY = 150;
      signatureLineY = 230;
    }
    pdf.setTextColor(31, 43, 64);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.8);
    pdf.text(isEnglish ? 'Signed on ' + values.signDateLongEnglish + '.' : 'Firmado el ' + values.signDateLong + '.', x, dateY);
    // Dos columnas parejas sobre el ancho real: firma a la izquierda,
    // fecha y hora a la derecha.
    var colW = (width - 40) / 2;
    pdf.setDrawColor(139, 152, 171);
    pdf.line(x, signatureLineY, x + colW, signatureLineY);
    if (values.signatureData) {
      try {
        var props = pdf.getImageProperties(values.signatureData);
        var ratio = props.width / props.height;
        var sw = Math.min(colW - 20, 58 * ratio);
        var sh = sw / ratio;
        if (sh > 58) { sh = 58; sw = sh * ratio; }
        pdf.addImage(values.signatureData, 'PNG', x + (colW - sw) / 2, signatureLineY - sh - 10, sw, sh, 'clientSignature', 'FAST');
      } catch (e) {}
    }
    var rightX = x + colW + 40;
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.4);
    pdf.text(isEnglish ? 'SIGNATURE' : 'FIRMA', x, signatureLineY + 20);
    pdf.text(isEnglish ? 'NAME' : 'NOMBRE', x, signatureLineY + 42);
    pdf.text(isEnglish ? 'DATE' : 'FECHA', rightX, signatureLineY + 20);
    pdf.text(isEnglish ? 'TIME' : 'HORA', rightX, signatureLineY + 42);
    pdf.setTextColor(22, 31, 49);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text(values.nombre, x + 58, signatureLineY + 42);
    pdf.text(values.signDate, rightX + 52, signatureLineY + 20);
    pdf.text(values.signTime, rightX + 52, signatureLineY + 42);
    return signatureLineY + 58;
  }

  function renderKycDocument(pdf, values, language) {
    var isEnglish = language === 'en';
    var pageW = pdf.internal.pageSize.getWidth();
    var x = 64;
    var width = pageW - 128;
    var cardX = x + 12;
    var cardWidth = width - 24;
    var title = isEnglish ? 'KYC FORM' : 'FORMULARIO KYC';

    var y = drawPageHeader(pdf, title, false, language);
    pdf.setTextColor(22, 31, 49);

    if (values.documentLanguage === 'en') {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.4);
      pdf.text(isEnglish ? 'ATTACHMENT: The complete Spanish version follows this page.' : 'ANEXO: La versión en inglés forma parte de este mismo documento.', x, y, { baseline: 'top' });
      y += 14;
    }

    y = sectionLabel(pdf, isEnglish ? 'Case' : 'Caso', x, y);
    y = infoGrid(pdf, [
      { label: isEnglish ? 'Case number' : 'Número de caso', value: values.numero },
      { label: isEnglish ? 'Client type' : 'Tipo de cliente', value: isEnglish ? values.tipoClienteEn : values.tipoClienteEs },
    ], cardX, y, cardWidth, { fontSize: 9.4 });
    y += 8;

    y = sectionLabel(pdf, isEnglish ? 'Your information' : 'Tus datos', x, y);
    y = infoGrid(pdf, [
      { label: isEnglish ? 'Full name' : 'Nombre completo', value: values.nombre, bold: true, span: true },
      { label: isEnglish ? 'Email' : 'Correo electrónico', value: values.correo, span: true },
      { label: isEnglish ? 'Date of birth' : 'Fecha de nacimiento', value: formatDateHuman(values.fechaNacimiento, language) },
      { label: isEnglish ? 'Nationality' : 'Nacionalidad', value: values.nacionalidad },
      { label: isEnglish ? 'Country of residence' : 'País de residencia', value: values.paisResidencia },
      { label: isEnglish ? 'Phone' : 'Teléfono', value: values.telefono },
      { label: isEnglish ? 'Current address' : 'Dirección actual', value: values.direccion, span: true },
      { label: isEnglish ? 'Occupation' : 'Ocupación', value: values.ocupacion },
      { label: isEnglish ? 'ID type' : 'Tipo de documento', value: values.documentoTipo },
      { label: isEnglish ? 'ID number' : 'Número de documento', value: values.documentoNumero },
    ], cardX, y, cardWidth, { fontSize: 9.2 });
    y += 10;

    y = ensureSpace(pdf, y, 100, title, language);
    y = paragraph(pdf,
      isEnglish
        ? 'I declare that the information provided in this form is true, complete and accurate to the best of my knowledge, and I provide it for identity verification (Know Your Customer) purposes in connection with real estate services provided by Guerrero Properties.'
        : 'Declaro que la información proporcionada en este formulario es verdadera, completa y correcta a mi leal saber y entender, y la proporciono con fines de verificación de identidad (Conozca a su Cliente) en relación con los servicios inmobiliarios prestados por Guerrero Properties.',
      x, y, width, { fontSize: 9.6, minFontSize: 8.6, lineHeight: 12.8, maxLines: 6 });
    y += 8;
    y = paragraph(pdf,
      isEnglish
        ? 'This information will be used solely for compliance and identity verification purposes and will be handled confidentially by Guerrero Properties.'
        : 'Esta información será utilizada únicamente para fines de cumplimiento y verificación de identidad, y será tratada de forma confidencial por Guerrero Properties.',
      x, y, width, { fontSize: 9.2, minFontSize: 8.4, lineHeight: 12.4, maxLines: 4 });

    drawSignatureBlock(pdf, values, y, title, language);
  }

  function buildPdf(values) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    var englishPageCount = 0;
    if (values.documentLanguage === 'en') {
      renderKycDocument(pdf, values, 'en');
      englishPageCount = pdf.getNumberOfPages();
      pdf.addPage();
      renderKycDocument(pdf, values, 'es');
    } else {
      renderKycDocument(pdf, values, 'es');
    }
    addPageFooters(pdf, englishPageCount);
    return pdf;
  }

  // ---------- validación ----------
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

  async function collectValues() {
    hideErrors();
    var errors = [];
    var firstInvalid = null;
    function val(elRef) { return (elRef.value || '').trim(); }
    function bad(node, msg) { if (node) { node.classList.add('is-invalid'); if (!firstInvalid) firstInvalid = node; } errors.push(msg); }

    if (!val(fechaNacimiento)) bad(fechaNacimiento, 'Date of birth is required. / Ingresá la fecha de nacimiento.');
    if (!val(nacionalidad)) bad(nacionalidad, 'Nationality is required. / Ingresá la nacionalidad.');
    if (!val(paisResidencia)) bad(paisResidencia, 'Country of residence is required. / Ingresá el país de residencia.');
    if (!val(telefono)) bad(telefono, 'Phone is required. / Ingresá el teléfono.');
    if (!val(direccion)) bad(direccion, 'Current address is required. / Ingresá la dirección actual.');
    if (!val(ocupacion)) bad(ocupacion, 'Occupation is required. / Ingresá la ocupación.');
    if (!documentoTipo.value) bad(documentoTipo, 'Select the ID type. / Seleccioná el tipo de documento.');
    if (!val(documentoNumero)) bad(documentoNumero, 'ID number is required. / Ingresá el número de documento.');
    if (!declaracion.checked) bad(declaracion, 'You must confirm the declaration is true. / Tenés que confirmar que la declaración es verdadera.');
    if (!hasSignature || !signatureData) errors.push('Signature is required. / La firma es obligatoria.');

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    var docFrontalFile = el('doc_frontal').files[0] || null;
    var docReversoFile = el('doc_reverso').files[0] || null;

    var result = {
      documentLanguage: documentLanguage.value,
      numero: numero,
      tipoClienteEn: tipoClienteLabel.split(' / ')[0],
      tipoClienteEs: tipoClienteLabel.split(' / ')[1] || tipoClienteLabel,
      nombre: nombre,
      correo: correo,
      fechaNacimiento: val(fechaNacimiento),
      nacionalidad: val(nacionalidad),
      paisResidencia: val(paisResidencia),
      direccion: val(direccion),
      telefono: val(telefono),
      ocupacion: val(ocupacion),
      documentoTipo: documentoTipo.value,
      documentoNumero: val(documentoNumero),
      signatureData: signatureData,
      signDate: now.dateInput,
      signDateLong: now.dateLong,
      signDateLongEnglish: now.dateLongEnglish,
      signTime: now.time,
      docFrontalFile: docFrontalFile,
      docReversoFile: docReversoFile,
    };
    return result;
  }

  // ---------- enviar ----------
  async function enviar() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showErrors(['Could not load the PDF generator. Reload the page and try again. / No se pudo cargar el generador de PDF. Recargá la página e intentá de nuevo.']);
      return;
    }
    var values = await collectValues();
    if (!values) return;

    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    btnTxt.textContent = 'Submitting…';
    btnTxtEn.textContent = '/ Enviando…';
    try {
      var pdf = buildPdf(values);
      var pdfBase64 = pdf.output('datauristring').split(',')[1];

      var body = {
        kyc_caso_id: casoId,
        cliente_fecha_nacimiento: values.fechaNacimiento,
        cliente_nacionalidad: values.nacionalidad,
        cliente_pais_residencia: values.paisResidencia,
        cliente_direccion: values.direccion,
        cliente_documento_tipo: values.documentoTipo,
        cliente_documento_numero: values.documentoNumero,
        cliente_telefono: values.telefono,
        cliente_ocupacion: values.ocupacion,
        pdf_base64: pdfBase64,
      };

      if (values.docFrontalFile) {
        var frontalPrep = await prepararDocumentoIdentidad(values.docFrontalFile);
        body.doc_frontal_base64 = await fileToBase64(frontalPrep);
        body.doc_frontal_mime = frontalPrep.type || 'application/octet-stream';
      }
      if (values.docReversoFile) {
        var reversoPrep = await prepararDocumentoIdentidad(values.docReversoFile);
        body.doc_reverso_base64 = await fileToBase64(reversoPrep);
        body.doc_reverso_mime = reversoPrep.type || 'application/octet-stream';
      }

      var res = await fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error(errData.error || 'No se pudo enviar el formulario (' + res.status + ')');
      }

      document.getElementById('formWrap').classList.add('d-none');
      document.getElementById('doneWrap').classList.remove('d-none');
      document.getElementById('doneWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      console.error('KYC cliente:', ex);
      showErrors(['Could not submit the form: ' + (ex.message || ex) + ' / No se pudo enviar el formulario: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = 'Submit KYC form';
      btnTxtEn.textContent = '/ Enviar formulario KYC';
    }
  }

  generateBtn.addEventListener('click', enviar);
  initCanvas();
})();
