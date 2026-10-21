// ============================================================
//  Costo SV — Contrato de comercialización: página pública donde el
//  vendedor revisa el acuerdo y firma (link generado por el corredor desde
//  el panel al crear el contrato). A diferencia de kyc-cliente.js, acá los
//  datos NO vienen precargados por la URL (son demasiados: términos del
//  trato, inventario, firma del corredor) -- se piden con GET a
//  /api/lead?contrato_id=... (ver lib/obtenerContrato.js).
//  jsPDF nativo, mismo patrón de paginación que kyc-cliente.js/
//  carta-respuesta.js. Por defecto en inglés, con anexo en español.
// ============================================================
(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(window.location.search);
  var contratoId = q.get('contrato') || '';

  var form = el('firmaForm');
  var documentLanguage = el('document_language');
  var vendedorNombreInput = el('vendedor_nombre_input');
  var declaracion = el('declaracion_acepto');
  var errorBox = el('errorBox');
  var errorList = el('errorList');
  var canvas = el('signaturePad');
  var generateBtn = el('generateBtn');
  var btnTxt = generateBtn.querySelector('.co-generate-txt');
  var btnTxtEn = generateBtn.querySelector('.co-generate-txt-en');

  var contrato = null;

  if (!contratoId) {
    el('loadingWrap').classList.add('d-none');
    el('loadError').classList.remove('d-none');
    return;
  }

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
      dateIso: yyyy + '-' + mm + '-' + dd,
      dateInput: dd + '/' + mm + '/' + yyyy,
      dateLong: now.getDate() + ' de ' + meses[now.getMonth()] + ' de ' + now.getFullYear(),
      dateLongEnglish: mesesEn[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
      time: hh + ':' + min,
    };
  }
  function formatDateHuman(isoDate, language) {
    if (!isoDate) return '—';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    var y = parts[0], m = parts[1], d = parts[2];
    return language === 'en' ? (m + '/' + d + '/' + y) : (d + '/' + m + '/' + y);
  }
  function formatDateHumanBoth(isoDate) {
    if (!isoDate) return '—';
    return formatDateHuman(isoDate, 'en') + ' / ' + formatDateHuman(isoDate, 'es');
  }
  function fmtMoney(n) {
    var v = Number(n || 0);
    return 'US$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function bilingual(en, es) {
    return en + ' <span class="en">/ ' + es + '</span>';
  }
  function comisionTexto(c, lang) {
    var pct = c.comision_porcentaje + '%';
    if (lang === 'en') return pct + (c.comision_incluye_iva ? ' + VAT' : '') + ' of the final sale price';
    return pct + (c.comision_incluye_iva ? ' + IVA' : '') + ' del precio final de venta';
  }
  function tipoListadoTexto(c, lang) {
    var exclusivo = c.tipo_listado === 'exclusivo';
    if (lang === 'en') return exclusivo ? 'Exclusive' : 'Non-exclusive';
    return exclusivo ? 'Exclusivo' : 'No exclusivo';
  }
  function plazoTexto(c, lang) {
    if (lang === 'en') return c.plazo_meses + ' months: from ' + formatDateHuman(c.plazo_inicio, 'en') + ' to ' + formatDateHuman(c.plazo_fin, 'en');
    return c.plazo_meses + ' meses: desde ' + formatDateHuman(c.plazo_inicio, 'es') + ' hasta ' + formatDateHuman(c.plazo_fin, 'es');
  }
  function proteccionTexto(c, lang) {
    if (lang === 'en') return c.periodo_proteccion_dias + ' days after the agreement ends';
    return c.periodo_proteccion_dias + ' días después de finalizado el acuerdo';
  }

  // ---------- cargar el contrato ----------
  async function cargar() {
    try {
      var res = await fetch('/api/lead?contrato_id=' + encodeURIComponent(contratoId));
      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error(errData.error || 'No encontrado');
      }
      contrato = await res.json();
    } catch (ex) {
      el('loadingWrap').classList.add('d-none');
      el('loadError').classList.remove('d-none');
      return;
    }

    el('loadingWrap').classList.add('d-none');

    if (contrato.estado !== 'pendiente') {
      var yaFirmado = contrato.estado === 'firmado';
      el('alreadyTitle').innerHTML = yaFirmado
        ? bilingual('This agreement was already signed', 'Este acuerdo ya fue firmado')
        : bilingual('This agreement was cancelled', 'Este acuerdo fue cancelado');
      el('alreadyText').innerHTML = yaFirmado
        ? bilingual('Contact your agent if you need a copy of the signed document.', 'Contactá a tu agente si necesitás una copia del documento firmado.')
        : bilingual('Contact your agent if you have questions.', 'Contactá a tu agente si tenés dudas.');
      if (yaFirmado) { el('alreadyWrap').querySelector('i').className = 'fas fa-circle-check'; }
      el('alreadyWrap').classList.remove('d-none');
      return;
    }

    renderPreview(contrato);
    vendedorNombreInput.value = contrato.vendedor_nombre || '';
    el('formWrap').classList.remove('d-none');
    // El formulario (y el canvas de firma) estaban ocultos cuando se llamó
    // initCanvas() al cargar el script -- recién ahora tiene su tamaño real,
    // hay que volver a medirlo o el área donde se puede dibujar queda
    // achicada al tamaño de respaldo y la firma sale cortada.
    setTimeout(initCanvas, 0);
  }

  function reviewItem(parent, labelEn, labelEs, value, full) {
    var div = document.createElement('div');
    div.className = 'co-field co-review-item' + (full ? ' full' : '');
    div.innerHTML = '<span class="rlabel">' + labelEn + ' <span class="en">/ ' + labelEs + '</span></span><span class="rvalue">' + (value || '—') + '</span>';
    parent.appendChild(div);
  }

  function renderPreview(c) {
    var partiesGrid = el('partiesGrid');
    reviewItem(partiesGrid, 'Agreement date', 'Fecha del acuerdo', formatDateHumanBoth(c.fecha_acuerdo));
    reviewItem(partiesGrid, 'Agreement number', 'Número de acuerdo', c.numero);
    reviewItem(partiesGrid, 'Seller / owner', 'Vendedor / propietario', c.vendedor_nombre, true);
    reviewItem(partiesGrid, 'Broker', 'Corredor', c.corredor_nombre, true);

    var propertyGrid = el('propertyGrid');
    reviewItem(propertyGrid, 'Description', 'Descripción', c.propiedad_descripcion, true);
    reviewItem(propertyGrid, 'Registry No.', 'No. de registro', c.propiedad_registro);
    reviewItem(propertyGrid, 'Address', 'Dirección', c.propiedad_direccion);
    reviewItem(propertyGrid, 'Liens / restrictions', 'Gravámenes / restricciones', c.propiedad_gravamenes, true);
    reviewItem(propertyGrid, 'Registry certificate', 'Certificado de registro', c.propiedad_certificado, true);

    var termsGrid = el('termsGrid');
    reviewItem(termsGrid, 'Listing price', 'Precio de lista', fmtMoney(c.precio_lista));
    reviewItem(termsGrid, 'Listing type', 'Tipo de listado', tipoListadoTexto(c, 'en') + ' / ' + tipoListadoTexto(c, 'es'));
    reviewItem(termsGrid, 'Sales commission', 'Comisión de venta', comisionTexto(c, 'en') + ' / ' + comisionTexto(c, 'es'), true);
    reviewItem(termsGrid, 'Agreement term', 'Plazo del acuerdo', plazoTexto(c, 'en') + ' / ' + plazoTexto(c, 'es'), true);
    reviewItem(termsGrid, 'Protection period', 'Período de protección', proteccionTexto(c, 'en') + ' / ' + proteccionTexto(c, 'es'), true);

    var clausesBox = el('clausesBox');
    var clauses = clausesData(c);
    clausesBox.innerHTML = clauses.map(function (cl, i) {
      return '<p class="co-clause"><b>4.' + (i + 1) + ' ' + cl.titleEn + '.</b> ' + cl.en +
        '<span class="en"><b>4.' + (i + 1) + ' ' + cl.titleEs + '.</b> ' + cl.es + '</span></p>';
    }).join('');

    if (c.inventario && c.inventario.length) {
      var tbody = el('inventoryBody');
      tbody.innerHTML = c.inventario.map(function (it) {
        return '<tr><td>' + (it.item || '') + '</td><td>' + (it.descripcion || '') + '</td><td>' + (it.cantidad || '') + '</td></tr>';
      }).join('');
      el('inventoryCard').classList.remove('d-none');
    }

    if (c.notas) {
      el('notesText').textContent = c.notas;
      el('notesCard').classList.remove('d-none');
    }

    var brokerSigBox = el('brokerSigBox');
    if (c.corredor_firma_base64) {
      brokerSigBox.innerHTML = '<img src="data:image/png;base64,' + c.corredor_firma_base64 + '" alt="Broker signature">' +
        '<div class="meta">' + c.corredor_nombre + '<br>' + bilingual('Signed on', 'Firmado el') + ' ' + formatDateHumanBoth(c.fecha_acuerdo) + '</div>';
    } else {
      brokerSigBox.innerHTML = '<div class="meta">' + c.corredor_nombre + '</div>';
    }
  }

  function clausesData(c) {
    return [
      {
        titleEn: 'Appointment', titleEs: 'Designación',
        en: 'The Seller appoints the Broker, under the listing type stated in Key terms, to market and sell the Property at the listing price. Any change to the price must be agreed in writing by the Seller.',
        es: 'El Vendedor designa al Corredor, bajo el tipo de listado indicado en los Términos clave, para comercializar y vender la Propiedad al precio de lista. Cualquier cambio de precio debe ser acordado por escrito por el Vendedor.',
      },
      {
        titleEn: 'Commission', titleEs: 'Comisión',
        en: 'The Seller will pay the Broker the sales commission stated in Key terms, calculated on the final sale price. The Seller will pay the Broker the ' + c.comision_porcentaje + '% commission directly, and the Broker will give the Seller a receipt for the amount paid. The commission is due and payable at closing, when the deed of sale is signed.',
        es: 'El Vendedor pagará al Corredor la comisión de venta indicada en los Términos clave, calculada sobre el precio final de venta. El Vendedor pagará al Corredor la comisión del ' + c.comision_porcentaje + '% directamente, y el Corredor le entregará un recibo por el monto pagado. La comisión se debe pagar al cierre, cuando se firme la escritura de compraventa.',
      },
      {
        titleEn: 'Term', titleEs: 'Plazo',
        en: 'This agreement is valid for the term stated in Key terms and may be extended in writing by both parties.',
        es: 'Este acuerdo tiene vigencia por el plazo indicado en los Términos clave y puede extenderse por escrito entre ambas partes.',
      },
      {
        titleEn: 'Protection', titleEs: 'Protección',
        en: 'If, during the protection period, the Seller sells the Property to any buyer who was introduced by the Broker or who visited the Property through the Broker during the term, the commission will still be due.',
        es: 'Si, durante el período de protección, el Vendedor vende la Propiedad a un comprador que fue presentado por el Corredor o que visitó la Propiedad a través del Corredor durante el plazo, la comisión igualmente será exigible.',
      },
      {
        titleEn: 'Marketing', titleEs: 'Comercialización',
        en: "The Seller authorizes the Broker to advertise the Property, including photos, video and descriptions, on the Broker's website, social media and other channels, and to show the Property to prospective buyers.",
        es: 'El Vendedor autoriza al Corredor a publicitar la Propiedad, incluyendo fotos, video y descripciones, en el sitio web del Corredor, redes sociales y otros canales, y a mostrar la Propiedad a posibles compradores.',
      },
      {
        titleEn: 'Included items', titleEs: 'Bienes incluidos',
        en: 'The items listed in the Inventory of this agreement are included in the sale price at no additional cost to the buyer.',
        es: 'Los artículos listados en el Inventario de este acuerdo están incluidos en el precio de venta, sin costo adicional para el comprador.',
      },
      {
        titleEn: 'Seller statements', titleEs: 'Declaraciones del vendedor',
        en: 'The Seller confirms being the sole owner of the Property with full right to sell it, and that the registry information above is accurate.',
        es: 'El Vendedor confirma ser el único propietario de la Propiedad, con pleno derecho a venderla, y que la información registral indicada es correcta.',
      },
    ];
  }

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

  // ---------- helpers PDF (mismo patrón de paginación que kyc-cliente.js) ----------
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
    pdf.text(continuation ? (isEnglish ? 'CONTINUED' : 'CONTINUACIÓN') : (isEnglish ? 'SALES AUTHORIZATION AGREEMENT' : 'ACUERDO DE AUTORIZACIÓN DE VENTA'), pageW - 64, continuation ? 29 : 36, { align: 'right' });
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
  function inventoryTable(pdf, items, x, y, width) {
    if (!items || !items.length) return y;
    var colW = [width * 0.26, width * 0.58, width * 0.16];
    var fontSize = 8.6;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(x, y, width, 20, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    var hx = x;
    ['ITEM', 'DESCRIPTION / LOCATION', 'QTY'].forEach(function (h, i) {
      pdf.text(h, hx + 10, y + 13);
      hx += colW[i];
    });
    var rowY = y + 20;
    items.forEach(function (it) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(fontSize);
      var l1 = pdf.splitTextToSize(String(it.item || ''), colW[0] - 18);
      var l2 = pdf.splitTextToSize(String(it.descripcion || ''), colW[1] - 18);
      var lines = Math.max(l1.length, l2.length, 1);
      var rh = Math.max(20, lines * 10.5 + 9);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(x, rowY, x + width, rowY);
      pdf.setTextColor(17, 27, 45);
      pdf.setFont('helvetica', 'bold'); pdf.text(l1, x + 10, rowY + 13, { baseline: 'top' });
      pdf.setFont('helvetica', 'normal'); pdf.text(l2, x + colW[0] + 10, rowY + 13, { baseline: 'top' });
      pdf.text(String(it.cantidad != null ? it.cantidad : ''), x + colW[0] + colW[1] + 10, rowY + 13, { baseline: 'top' });
      rowY += rh;
    });
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(x, y, width, rowY - y, 4, 4);
    return rowY;
  }
  function estimateInventoryHeight(items) { return 20 + (items ? items.length : 0) * 24 + 10; }

  function drawDualSignatureBlock(pdf, values, contentY, title, language) {
    var isEnglish = language === 'en';
    var pageW = pdf.internal.pageSize.getWidth();
    var x = 64;
    var gap = 40;
    var colW = (pageW - 128 - gap) / 2;
    var y = ensureSpace(pdf, contentY, 150, title, language);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.6); pdf.setTextColor(11, 45, 92);
    pdf.text(isEnglish ? 'SELLER' : 'VENDEDOR', x, y);
    pdf.text(isEnglish ? 'BROKER' : 'CORREDOR', x + colW + gap, y);
    y += 20;

    function block(colX, sigData, nombre, fecha) {
      if (sigData) {
        try {
          var props = pdf.getImageProperties(sigData);
          var ratio = props.width / props.height;
          var sw = Math.min(140, 34 * ratio);
          var sh = sw / ratio;
          if (sh > 34) { sh = 34; sw = sh * ratio; }
          pdf.addImage(sigData, 'PNG', colX, y, sw, sh, undefined, 'FAST');
        } catch (e) {}
      }
      pdf.setDrawColor(139, 152, 171);
      pdf.line(colX, y + 40, colX + colW, y + 40);
      pdf.setTextColor(105, 119, 140); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.4);
      pdf.text(isEnglish ? 'Signature' : 'Firma', colX, y + 50);
      pdf.setTextColor(22, 31, 49); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.0);
      pdf.text((isEnglish ? 'Name: ' : 'Nombre: ') + (nombre || '—'), colX, y + 66);
      pdf.text((isEnglish ? 'Date: ' : 'Fecha: ') + (fecha || '—'), colX, y + 80);
    }
    block(x, values.vendedorFirma, values.vendedorNombre, formatDateHuman(values.vendedorFecha, language));
    block(x + colW + gap, values.corredorFirma, values.corredorNombre, formatDateHuman(values.corredorFecha, language));
    return y + 96;
  }

  function renderContratoDocument(pdf, values, language) {
    var isEnglish = language === 'en';
    var c = values.contrato;
    var pageW = pdf.internal.pageSize.getWidth();
    var x = 64;
    var width = pageW - 128;
    var cardX = x + 12;
    var cardWidth = width - 24;
    var title = isEnglish ? 'SALES AUTHORIZATION AGREEMENT' : 'ACUERDO DE AUTORIZACIÓN DE VENTA';

    var y = drawPageHeader(pdf, title, false, language);

    if (values.documentLanguage === 'en') {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.4);
      pdf.text(isEnglish ? 'ATTACHMENT: The complete Spanish version follows this page.' : 'ANEXO: La versión en inglés forma parte de este mismo documento.', x, y, { baseline: 'top' });
      y += 14;
    }

    y = sectionLabel(pdf, isEnglish ? 'Agreement' : 'Acuerdo', x, y);
    y = infoGrid(pdf, [
      { label: isEnglish ? 'Agreement date' : 'Fecha del acuerdo', value: formatDateHuman(c.fecha_acuerdo, language) },
      { label: isEnglish ? 'Agreement number' : 'Número de acuerdo', value: c.numero },
      { label: isEnglish ? 'Seller / owner' : 'Vendedor / propietario', value: c.vendedor_nombre, bold: true, span: true },
      { label: isEnglish ? 'Broker' : 'Corredor', value: c.corredor_nombre, bold: true, span: true },
    ], cardX, y, cardWidth, { fontSize: 9.4 });
    y += 8;

    y = sectionLabel(pdf, isEnglish ? 'Property' : 'Propiedad', x, y);
    y = infoGrid(pdf, [
      { label: isEnglish ? 'Description' : 'Descripción', value: c.propiedad_descripcion, span: true },
      { label: isEnglish ? 'Registry No.' : 'No. de registro', value: c.propiedad_registro },
      { label: isEnglish ? 'Address' : 'Dirección', value: c.propiedad_direccion },
      { label: isEnglish ? 'Liens / restrictions' : 'Gravámenes / restricciones', value: c.propiedad_gravamenes, span: true },
      { label: isEnglish ? 'Registry certificate' : 'Certificado de registro', value: c.propiedad_certificado, span: true },
    ], cardX, y, cardWidth, { fontSize: 9.2 });
    y += 8;

    y = sectionLabel(pdf, isEnglish ? 'Key terms' : 'Términos clave', x, y);
    y = infoGrid(pdf, [
      { label: isEnglish ? 'Listing price' : 'Precio de lista', value: fmtMoney(c.precio_lista), bold: true },
      { label: isEnglish ? 'Listing type' : 'Tipo de listado', value: tipoListadoTexto(c, language) },
      { label: isEnglish ? 'Sales commission' : 'Comisión de venta', value: comisionTexto(c, language), span: true },
      { label: isEnglish ? 'Agreement term' : 'Plazo del acuerdo', value: plazoTexto(c, language), span: true },
      { label: isEnglish ? 'Protection period' : 'Período de protección', value: proteccionTexto(c, language), span: true },
    ], cardX, y, cardWidth, { fontSize: 9.2 });
    y += 10;

    y = ensureSpace(pdf, y, 90, title, language);
    y = sectionLabel(pdf, isEnglish ? 'Terms and conditions' : 'Términos y condiciones', x, y);
    clausesData(c).forEach(function (cl, i) {
      var num = '4.' + (i + 1) + ' ';
      var text = (isEnglish ? num + cl.titleEn + '. ' + cl.en : num + cl.titleEs + '. ' + cl.es);
      y = ensureSpace(pdf, y, 80, title, language);
      y = paragraph(pdf, text, x, y, width, { fontSize: 9.0, minFontSize: 8.2, lineHeight: 12.2, maxLines: 6 });
      y += 7;
    });
    y += 4;

    if (c.inventario && c.inventario.length) {
      y = ensureSpace(pdf, y, estimateInventoryHeight(c.inventario) + 20, title, language);
      y = sectionLabel(pdf, isEnglish ? 'Included items' : 'Bienes incluidos', x, y);
      y = inventoryTable(pdf, c.inventario, x, y, width);
      y += 10;
    }

    if (c.notas) {
      y = ensureSpace(pdf, y, 60, title, language);
      y = sectionLabel(pdf, isEnglish ? 'Notes' : 'Notas', x, y);
      y = paragraph(pdf, c.notas, x, y, width, { fontSize: 9.0, minFontSize: 8.2, lineHeight: 12.2, maxLines: 6 });
      y += 8;
    }

    drawDualSignatureBlock(pdf, values, y, title, language);
  }

  function buildPdf(values) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    var englishPageCount = 0;
    if (values.documentLanguage === 'en') {
      renderContratoDocument(pdf, values, 'en');
      englishPageCount = pdf.getNumberOfPages();
      pdf.addPage();
      renderContratoDocument(pdf, values, 'es');
    } else {
      renderContratoDocument(pdf, values, 'es');
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

  function collectValues() {
    hideErrors();
    var errors = [];
    var firstInvalid = null;
    function val(elRef) { return (elRef.value || '').trim(); }
    function bad(node, msg) { if (node) { node.classList.add('is-invalid'); if (!firstInvalid) firstInvalid = node; } errors.push(msg); }

    if (!val(vendedorNombreInput)) bad(vendedorNombreInput, 'Your full name is required. / Ingresá tu nombre completo.');
    if (!declaracion.checked) bad(declaracion, 'You must accept the terms. / Tenés que aceptar los términos.');
    if (!hasSignature || !signatureData) errors.push('Signature is required. / La firma es obligatoria.');

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    return {
      contrato: contrato,
      documentLanguage: documentLanguage.value,
      vendedorNombre: val(vendedorNombreInput),
      vendedorFirma: signatureData,
      vendedorFecha: now.dateIso,
      corredorFirma: contrato.corredor_firma_base64 ? ('data:image/png;base64,' + contrato.corredor_firma_base64) : '',
      corredorNombre: contrato.corredor_nombre,
      corredorFecha: contrato.fecha_acuerdo,
    };
  }

  // ---------- enviar ----------
  async function enviar() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showErrors(['Could not load the PDF generator. Reload the page and try again. / No se pudo cargar el generador de PDF. Recargá la página e intentá de nuevo.']);
      return;
    }
    var values = collectValues();
    if (!values) return;

    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    btnTxt.textContent = 'Submitting…';
    btnTxtEn.textContent = '/ Enviando…';
    try {
      var pdf = buildPdf(values);
      var pdfBase64 = pdf.output('datauristring').split(',')[1];

      var res = await fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrato_id: contratoId,
          vendedor_firma_nombre: values.vendedorNombre,
          vendedor_firma_fecha: values.vendedorFecha,
          pdf_base64: pdfBase64,
        }),
      });
      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error(errData.error || 'No se pudo enviar la firma (' + res.status + ')');
      }

      document.getElementById('formWrap').classList.add('d-none');
      document.getElementById('doneWrap').classList.remove('d-none');
      document.getElementById('doneWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      console.error('Contrato firma:', ex);
      showErrors(['Could not submit the signature: ' + (ex.message || ex) + ' / No se pudo enviar la firma: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = 'Sign agreement';
      btnTxtEn.textContent = '/ Firmar acuerdo';
    }
  }

  generateBtn.addEventListener('click', enviar);
  initCanvas();
  cargar();
})();
