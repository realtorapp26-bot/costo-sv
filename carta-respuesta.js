// ============================================================
//  Costo SV — Generador de Carta de Respuesta (aceptación / contraoferta)
//  Réplica propia de respuesta.remax-elite.com.sv, marca Guerrero Properties.
//  Página: /carta-respuesta.html · acceso solo por link (noindex).
//  El propietario responde a una oferta: la acepta condicionalmente o
//  contraoferta, firma en pantalla y descarga el PDF (formato carta, multipágina).
// ============================================================
(function () {
  'use strict';

  var form = document.getElementById('responseForm');
  var el = function (id) { return document.getElementById(id); };
  var documentLanguage = el('document_language');
  var letterMode = el('letter_mode');
  var transactionType = el('transaction_type');
  var ownerExtra = el('ownerExtra');
  var acceptanceBlock = el('acceptanceBlock');
  var counterofferBlock = el('counterofferBlock');
  var propertyDistrictCol = el('propertyDistrictCol');
  var registryCol = el('registryCol');
  var saleAcceptance = el('saleAcceptance');
  var rentalAcceptance = el('rentalAcceptance');
  var ownerDocumentType = el('owner_document_type');
  var ownerDocumentNumber = el('owner_document_number');
  var interestedDocumentType = el('interested_document_type');
  var interestedDocumentNumber = el('interested_document_number');
  var acceptedAmountNumber = el('accepted_amount_number');
  var acceptedAmountWords = el('accepted_amount_words');
  var acceptedAmountWordsEnglish = el('accepted_amount_words_english');
  var acceptedAmountWordsEnglishWrap = el('acceptedAmountWordsEnglishWrap');
  var originalAmountNumber = el('original_amount_number');
  var originalAmountWords = el('original_amount_words');
  var originalAmountWordsEnglish = el('original_amount_words_english');
  var originalAmountWordsEnglishWrap = el('originalAmountWordsEnglishWrap');
  var paymentMethod = el('payment_method');
  var paymentDetails = el('payment_details');
  var rentalTerm = el('rental_term');
  var counterofferText = el('counteroffer_text');
  var englishConsent = el('english_consent');
  var englishConsentWrap = el('englishConsentWrap');
  var additionalNotes = el('additional_notes');
  var borradorSelect = el('borrador_select');
  var offerDateView = el('offer_date_view');
  var errorBox = el('errorBox');
  var errorList = el('errorList');
  var canvas = el('signaturePad');
  var generateBtn = el('generateBtn');
  var btnTxt = generateBtn.querySelector('.co-generate-txt');
  var btnTxtEn = generateBtn.querySelector('.co-generate-txt-en');

  // ---------- fecha ----------
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
  function refreshDate() { offerDateView.value = nowParts().dateInput; }

  // ---------- monto a letras (español) ----------
  function numberToSpanish(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return '';
    if (n === 0) return 'CERO';
    var unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    var especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    var decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    var centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function lt100(num) {
      if (num < 10) return unidades[num];
      if (num < 20) return especiales[num - 10];
      if (num < 30) {
        if (num === 20) return 'VEINTE';
        var map = { 21: 'VEINTIÚN', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO', 25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE' };
        return map[num] || ('VEINTI' + unidades[num - 20]);
      }
      var d = Math.floor(num / 10), u = num % 10;
      return decenas[d] + (u ? ' Y ' + unidades[u] : '');
    }
    function lt1000(num) {
      if (num === 100) return 'CIEN';
      if (num < 100) return lt100(num);
      var c = Math.floor(num / 100), rest = num % 100;
      return centenas[c] + (rest ? ' ' + lt100(rest) : '');
    }
    function conv(num) {
      if (num < 1000) return lt1000(num);
      if (num < 1000000) {
        var miles = Math.floor(num / 1000), rest = num % 1000;
        var t = miles === 1 ? 'MIL' : lt1000(miles) + ' MIL';
        return t + (rest ? ' ' + lt1000(rest) : '');
      }
      if (num < 1000000000000) {
        var mill = Math.floor(num / 1000000), rest2 = num % 1000000;
        var t2 = mill === 1 ? 'UN MILLÓN' : conv(mill) + ' MILLONES';
        return t2 + (rest2 ? ' ' + conv(rest2) : '');
      }
      return '';
    }
    return conv(n).replace(/\s+/g, ' ').trim();
  }
  function amountToWords(value) {
    var amount = Number(value || 0);
    if (!amount || amount <= 0) return '';
    var ip = Math.floor(amount);
    var cents = Math.round((amount - ip) * 100);
    var centsText = String(cents).padStart(2, '0') + '/100';
    var currency = ip === 1 ? 'DÓLAR DE LOS ESTADOS UNIDOS DE AMÉRICA' : 'DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA';
    return (numberToSpanish(ip) + ' CON ' + centsText + ' ' + currency).trim();
  }
  // ---------- monto a letras (inglés) ----------
  function numberToEnglish(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0) return '';
    if (n === 0) return 'ZERO';
    var ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    var tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    function below1000(v) {
      var t = '';
      if (v >= 100) { t = ones[Math.floor(v / 100)] + ' HUNDRED'; v %= 100; if (v) t += ' '; }
      if (v >= 20) { t += tens[Math.floor(v / 10)]; if (v % 10) t += '-' + ones[v % 10]; }
      else if (v > 0) { t += ones[v]; }
      return t;
    }
    var scales = [{ value: 1000000000, name: 'BILLION' }, { value: 1000000, name: 'MILLION' }, { value: 1000, name: 'THOUSAND' }];
    var remaining = n, parts = [];
    scales.forEach(function (s) {
      if (remaining >= s.value) { parts.push(below1000(Math.floor(remaining / s.value)) + ' ' + s.name); remaining %= s.value; }
    });
    if (remaining) parts.push(below1000(remaining));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  function amountToWordsEnglish(value) {
    var amount = Number(value || 0);
    if (!amount || amount <= 0) return '';
    var ip = Math.floor(amount);
    var cents = Math.round((amount - ip) * 100);
    var centsText = String(cents).padStart(2, '0') + '/100';
    var currency = ip === 1 ? 'UNITED STATES DOLLAR' : 'UNITED STATES DOLLARS';
    return (numberToEnglish(ip) + ' AND ' + centsText + ' ' + currency).trim();
  }
  function translatedPaymentMethod(v) {
    return ({ 'Contado': 'Cash', 'Crédito': 'Financing', 'Mixto': 'Mixed' })[v] || v;
  }
  function formatMoney(value) {
    var n = Number(value || 0);
    if (!n) return '0.00';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  function syncAmountFields() {
    acceptedAmountWords.value = amountToWords(acceptedAmountNumber.value);
    acceptedAmountWordsEnglish.value = amountToWordsEnglish(acceptedAmountNumber.value);
    originalAmountWords.value = amountToWords(originalAmountNumber.value);
    originalAmountWordsEnglish.value = amountToWordsEnglish(originalAmountNumber.value);
  }

  // ---------- documento ----------
  function normalizeDoc(typeEl, inputEl) {
    var type = (typeEl.value || '').toUpperCase();
    var value = inputEl.value || '';
    if (type === 'DUI') {
      value = value.replace(/\D+/g, '').slice(0, 9);
    } else if (type === 'NIT') {
      var d = value.replace(/\D+/g, '').slice(0, 14);
      value = d.length === 14 ? (d.slice(0, 4) + ' ' + d.slice(4, 10) + ' ' + d.slice(10, 13) + ' ' + d.slice(13)) : d;
    }
    inputEl.value = value;
  }
  function validDoc(typeEl, inputEl) {
    var type = typeEl.value;
    var raw = (inputEl.value || '').trim();
    if (!type) return false;
    if (type === 'DUI') return /^\d{9}$/.test(raw);
    if (type === 'NIT') return /^\d{14}$/.test(raw) || /^\d{4}\s\d{6}\s\d{3}\s\d$/.test(raw);
    if (type === 'PASAPORTE') return /^[A-Za-z0-9\-\s]{6,20}$/.test(raw);
    return false;
  }

  // ---------- toggles ----------
  function setVis(node, show) { if (node) node.classList.toggle('d-none', !show); }
  function toggleFormMode() {
    var isAcc = letterMode.value === 'ACEPTACION';
    var isCounter = letterMode.value === 'CONTRAOFERTA';
    var isSale = transactionType.value === 'VENTA';
    var isRental = transactionType.value === 'ALQUILER';
    setVis(acceptanceBlock, isAcc);
    setVis(counterofferBlock, isCounter);
    setVis(ownerExtra, isCounter);
    setVis(propertyDistrictCol, isCounter);
    setVis(registryCol, isAcc && isSale);
    setVis(saleAcceptance, isAcc && isSale);
    setVis(rentalAcceptance, isAcc && isRental);
    toggleDocumentLanguage();
  }
  function toggleDocumentLanguage() {
    var isEn = documentLanguage.value === 'en';
    var isAcc = letterMode.value === 'ACEPTACION';
    var isCounter = letterMode.value === 'CONTRAOFERTA';
    setVis(acceptedAmountWordsEnglishWrap, isEn && isAcc);
    setVis(originalAmountWordsEnglishWrap, isEn && isCounter);
    setVis(englishConsentWrap, isEn);
    if (!isEn) { englishConsent.checked = false; englishConsent.classList.remove('is-invalid'); }
  }

  // ---------- firma (canvas) ----------
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var hasSignature = false;

  function initCanvas() {
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(Math.floor(rect.width), 300);
    var height = Math.max(Math.floor(rect.height), 180);
    var previous = hasSignature ? canvas.toDataURL('image/png') : '';
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
  function endDraw(e) { if (!drawing) return; e.preventDefault(); drawing = false; ctx.closePath(); }
  ['mousedown', 'touchstart'].forEach(function (ev) { canvas.addEventListener(ev, startDraw, { passive: false }); });
  ['mousemove', 'touchmove'].forEach(function (ev) { canvas.addEventListener(ev, moveDraw, { passive: false }); });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (ev) { canvas.addEventListener(ev, endDraw, { passive: false }); });
  window.addEventListener('resize', initCanvas);
  el('clearSignature').addEventListener('click', function () { hasSignature = false; initCanvas(); });

  // Recorta la firma a su bounding box y quita el fondo casi-blanco.
  function getCleanSignatureData() {
    if (!hasSignature) return '';
    var w = document.createElement('canvas');
    w.width = canvas.width; w.height = canvas.height;
    var wc = w.getContext('2d');
    wc.drawImage(canvas, 0, 0);
    var imgData = wc.getImageData(0, 0, w.width, w.height);
    var data = imgData.data;
    var minX = w.width, minY = w.height, maxX = -1, maxY = -1;
    for (var y = 0; y < w.height; y++) {
      for (var x = 0; x < w.width; x++) {
        var i = (y * w.width + x) * 4;
        if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) data[i + 3] = 0;
        if (data[i + 3] > 20) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
      }
    }
    wc.putImageData(imgData, 0, 0);
    if (maxX < minX || maxY < minY) return '';
    var margin = Math.max(8, Math.round(window.devicePixelRatio || 1) * 4);
    var sx = Math.max(0, minX - margin), sy = Math.max(0, minY - margin);
    var sw = Math.min(w.width - sx, (maxX - minX + 1) + margin * 2);
    var sh = Math.min(w.height - sy, (maxY - minY + 1) + margin * 2);
    var c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    c.getContext('2d').drawImage(w, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL('image/png');
  }

  // ---------- helpers PDF ----------
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
  function termsCard(pdf, rows, x, y, width) {
    var padding = 12, labelWidth = 142, fontSize = 9.2, lineHeight = 11.5;
    var valueWidth = width - (padding * 2) - labelWidth;
    var prepared = rows.map(function (row) {
      pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      return { label: row.label, bold: !!row.bold, lines: pdf.splitTextToSize(String(row.value || '—'), valueWidth) };
    });
    var heights = prepared.map(function (row) { return Math.max(28, (Math.max(1, row.lines.length) * lineHeight) + 13); });
    var height = heights.reduce(function (s, v) { return s + v; }, 0);
    pdf.setFillColor(247, 249, 253);
    pdf.setDrawColor(197, 209, 225);
    pdf.roundedRect(x, y, width, height, 8, 8, 'FD');
    pdf.setFillColor(11, 45, 92);
    pdf.roundedRect(x, y, 4, height, 2, 2, 'F');
    var rowY = y;
    prepared.forEach(function (row, i) {
      if (i > 0) { pdf.setDrawColor(218, 226, 237); pdf.line(x + 12, rowY, x + width - 12, rowY); }
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.0);
      pdf.text(String(row.label).toUpperCase(), x + padding, rowY + 9, { baseline: 'top' });
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      pdf.text(row.lines, x + padding + labelWidth, rowY + 8, { baseline: 'top' });
      rowY += heights[i];
    });
    return y + height;
  }
  function legalCallout(pdf, lead, body, x, y, width, language) {
    var innerX = x + 13, innerWidth = width - 26, titleHeight = 14;
    var leadFit = fitText(pdf, lead, innerWidth, { fontSize: 8.7, minFontSize: 8.1, lineHeight: 11.2, fontStyle: 'bold' });
    var bodyFit = fitText(pdf, body, innerWidth, { fontSize: 8.45, minFontSize: 8.0, lineHeight: 10.9 });
    var height = 12 + titleHeight + (leadFit.lines.length * leadFit.lineHeight) + 4 + (bodyFit.lines.length * bodyFit.lineHeight) + 11;
    pdf.setFillColor(248, 249, 252);
    pdf.setDrawColor(215, 222, 232);
    pdf.roundedRect(x, y, width, height, 7, 7, 'FD');
    pdf.setFillColor(229, 57, 53);
    pdf.roundedRect(x, y, 3, height, 1.5, 1.5, 'F');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.text(language === 'en' ? 'SCOPE AND CONDITIONS' : 'ALCANCE Y CONDICIONES', innerX, y + 10, { baseline: 'top' });
    var textY = y + 10 + titleHeight;
    textY = paragraph(pdf, lead, innerX, textY, innerWidth, { fontSize: leadFit.fontSize, minFontSize: leadFit.fontSize, lineHeight: leadFit.lineHeight, fontStyle: 'bold' });
    textY += 4;
    paragraph(pdf, body, innerX, textY, innerWidth, { fontSize: bodyFit.fontSize, minFontSize: bodyFit.fontSize, lineHeight: bodyFit.lineHeight });
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
    pdf.text(continuation ? (isEnglish ? 'CONTINUED' : 'CONTINUACIÓN') : (isEnglish ? 'REAL ESTATE MANAGEMENT DOCUMENT' : 'DOCUMENTO DE GESTIÓN INMOBILIARIA'), pageW - 64, continuation ? 29 : 36, { align: 'right' });
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
    var dateY = Math.max(contentY + 14, 574);
    var signatureLineY = Math.max(dateY + 52, 642);
    if (signatureLineY + 42 > pageH - 24) {
      pdf.addPage();
      drawPageHeader(pdf, title, true, language);
      dateY = 146;
      signatureLineY = 218;
    }
    pdf.setTextColor(31, 43, 64);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.8);
    pdf.text(isEnglish ? (values.issueCity + ', on ' + values.signDateLongEnglish + '.') : (values.issueCity + ', a ' + values.signDateLong + '.'), x, dateY);
    pdf.setDrawColor(139, 152, 171);
    pdf.line(x, signatureLineY, x + 214, signatureLineY);
    if (values.signatureData) {
      try {
        var props = pdf.getImageProperties(values.signatureData);
        var ratio = props.width / props.height;
        var sw = Math.min(148, 36 * ratio);
        var sh = sw / ratio;
        if (sh > 36) { sh = 36; sw = sh * ratio; }
        pdf.addImage(values.signatureData, 'PNG', x + 14, signatureLineY - sh - 6, sw, sh, 'ownerSignature', 'FAST');
      } catch (e) {}
    }
    var rightX = x + 300;
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.4);
    pdf.text(isEnglish ? 'SIGNATURE' : 'FIRMA', x, signatureLineY + 16);
    pdf.text(isEnglish ? 'NAME' : 'NOMBRE', x, signatureLineY + 35);
    pdf.text(isEnglish ? 'DATE' : 'FECHA', rightX, signatureLineY + 16);
    pdf.text(isEnglish ? 'TIME' : 'HORA', rightX, signatureLineY + 35);
    pdf.setTextColor(22, 31, 49);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text(values.ownerName, x + 58, signatureLineY + 35);
    pdf.text(values.signDate, rightX + 52, signatureLineY + 16);
    pdf.text(values.signTime, rightX + 52, signatureLineY + 35);
    return signatureLineY + 49;
  }

  function renderResponseDocument(pdf, values, language) {
    var isEnglish = language === 'en';
    var pageW = pdf.internal.pageSize.getWidth();
    var x = 64;
    var width = pageW - 128;
    var cardX = x + 12;
    var cardWidth = width - 24;
    var isSale = values.transactionType === 'VENTA';
    var title = values.letterMode === 'ACEPTACION'
      ? (isEnglish
        ? (isSale ? 'CONDITIONAL ACCEPTANCE OF PURCHASE OFFER' : 'CONDITIONAL ACCEPTANCE OF RENTAL OFFER')
        : (isSale ? 'ACEPTACIÓN CONDICIONADA DE OFERTA DE COMPRA' : 'ACEPTACIÓN CONDICIONADA DE OFERTA DE ALQUILER'))
      : (isEnglish
        ? ('COUNTEROFFER LETTER FOR ' + (isSale ? 'PURCHASE' : 'RENTAL'))
        : ('CARTA DE CONTRAOFERTA DE ' + (isSale ? 'COMPRA' : 'ALQUILER')));

    var y = drawPageHeader(pdf, title, false, language);
    pdf.setTextColor(22, 31, 49);

    if (values.documentLanguage === 'en') {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.4);
      pdf.text(isEnglish ? 'ATTACHMENT: The complete Spanish version follows this page.' : 'ANEXO: La versión en inglés forma parte de este mismo documento.', x, y, { baseline: 'top' });
      y += 14;
    }

    if (values.letterMode === 'ACEPTACION') {
      var ownerRole = isEnglish ? (isSale ? 'owner or seller' : 'owner') : (isSale ? 'propietario/a o vendedor/a' : 'propietario/a');
      y = sectionLabel(pdf, isEnglish ? "Owner's Declaration" : 'Declaración del propietario', x, y);
      y = paragraph(pdf,
        isEnglish
          ? 'I, ' + values.ownerName + ', in my capacity as ' + ownerRole + ', state that I have received and evaluated the offer submitted regarding the property identified in this letter.'
          : 'Yo, ' + values.ownerName + ', en mi calidad de ' + ownerRole + ', manifiesto haber recibido y evaluado la oferta presentada respecto del inmueble indicado en esta carta.',
        x, y, width, { fontSize: 10.2, minFontSize: 9.2, lineHeight: 13.6, maxLines: 4 });
      y += 5;
      y = infoGrid(pdf, [
        { label: isEnglish ? 'Interested Party' : 'Interesado/a', value: values.interestedName, bold: true },
        { label: isEnglish ? 'ID' : 'Identificación', value: values.interestedDocumentType + ' ' + values.interestedDocumentNumber },
      ], cardX, y, cardWidth, { fontSize: 9.4 });
      y += 7;

      y = sectionLabel(pdf, isEnglish ? 'Property' : 'Inmueble', x, y);
      var propItems = [
        { label: isEnglish ? 'Municipality' : 'Municipio', value: values.propertyMunicipality },
        { label: isEnglish ? 'State/Department' : 'Departamento', value: values.propertyDepartment },
        { label: isEnglish ? 'Address' : 'Dirección', value: values.propertyAddress, span: !(isSale && values.propertyRegistry) },
      ];
      if (isSale && values.propertyRegistry) propItems.push({ label: isEnglish ? 'Registry Number' : 'Matrícula', value: values.propertyRegistry });
      y = infoGrid(pdf, propItems, cardX, y, cardWidth, { fontSize: 9.2 });
      y += 7;

      if (isSale) {
        y = sectionLabel(pdf, isEnglish ? 'Financial Terms' : 'Condiciones económicas', x, y);
        y = termsCard(pdf, [
          { label: isEnglish ? 'Purchase Price' : 'Precio de compra', value: (isEnglish ? values.acceptedAmountWordsEnglish : values.acceptedAmountWords) + ' (US$ ' + formatMoney(values.acceptedAmountNumber) + ')', bold: true },
          { label: isEnglish ? 'Payment Method' : 'Forma de pago', value: isEnglish ? translatedPaymentMethod(values.paymentMethod) : values.paymentMethod, bold: true },
          { label: isEnglish ? 'Payment Details' : 'Detalles del pago', value: values.paymentDetails },
        ], cardX, y, cardWidth);
        y += 6;
        y = paragraph(pdf,
          isEnglish
            ? 'I EXPRESSLY AUTHORIZE GUERRERO PROPERTIES to communicate this acceptance to the interested party and to continue coordinating the eventual formalization of the transaction.'
            : 'AUTORIZO EXPRESAMENTE A GUERRERO PROPERTIES para comunicar esta conformidad al interesado y continuar coordinando la eventual formalización de la operación.',
          x, y, width, { fontSize: 9.5, minFontSize: 8.7, lineHeight: 12.6, maxLines: 4, fontStyle: 'bold' });
        y += 6;
        y = ensureSpace(pdf, y, 124, title, language);
        y = legalCallout(pdf,
          isEnglish
            ? 'This letter does not by itself constitute a promise to sell, a final sale, transfer of title, delivery of the property, or an irrevocable obligation to contract.'
            : 'Esta carta no constituye por sí sola promesa de compraventa, compraventa definitiva, tradición del dominio, entrega del inmueble ni obligación irrevocable de contratar.',
          isEnglish
            ? "This acceptance is subject to compliance with the offered conditions, legal and registry verifications, proof of the payment method or final loan approval where applicable, agreement on any pending clauses, and the signing of the promise to sell or the applicable instrument. This authorization does not empower GUERRERO PROPERTIES to sign promises, contracts, or deeds, to receive the sale price, or to assume obligations on the owner's behalf, except under separate written authorization. Final obligations will arise solely from the contractual document the parties sign. GUERRERO PROPERTIES acts solely as an intermediary and does not guarantee financing, the parties' performance, or the completion of the transaction."
            : 'La aceptación queda sujeta al cumplimiento de las condiciones ofrecidas, a las verificaciones jurídicas y registrales, a la acreditación de la forma de pago o aprobación definitiva del financiamiento cuando corresponda, al acuerdo sobre las cláusulas pendientes y a la firma de la promesa de compraventa o del instrumento aplicable. Esta autorización no faculta a GUERRERO PROPERTIES para suscribir promesas, contratos o escrituras, recibir el precio de venta ni asumir obligaciones en nombre del propietario, salvo autorización escrita independiente. Las obligaciones definitivas surgirán únicamente del documento contractual que las partes suscriban. GUERRERO PROPERTIES interviene exclusivamente como intermediaria y no garantiza el financiamiento, el cumplimiento de las partes ni la conclusión de la operación.',
          cardX, y, cardWidth, language);
      } else {
        y = sectionLabel(pdf, isEnglish ? 'Rental Terms' : 'Condiciones del arrendamiento', x, y);
        y = termsCard(pdf, [
          { label: isEnglish ? 'Rental Amount' : 'Canon de alquiler', value: (isEnglish ? values.acceptedAmountWordsEnglish : values.acceptedAmountWords) + ' (US$ ' + formatMoney(values.acceptedAmountNumber) + ')', bold: true },
          { label: isEnglish ? 'Term' : 'Plazo', value: values.rentalTerm, bold: true },
          { label: isEnglish ? 'Additional Conditions' : 'Condiciones adicionales', value: values.additionalTerms || (isEnglish ? 'No additional remarks' : 'Sin observaciones adicionales') },
        ], cardX, y, cardWidth);
        y += 6;
        y = sectionLabel(pdf, isEnglish ? 'Reservation Authorization' : 'Autorización de reserva', x, y);
        y = paragraph(pdf,
          isEnglish
            ? 'I EXPRESSLY AUTHORIZE GUERRERO PROPERTIES to receive, on my behalf, the agreed amount as a reservation deposit and, once the funds have actually been received and the corresponding reservation document has been signed, to temporarily withdraw the property from the market for the period established in that document.'
            : 'AUTORIZO EXPRESAMENTE A GUERRERO PROPERTIES para recibir, por mi cuenta, la suma acordada en concepto de reserva y, una vez recibidos efectivamente los fondos y firmado el documento de reserva correspondiente, para retirar temporalmente el inmueble del mercado durante el plazo establecido en dicho documento.',
          x, y, width, { fontSize: 9.3, minFontSize: 8.5, lineHeight: 12.4, maxLines: 7, fontStyle: 'bold' });
        y += 4;
        y = paragraph(pdf,
          isEnglish
            ? 'The application, refund, or possible forfeiture of the deposit, and the consequences of withdrawal or breach, will be governed by the reservation document while the lease agreement is being formalized.'
            : 'La aplicación, devolución o eventual retención de la reserva y las consecuencias del desistimiento o incumplimiento se regirán por el documento de reserva, mientras se formaliza el contrato de arrendamiento.',
          x, y, width, { fontSize: 9.1, minFontSize: 8.4, lineHeight: 12.2, maxLines: 5 });
        y += 5;
        y = ensureSpace(pdf, y, 120, title, language);
        y = legalCallout(pdf,
          isEnglish
            ? 'This letter does not by itself constitute a lease agreement, delivery of the property, a right of occupancy, or an irrevocable obligation to contract.'
            : 'Esta carta no constituye por sí sola contrato de arrendamiento, entrega del inmueble, derecho de ocupación ni obligación irrevocable de contratar.',
          isEnglish
            ? "This authorization is limited to receiving the deposit and carrying out the temporary withdrawal described above; it does not empower GUERRERO PROPERTIES to sign the lease agreement, deliver the property, modify the agreed conditions, or assume other obligations on the owner's behalf, except under separate written authorization. Final obligations will arise from the contract the parties sign. GUERRERO PROPERTIES acts solely as an intermediary and does not guarantee the parties' performance or the completion of the transaction."
            : 'Esta autorización se limita a recibir la reserva y efectuar el retiro temporal antes indicados; no faculta a GUERRERO PROPERTIES para suscribir el contrato de arrendamiento, entregar el inmueble, modificar las condiciones acordadas ni asumir otras obligaciones en nombre del propietario, salvo autorización escrita independiente. Las obligaciones definitivas surgirán del contrato que las partes suscriban. GUERRERO PROPERTIES actúa exclusivamente como intermediaria y no garantiza el cumplimiento de las partes ni la conclusión de la operación.',
          cardX, y, cardWidth, language);
      }
    } else {
      var interestWord = isEnglish ? (isSale ? 'purchase' : 'rental') : (isSale ? 'compra' : 'alquiler');
      y = sectionLabel(pdf, isEnglish ? "Owner's Declaration" : 'Declaración del propietario', x, y);
      y = paragraph(pdf,
        isEnglish
          ? 'I, ' + values.ownerName + ', in my capacity as owner, state that I have received and evaluated the offer described in this letter.'
          : 'Yo, ' + values.ownerName + ', en mi calidad de propietario/a, manifiesto haber recibido y evaluado la oferta descrita en esta carta.',
        x, y, width, { fontSize: 10.2, minFontSize: 9.2, lineHeight: 13.6, maxLines: 4 });
      y += 5;
      y = infoGrid(pdf, [
        { label: isEnglish ? 'Age' : 'Edad', value: values.ownerAge + (isEnglish ? ' years' : ' años') },
        { label: isEnglish ? 'ID' : 'Identificación', value: values.ownerDocumentType + ' ' + values.ownerDocumentNumber },
        { label: isEnglish ? 'Address of Residence' : 'Domicilio', value: (isEnglish
          ? 'District of ' + values.ownerDistrict + ', municipality of ' + values.ownerMunicipality + ', department of ' + values.ownerDepartment
          : 'Distrito de ' + values.ownerDistrict + ', municipio de ' + values.ownerMunicipality + ', departamento de ' + values.ownerDepartment), span: true },
      ], cardX, y, cardWidth, { fontSize: 9.2 });
      y += 7;

      y = sectionLabel(pdf, isEnglish ? 'Property' : 'Inmueble', x, y);
      y = infoGrid(pdf, [
        { label: isEnglish ? 'District' : 'Distrito', value: values.propertyDistrict },
        { label: isEnglish ? 'Municipality' : 'Municipio', value: values.propertyMunicipality },
        { label: isEnglish ? 'State/Department' : 'Departamento', value: values.propertyDepartment },
        { label: isEnglish ? 'Address' : 'Dirección', value: values.propertyAddress },
      ], cardX, y, cardWidth, { fontSize: 9.1 });
      y += 7;

      y = sectionLabel(pdf, isEnglish ? 'Offer Received' : 'Oferta recibida', x, y);
      y = paragraph(pdf,
        isEnglish
          ? 'I thank you for the ' + interestWord + ' offer submitted by ' + values.interestedName + ', identified with ' + values.interestedDocumentType + ' ' + values.interestedDocumentNumber + ', for the amount of ' + values.originalAmountWordsEnglish + ' (US$ ' + formatMoney(values.originalAmountNumber) + '). After reviewing the property\'s value and conditions, I submit the following counteroffer:'
          : 'Agradezco la oferta de ' + interestWord + ' presentada por ' + values.interestedName + ', identificado/a con ' + values.interestedDocumentType + ' ' + values.interestedDocumentNumber + ', por un monto de ' + values.originalAmountWords + ' (US$ ' + formatMoney(values.originalAmountNumber) + '). Luego de analizar el valor y las condiciones del inmueble, formulo la siguiente contraoferta:',
        x, y, width, { fontSize: 9.6, minFontSize: 8.6, lineHeight: 12.8, maxLines: 8 });
      y += 6;
      y = sectionLabel(pdf, isEnglish ? 'Counteroffer Terms' : 'Condiciones de la contraoferta', x, y);
      y = termsCard(pdf, [{ label: isEnglish ? 'Counteroffer' : 'Contraoferta', value: values.counterofferText, bold: true }], cardX, y, cardWidth);
      y += 6;
      y = paragraph(pdf,
        isEnglish
          ? 'I REQUEST THAT GUERRERO PROPERTIES notify this counteroffer to the interested party for due consideration.'
          : 'SOLICITO A GUERRERO PROPERTIES que notifique esta contraoferta al interesado para su debida consideración.',
        x, y, width, { fontSize: 9.4, minFontSize: 8.6, lineHeight: 12.5, maxLines: 3, fontStyle: 'bold' });
      y += 5;
      y = ensureSpace(pdf, y, 126, title, language);
      y = legalCallout(pdf,
        isEnglish
          ? 'This letter does not by itself constitute a promise to sell, a final sale, a lease agreement, delivery of the property, a reservation, exclusivity, or an irrevocable obligation to contract.'
          : 'Esta carta no constituye por sí sola promesa de compraventa, compraventa definitiva, contrato de arrendamiento, entrega del inmueble, reserva, exclusividad ni obligación irrevocable de contratar.',
        isEnglish
          ? 'Any eventual acceptance must be in writing, and the transaction will be subject to the corresponding verifications and the signing of the applicable contractual instrument. This notification request does not empower GUERRERO PROPERTIES to accept the counteroffer, modify its conditions, or sign contracts on the owner\'s behalf. GUERRERO PROPERTIES acts solely as an intermediary and does not guarantee acceptance, the parties\' performance, or the completion of the transaction.'
          : 'La eventual aceptación deberá constar por escrito y la operación quedará sujeta a las verificaciones correspondientes y a la firma del instrumento contractual aplicable. La solicitud de notificación no faculta a GUERRERO PROPERTIES para aceptar la contraoferta, modificar sus condiciones ni suscribir contratos en nombre del propietario. GUERRERO PROPERTIES actúa exclusivamente como intermediaria y no garantiza la aceptación, el cumplimiento de las partes ni la conclusión de la operación.',
        cardX, y, cardWidth, language);
    }

    if (values.additionalNotes) {
      y += 4;
      y = ensureSpace(pdf, y, 70, title, language);
      y = sectionLabel(pdf, isEnglish ? 'Additional Notes' : 'Notas adicionales', x, y);
      y = paragraph(pdf, values.additionalNotes, x, y, width, { fontSize: 9.4, minFontSize: 8.6, lineHeight: 12.8, maxLines: 6 });
      y += 6;
    }

    drawSignatureBlock(pdf, values, y, title, language);
  }

  function buildPdf(values) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    var englishPageCount = 0;
    if (values.documentLanguage === 'en') {
      renderResponseDocument(pdf, values, 'en');
      englishPageCount = pdf.getNumberOfPages();
      pdf.addPage();
      renderResponseDocument(pdf, values, 'es');
    } else {
      renderResponseDocument(pdf, values, 'es');
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
    refreshDate();
    normalizeDoc(interestedDocumentType, interestedDocumentNumber);
    if (letterMode.value === 'CONTRAOFERTA') normalizeDoc(ownerDocumentType, ownerDocumentNumber);
    syncAmountFields();

    var errors = [];
    var firstInvalid = null;
    function val(name) { return (form.elements[name] && form.elements[name].value ? String(form.elements[name].value) : '').trim(); }
    function bad(node, msg) { if (node) { node.classList.add('is-invalid'); if (!firstInvalid) firstInvalid = node; } errors.push(msg); }

    var isAcc = letterMode.value === 'ACEPTACION';
    var isCounter = letterMode.value === 'CONTRAOFERTA';
    var isSale = transactionType.value === 'VENTA';
    var isRental = transactionType.value === 'ALQUILER';

    if (!val('owner_name')) bad(form.elements['owner_name'], 'Ingresá el nombre del propietario o vendedor.');
    if (!val('interested_name')) bad(form.elements['interested_name'], 'Ingresá el nombre del interesado.');
    if (!interestedDocumentType.value) bad(interestedDocumentType, 'Seleccioná el tipo de documento del interesado.');
    if (!validDoc(interestedDocumentType, interestedDocumentNumber)) bad(interestedDocumentNumber, 'El número de documento del interesado no tiene un formato válido.');
    if (!val('property_municipality')) bad(form.elements['property_municipality'], 'Ingresá el municipio del inmueble.');
    if (!val('property_department')) bad(form.elements['property_department'], 'Ingresá el departamento del inmueble.');
    if (!val('property_address')) bad(form.elements['property_address'], 'Ingresá la dirección del inmueble.');

    if (isAcc) {
      var acc = Number(val('accepted_amount_number'));
      if (!isFinite(acc) || acc <= 0) bad(acceptedAmountNumber, 'Ingresá un monto aceptado válido.');
      else if (!val('accepted_amount_words')) bad(acceptedAmountNumber, 'No se pudo generar el monto aceptado en letras.');
      if (isSale) {
        if (!['Contado', 'Crédito', 'Mixto'].includes(paymentMethod.value)) bad(paymentMethod, 'Seleccioná la forma de pago.');
        if (!val('payment_details')) bad(paymentDetails, 'Detallá cómo recibirá el pago.');
      }
      if (isRental && !val('rental_term')) bad(rentalTerm, 'Indicá el plazo de alquiler.');
    }

    if (isCounter) {
      var age = Number(val('owner_age'));
      if (!Number.isInteger(age) || age < 18 || age > 120) bad(form.elements['owner_age'], 'Ingresá una edad válida del propietario (18 a 120).');
      if (!val('owner_district')) bad(form.elements['owner_district'], 'Ingresá el distrito de domicilio del propietario.');
      if (!val('owner_municipality')) bad(form.elements['owner_municipality'], 'Ingresá el municipio de domicilio del propietario.');
      if (!val('owner_department')) bad(form.elements['owner_department'], 'Ingresá el departamento de domicilio del propietario.');
      if (!ownerDocumentType.value) bad(ownerDocumentType, 'Seleccioná el tipo de documento del propietario.');
      if (!validDoc(ownerDocumentType, ownerDocumentNumber)) bad(ownerDocumentNumber, 'El número de documento del propietario no tiene un formato válido.');
      if (!val('property_district')) bad(el('property_district'), 'Ingresá el distrito del inmueble.');
      var orig = Number(val('original_amount_number'));
      if (!isFinite(orig) || orig <= 0) bad(originalAmountNumber, 'Ingresá el monto de la oferta recibida.');
      else if (!val('original_amount_words')) bad(originalAmountNumber, 'No se pudo generar el monto recibido en letras.');
      if (!val('counteroffer_text')) bad(counterofferText, 'Escribí el texto de la contraoferta.');
    }

    if (documentLanguage.value === 'en' && !englishConsent.checked) bad(englishConsent, 'Tenés que aceptar que el documento incluye la versión en inglés y su anexo en español.');

    var signatureData = getCleanSignatureData();
    if (!hasSignature || !signatureData) errors.push('La firma del propietario es obligatoria.');

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    return {
      documentLanguage: documentLanguage.value,
      letterMode: letterMode.value,
      transactionType: transactionType.value,
      issueCity: val('issue_city') || 'San Salvador',
      ownerName: val('owner_name'),
      ownerAge: val('owner_age'),
      ownerDistrict: val('owner_district'),
      ownerMunicipality: val('owner_municipality'),
      ownerDepartment: val('owner_department'),
      ownerDocumentType: ownerDocumentType.value,
      ownerDocumentNumber: val('owner_document_number'),
      ownerPhone: val('owner_phone'),
      ownerEmail: val('owner_email'),
      interestedName: val('interested_name'),
      interestedDocumentType: interestedDocumentType.value,
      interestedDocumentNumber: val('interested_document_number'),
      propertyDistrict: val('property_district'),
      propertyMunicipality: val('property_municipality'),
      propertyDepartment: val('property_department'),
      propertyAddress: val('property_address'),
      propertyRegistry: val('property_registry'),
      acceptedAmountNumber: Number(val('accepted_amount_number') || 0),
      acceptedAmountWords: val('accepted_amount_words'),
      acceptedAmountWordsEnglish: val('accepted_amount_words_english'),
      paymentMethod: paymentMethod.value,
      paymentDetails: val('payment_details'),
      rentalTerm: val('rental_term'),
      additionalTerms: val('additional_terms'),
      originalAmountNumber: Number(val('original_amount_number') || 0),
      originalAmountWords: val('original_amount_words'),
      originalAmountWordsEnglish: val('original_amount_words_english'),
      counterofferText: val('counteroffer_text'),
      additionalNotes: val('additional_notes'),
      signatureData: signatureData,
      signDate: now.dateInput,
      signDateLong: now.dateLong,
      signDateLongEnglish: now.dateLongEnglish,
      signTime: now.time,
    };
  }

  // ---------- registro en el CRM (no bloqueante) ----------
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Pasa por /api/lead (server-side, clave service_role) en vez de escribir
  // directo a Supabase con la clave anon — inmune a políticas RLS rotas o a
  // fallas de Supabase que afecten la validación de JWT del rol anon.
  function registrarEnCRM(v, pdfBlob) {
    var modo = v.letterMode === 'ACEPTACION' ? 'Aceptación' : 'Contraoferta';
    var op = v.transactionType === 'VENTA' ? 'venta' : 'alquiler';
    var monto = v.letterMode === 'ACEPTACION' ? v.acceptedAmountNumber : v.originalAmountNumber;
    var resumen = 'Carta de respuesta — ' + modo + ' (' + op + ') — US$ ' + formatMoney(monto) +
      ' — ' + v.propertyAddress +
      ' — Propietario: ' + v.ownerName +
      (v.ownerPhone ? ' (Tel: ' + v.ownerPhone + ')' : '') +
      ' — Interesado: ' + v.interestedName +
      (v.letterMode === 'CONTRAOFERTA' ? ' — Contraoferta: ' + v.counterofferText : (v.transactionType === 'VENTA' ? ' — Forma de pago: ' + v.paymentMethod : ' — Plazo: ' + v.rentalTerm));

    (pdfBlob ? blobToBase64(pdfBlob) : Promise.resolve(null)).then(function (pdfBase64) {
      return fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: v.ownerName, telefono: v.ownerPhone || '', correo: v.ownerEmail || '',
          origen: 'formulario_web', interes: 'vender', propiedad_referencia: v.propertyAddress, notas: resumen,
          actividad: { tipo: 'nota', detalle: resumen },
          pdf_base64: pdfBase64 || undefined,
        }),
      });
    }).catch(function (e) { console.error('registro carta de respuesta:', e); });
  }

  // ---------- generar ----------
  function generar() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showErrors(['No se pudo cargar el generador de PDF. Recargá la página e intentá de nuevo.']);
      return;
    }
    var values = collectValues();
    if (!values) return;
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    btnTxt.textContent = 'Generando…';
    btnTxtEn.textContent = '/ Generating…';
    try {
      var pdf = buildPdf(values);
      var etiqueta = values.letterMode === 'ACEPTACION' ? 'aceptacion' : 'contraoferta';
      var slug = (values.ownerName || 'propietario').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'propietario';
      var pdfBlob = pdf.output('blob');
      pdf.save('carta-respuesta-' + etiqueta + '-' + slug + '.pdf');
      registrarEnCRM(values, pdfBlob);
    } catch (ex) {
      console.error('PDF carta de respuesta:', ex);
      showErrors(['No se pudo generar el PDF: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = 'Generar carta de respuesta (PDF)';
      btnTxtEn.textContent = '/ Generate letter';
    }
  }

  // ---------- borradores (lectura pública, sin login -- los crea Walter
  // desde el panel; esta página solo lee para precargar) ----------
  function aplicarBorrador(campos) {
    if (campos.payment_method) paymentMethod.value = campos.payment_method;
    paymentDetails.value = campos.payment_details || '';
    rentalTerm.value = campos.rental_term || '';
    el('additional_terms').value = campos.additional_terms || '';
    additionalNotes.value = campos.notas_adicionales || '';
  }
  function cargarBorradores() {
    var cfg = window.SITE_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    fetch(cfg.SUPABASE_URL + '/rest/v1/respuesta_borradores?select=*&order=created_at.desc', {
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY },
    }).then(function (res) { return res.ok ? res.json() : []; }).then(function (borradores) {
      borradores.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.nombre;
        borradorSelect.appendChild(opt);
      });
      borradorSelect.addEventListener('change', function () {
        var b = borradores.find(function (x) { return x.id === borradorSelect.value; });
        if (b) aplicarBorrador(b);
      });
    }).catch(function () {});
  }

  // ---------- prefill por querystring ----------
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    var modo = (q.get('modo') || '').toLowerCase();
    if (modo === 'contraoferta') letterMode.value = 'CONTRAOFERTA';
    else if (modo === 'aceptacion') letterMode.value = 'ACEPTACION';
    var tipo = (q.get('tipo') || '').toLowerCase();
    if (tipo === 'venta') transactionType.value = 'VENTA';
    else if (tipo === 'alquiler') transactionType.value = 'ALQUILER';
    if (q.get('direccion')) el('property_address').value = q.get('direccion');
    if (q.get('municipio')) el('property_municipality').value = q.get('municipio');
    if (q.get('departamento')) el('property_department').value = q.get('departamento');
    if (q.get('interesado')) el('interested_name').value = q.get('interesado');
    if (q.get('ciudad')) el('issue_city').value = q.get('ciudad');
  }

  // ---------- init ----------
  documentLanguage.addEventListener('change', toggleDocumentLanguage);
  letterMode.addEventListener('change', toggleFormMode);
  transactionType.addEventListener('change', toggleFormMode);
  interestedDocumentType.addEventListener('change', function () { normalizeDoc(interestedDocumentType, interestedDocumentNumber); });
  interestedDocumentNumber.addEventListener('blur', function () { normalizeDoc(interestedDocumentType, interestedDocumentNumber); });
  ownerDocumentType.addEventListener('change', function () { normalizeDoc(ownerDocumentType, ownerDocumentNumber); });
  ownerDocumentNumber.addEventListener('blur', function () { normalizeDoc(ownerDocumentType, ownerDocumentNumber); });
  acceptedAmountNumber.addEventListener('input', syncAmountFields);
  originalAmountNumber.addEventListener('input', syncAmountFields);
  generateBtn.addEventListener('click', generar);

  prefill();
  toggleFormMode();
  refreshDate();
  syncAmountFields();
  initCanvas();
  cargarBorradores();
  setInterval(refreshDate, 60000);
})();
