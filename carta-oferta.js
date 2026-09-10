// ============================================================
//  Costo SV — Generador de Carta de Oferta (PDF)
//  Réplica propia de oferta.remax-elite.com.sv. Página: /carta-oferta.html
//  Acceso solo por link (noindex). El cliente llena, firma y descarga el PDF.
//  jsPDF nativo (sin html2canvas). Bilingüe: inglés + anexo español, o solo español.
// ============================================================
(function () {
  'use strict';

  var form = document.getElementById('offerForm');
  var el = function (id) { return document.getElementById(id); };
  var documentLanguage = el('document_language');
  var offerType = el('offer_type');
  var documentType = el('document_type');
  var documentNumber = el('document_number');
  var amountNumber = el('amount_number');
  var amountWords = el('amount_words');
  var amountWordsEnglish = el('amount_words_english');
  var amountWordsEnglishWrap = el('amountWordsEnglishWrap');
  var offerDateView = el('offer_date_view');
  var rentalFields = el('rentalFields');
  var saleFields = el('saleFields');
  var rentalTerm = el('rental_term');
  var ownerConditions = el('owner_conditions');
  var paymentMethod = el('payment_method');
  var paymentDetails = el('payment_details');
  var englishConsent = el('english_consent');
  var englishConsentWrap = el('englishConsentWrap');
  var errorBox = el('errorBox');
  var errorList = el('errorList');
  var canvas = el('signaturePad');
  var generateBtn = el('generateBtn');
  var btnTxt = generateBtn.querySelector('.co-generate-txt');

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
  function refreshOfferDate() { offerDateView.value = nowParts().dateInput; }

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
  function syncAmountWords() {
    amountWords.value = amountToWords(amountNumber.value);
    amountWordsEnglish.value = amountToWordsEnglish(amountNumber.value);
  }
  function formatMoney(value) {
    var n = Number(value || 0);
    if (!n) return '0.00';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  // ---------- documento ----------
  function normalizeDocumentNumber() {
    var type = (documentType.value || '').toUpperCase();
    var value = documentNumber.value || '';
    if (type === 'DUI') {
      value = value.replace(/\D+/g, '').slice(0, 9);
    } else if (type === 'NIT') {
      var d = value.replace(/\D+/g, '').slice(0, 14);
      value = d.length === 14 ? (d.slice(0, 4) + ' ' + d.slice(4, 10) + ' ' + d.slice(10, 13) + ' ' + d.slice(13)) : d;
    }
    documentNumber.value = value;
  }
  function validDocumentNumber() {
    var type = documentType.value;
    var raw = documentNumber.value.trim();
    if (!type) return false;
    if (type === 'DUI') return /^\d{9}$/.test(raw);
    if (type === 'NIT') return /^\d{14}$/.test(raw) || /^\d{4}\s\d{6}\s\d{3}\s\d$/.test(raw);
    if (type === 'PASAPORTE') return /^[A-Za-z0-9\-\s]{6,20}$/.test(raw);
    return false;
  }

  // ---------- toggles ----------
  function toggleOfferType() {
    var isSale = offerType.value === 'VENTA';
    var isRental = offerType.value === 'ALQUILER';
    saleFields.classList.toggle('d-none', !isSale);
    rentalFields.classList.toggle('d-none', !isRental);
  }
  function toggleDocumentLanguage() {
    var isEn = documentLanguage.value === 'en';
    amountWordsEnglishWrap.classList.toggle('d-none', !isEn);
    englishConsentWrap.classList.toggle('d-none', !isEn);
    if (!isEn) { englishConsent.checked = false; englishConsent.classList.remove('is-invalid'); }
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

  // ---------- PDF ----------
  function clampText(pdf, text, width, maxLines) {
    var lines = pdf.splitTextToSize(text || '', width);
    if (!maxLines || lines.length <= maxLines) return lines;
    var trimmed = lines.slice(0, maxLines);
    var last = String(trimmed[maxLines - 1] || '').trim();
    if (last.length > 3) last = last.slice(0, Math.max(0, last.length - 3)).trim();
    trimmed[maxLines - 1] = last + '...';
    return trimmed;
  }
  function fitText(pdf, text, width, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 11.4;
    var minFontSize = opts.minFontSize || Math.max(9.2, fontSize - 2.2);
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
    if (maxLines && lines.length > maxLines) lines = clampText(pdf, text, width, maxLines);
    return { lines: lines, fontSize: fontSize, lineHeight: opts.lineHeight || (fontSize * 1.42) };
  }
  function paragraph(pdf, text, x, y, width, opts) {
    var fit = fitText(pdf, text, width, opts || {});
    pdf.setFont('helvetica', (opts && opts.fontStyle) || 'normal');
    pdf.setFontSize(fit.fontSize);
    pdf.text(fit.lines, x, y);
    return y + (fit.lines.length * fit.lineHeight);
  }
  function fieldRow(pdf, index, label, value, x, y, width, maxLines) {
    var fit = fitText(pdf, value || '—', width - 48, { fontSize: 11.4, minFontSize: 9.6, maxLines: maxLines || 2 });
    var dynamicHeight = Math.max(46, 26 + fit.lines.length * (fit.lineHeight));
    pdf.setFillColor(250, 252, 255);
    pdf.setDrawColor(229, 235, 243);
    pdf.roundedRect(x, y - 16, width, dynamicHeight, 10, 10, 'FD');
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
    return y + dynamicHeight + 12;
  }
  function amountBox(pdf, values, x, y, width, title, language) {
    var w = language === 'en' ? values.amountWordsEnglish : values.amountWords;
    var text = language === 'en'
      ? 'Offered amount: (IN WORDS) ' + w + ' (US$ ' + formatMoney(values.amountNumber) + ')'
      : 'Monto ofrecido: (LETRAS) ' + w + ' (US$ ' + formatMoney(values.amountNumber) + ')';
    var fit = fitText(pdf, text, width - 28, { fontSize: 11.7, minFontSize: 9.8, maxLines: values.offerType === 'VENTA' ? 5 : 4 });
    var boxHeight = Math.max(74, 26 + fit.lines.length * fit.lineHeight);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(219, 228, 239);
    pdf.roundedRect(x, y, width, boxHeight, 14, 14, 'FD');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.1);
    pdf.text(title, x + 14, y + 20);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fit.fontSize);
    pdf.text(fit.lines, x + 14, y + 40);
    return y + boxHeight + 16;
  }
  function addHeader(pdf, documentTitle, subtitle) {
    var pageW = pdf.internal.pageSize.getWidth();
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
    pdf.setFontSize(24);
    pdf.text(documentTitle, 50, 80);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12.8);
    pdf.text(subtitle, 50, 102);
    pdf.setDrawColor(229, 57, 53);
    pdf.setLineWidth(1.2);
    pdf.line(50, 114, 188, 114);
    return 152;
  }
  function translatedPaymentMethod(v) {
    return ({ 'Contado': 'Cash', 'Crédito': 'Financing', 'Mixto': 'Mixed' })[v] || v;
  }

  function renderOfferPage(pdf, values, language) {
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var x = 46;
    var width = pageW - 92;
    var isEnglish = language === 'en';
    var isSale = values.offerType === 'VENTA';
    var documentTitle = isEnglish ? 'OFFER LETTER' : 'CARTA DE OFERTA';
    var subtitle = isEnglish
      ? (isSale ? 'Offer to purchase real property' : 'Offer to rent real property')
      : (isSale ? 'Oferta de compra de inmueble' : 'Oferta de alquiler de inmueble');
    var y = addHeader(pdf, documentTitle, subtitle);

    if (values.documentLanguage === 'en') {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.2);
      pdf.text(isEnglish ? 'ATTACHMENT: The complete Spanish version follows this page.' : 'ANEXO: La versión en inglés forma parte de este mismo PDF.', x, y - 4);
      y += 8;
    }

    pdf.setTextColor(15, 23, 42);
    y = paragraph(pdf,
      isEnglish
        ? 'I, ' + values.fullName + ', ' + values.age + ' years of age, domiciled in the city of ' + values.domicileCity + ', state or department of ' + values.domicileDepartment + ', holder of my ' + (values.documentType === 'PASAPORTE' ? 'passport' : values.documentType) + ' number ' + values.documentNumber + ', acting as the ' + (isSale ? 'buyer' : 'prospective tenant') + ', declare that I am interested in ' + (isSale ? 'purchasing' : 'renting') + ' the property with the following characteristics:'
        : 'Yo, ' + values.fullName + ', de ' + values.age + ' años de edad, del domicilio de la ciudad de ' + values.domicileCity + ', departamento de ' + values.domicileDepartment + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de ' + (isSale ? 'comprador' : 'cliente') + ', declaro que me encuentro interesado en ' + (isSale ? 'comprar' : 'alquilar') + ' el inmueble que cuenta con las siguientes características:',
      x, y, width, { fontSize: 11.8, minFontSize: 10.2, lineHeight: 16.8, maxLines: 7 });
    y += 12;

    y = fieldRow(pdf, 1, isEnglish ? 'Municipality' : 'Municipio', values.propertyMunicipality, x, y, width, 2);
    y = fieldRow(pdf, 2, isEnglish ? 'State or department' : 'Departamento', values.propertyDepartment, x, y, width, 2);
    y = fieldRow(pdf, 3, isEnglish ? 'Property address' : 'Dirección del inmueble', values.propertyAddress, x, y, width, 3);

    y += 6;
    y = amountBox(pdf, values, x, y, width,
      isEnglish ? (isSale ? 'Offered purchase price' : 'Offered rental price') : (isSale ? 'Precio de compra ofrecido' : 'Precio de alquiler ofrecido'),
      language);

    if (!isSale) {
      y = paragraph(pdf, (isEnglish ? 'Offered rental term: ' : 'Plazo de alquiler ofrecido: ') + values.rentalTerm + '.', x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.2, maxLines: 3 });
      y += 8;
      y = paragraph(pdf, (isEnglish ? 'Conditions or requests to the property owner: ' : 'Condiciones o solicitudes al propietario: ') + values.ownerConditions, x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.8, maxLines: 4 });
      y += 14;
    }
    if (isSale) {
      var paymentText = isEnglish
        ? 'Payment method: ' + translatedPaymentMethod(values.paymentMethod) + '. ' + values.paymentDetails
        : 'Forma de pago: ' + values.paymentMethod + '. ' + values.paymentDetails;
      y = paragraph(pdf, (isEnglish ? 'The funds will be delivered as follows: ' : 'Los fondos serán entregados de la siguiente manera: ') + paymentText, x, y, width, { fontSize: 11.2, minFontSize: 9.6, lineHeight: 15.6, maxLines: 7 });
      y += 14;
    }

    y = paragraph(pdf,
      isEnglish
        ? 'I also expressly authorize GUERRERO PROPERTIES to notify the owner of the property of this offer in order to receive a response accepting or rejecting it.'
        : 'Así mismo, autorizo expresamente a GUERRERO PROPERTIES para que notifique al propietario de dicho inmueble la presente oferta, a efectos de recibir respuesta de aceptación o rechazo.',
      x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.4, maxLines: 5 });
    y += 20;

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.2);
    pdf.text(isEnglish ? values.issueCity + ', on ' + values.signDateLongEnglish + '.' : values.issueCity + ', a ' + values.signDateLong + '.', x, y);

    var signatureTop = Math.min(710, Math.max(y + 74, 675));
    pdf.setDrawColor(110, 122, 144);
    pdf.line(x, signatureTop, x + 200, signatureTop);
    if (values.signatureData) {
      try { pdf.addImage(values.signatureData, 'PNG', x + 10, signatureTop - 54, 144, 44); } catch (e) {}
    }
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.1);
    pdf.text(isEnglish ? 'SIGNATURE:' : 'FIRMA:', x, signatureTop + 18);
    pdf.text(isEnglish ? 'NAME:' : 'NOMBRE:', x, signatureTop + 38);
    pdf.text((isEnglish && values.documentType === 'PASAPORTE' ? 'PASSPORT' : values.documentType.toUpperCase()) + ':', x, signatureTop + 58);
    pdf.text(isEnglish ? 'DATE:' : 'FECHA:', x + 278, signatureTop + 18);
    pdf.text(isEnglish ? 'TIME:' : 'HORA:', x + 278, signatureTop + 38);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.1);
    pdf.text(values.fullName, x + 70, signatureTop + 38);
    pdf.text(values.documentNumber, x + 70, signatureTop + 58);
    pdf.text(values.signDate, x + 332, signatureTop + 18);
    pdf.text(values.signTime, x + 332, signatureTop + 38);

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.text(
      isEnglish ? 'English offer - The attached Spanish version follows.' : (values.documentLanguage === 'en' ? 'Versión en español - Se anexa la versión en inglés en este mismo PDF.' : 'Versión en español.'),
      pageW / 2, pageH - 16, { align: 'center' });
  }

  function buildPdf(values) {
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    if (values.documentLanguage === 'en') {
      renderOfferPage(pdf, values, 'en');
      pdf.addPage();
      renderOfferPage(pdf, values, 'es');
    } else {
      renderOfferPage(pdf, values, 'es');
    }
    return pdf;
  }

  // ---------- validación ----------
  function showErrors(list) {
    errorList.innerHTML = '';
    list.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; errorList.appendChild(li); });
    errorBox.classList.remove('d-none');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function hideErrors() { errorBox.classList.add('d-none'); errorList.innerHTML = ''; }

  function collectValues() {
    hideErrors();
    refreshOfferDate();
    normalizeDocumentNumber();
    syncAmountWords();

    var errors = [];
    var firstInvalid = null;
    function val(name) { return (form.elements[name] && form.elements[name].value ? String(form.elements[name].value) : '').trim(); }
    function bad(node, msg) {
      if (node) { node.classList.add('is-invalid'); if (!firstInvalid) firstInvalid = node; }
      errors.push(msg);
    }
    ['full_name', 'age', 'domicile_city', 'domicile_department', 'property_municipality', 'property_department', 'property_address', 'amount_number', 'offer_type', 'document_type']
      .forEach(function (n) { if (form.elements[n]) form.elements[n].classList.remove('is-invalid'); });
    documentNumber.classList.remove('is-invalid');
    paymentMethod.classList.remove('is-invalid');
    paymentDetails.classList.remove('is-invalid');
    rentalTerm.classList.remove('is-invalid');
    ownerConditions.classList.remove('is-invalid');
    englishConsent.classList.remove('is-invalid');

    if (!offerType.value) bad(offerType, 'Seleccioná venta o alquiler.');
    if (!val('full_name')) bad(form.elements['full_name'], 'Ingresá el nombre completo.');
    var age = Number(val('age'));
    if (!val('age') || !Number.isInteger(age) || age < 18 || age > 120) bad(form.elements['age'], 'Ingresá una edad válida (18 a 120).');
    if (!val('domicile_city')) bad(form.elements['domicile_city'], 'Ingresá la ciudad de domicilio.');
    if (!val('domicile_department')) bad(form.elements['domicile_department'], 'Ingresá el departamento de domicilio.');
    if (!documentType.value) bad(documentType, 'Seleccioná el tipo de documento.');
    if (!validDocumentNumber()) bad(documentNumber, 'Número de documento inválido para el tipo elegido.');
    if (!val('property_municipality')) bad(form.elements['property_municipality'], 'Ingresá el municipio del inmueble.');
    if (!val('property_department')) bad(form.elements['property_department'], 'Ingresá el departamento del inmueble.');
    if (!val('property_address')) bad(form.elements['property_address'], 'Ingresá la dirección del inmueble.');

    var amount = Number(val('amount_number'));
    if (!isFinite(amount) || amount <= 0) bad(amountNumber, 'Ingresá un monto válido en dólares.');
    else if (!val('amount_words')) bad(amountNumber, 'No se pudo generar el monto en letras.');

    var isSale = offerType.value === 'VENTA';
    var isRental = offerType.value === 'ALQUILER';
    if (isSale) {
      if (!['Contado', 'Crédito', 'Mixto'].includes(paymentMethod.value)) bad(paymentMethod, 'Seleccioná la forma de pago.');
      if (!val('payment_details')) bad(paymentDetails, 'Detallá la entrega de fondos.');
    }
    if (isRental) {
      if (!val('rental_term')) bad(rentalTerm, 'Indicá el plazo de alquiler.');
      if (!val('owner_conditions')) bad(ownerConditions, 'Indicá las condiciones o solicitudes al propietario.');
    }
    if (documentLanguage.value === 'en' && !englishConsent.checked) bad(englishConsent, 'Tenés que aceptar que el PDF incluye la versión en inglés y su anexo en español.');
    if (!hasSignature || !signatureData) errors.push('La firma del cliente es obligatoria.');

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    return {
      documentLanguage: documentLanguage.value,
      offerType: offerType.value,
      issueCity: val('issue_city') || 'San Salvador',
      fullName: val('full_name'),
      age: val('age'),
      domicileCity: val('domicile_city'),
      domicileDepartment: val('domicile_department'),
      documentType: documentType.value,
      documentNumber: val('document_number'),
      clientPhone: val('client_phone'),
      clientEmail: val('client_email'),
      propertyMunicipality: val('property_municipality'),
      propertyDepartment: val('property_department'),
      propertyAddress: val('property_address'),
      amountNumber: amount,
      amountWords: val('amount_words'),
      amountWordsEnglish: val('amount_words_english'),
      rentalTerm: val('rental_term'),
      ownerConditions: val('owner_conditions'),
      paymentMethod: paymentMethod.value,
      paymentDetails: val('payment_details'),
      signatureData: signatureData,
      signDate: now.dateInput,
      signDateLong: now.dateLong,
      signDateLongEnglish: now.dateLongEnglish,
      signTime: now.time,
    };
  }

  // ---------- registro en el CRM (no bloqueante) ----------
  function registrarEnCRM(v) {
    var CFG = window.SITE_CONFIG || {};
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var headers = {
      'Content-Type': 'application/json',
      apikey: CFG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY,
      Prefer: 'return=minimal',
    };
    var contactoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2));
    var resumen = 'Carta de oferta (' + (v.offerType === 'VENTA' ? 'venta' : 'alquiler') + ') — US$ ' + formatMoney(v.amountNumber) +
      ' — ' + v.propertyAddress +
      ' — Cliente: ' + v.fullName + ' (' + v.documentType + ' ' + v.documentNumber + ')' +
      (v.clientPhone ? ' — Tel: ' + v.clientPhone : '') +
      (v.offerType === 'VENTA' ? ' — Forma de pago: ' + v.paymentMethod : ' — Plazo: ' + v.rentalTerm);
    fetch(CFG.SUPABASE_URL + '/rest/v1/contactos', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ id: contactoId, nombre: v.fullName, telefono: v.clientPhone || '', correo: v.clientEmail || '' }),
    }).then(function (c) {
      if (!c.ok) return null;
      return fetch(CFG.SUPABASE_URL + '/rest/v1/leads', {
        method: 'POST', headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
        body: JSON.stringify({
          contacto_id: contactoId,
          origen: 'formulario_web',
          interes: v.offerType === 'VENTA' ? 'comprar' : 'otro',
          propiedad_referencia: v.propertyAddress,
          notas: resumen,
        }),
      });
    }).then(function (l) {
      if (!l || !l.ok) return;
      return l.json().then(function (rows) {
        var leadId = rows && rows[0] && rows[0].id;
        if (!leadId) return;
        return fetch(CFG.SUPABASE_URL + '/rest/v1/actividades', {
          method: 'POST', headers: headers,
          body: JSON.stringify({ lead_id: leadId, tipo: 'nota', detalle: resumen }),
        });
      });
    }).catch(function (e) { console.error('registro carta de oferta:', e); });
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
    try {
      var pdf = buildPdf(values);
      var slug = (values.fullName || 'cliente').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'cliente';
      pdf.save('carta-oferta-' + slug + '.pdf');
      registrarEnCRM(values);
    } catch (ex) {
      console.error('PDF carta de oferta:', ex);
      showErrors(['No se pudo generar el PDF: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = 'Generar carta de oferta (PDF)';
    }
  }

  // ---------- prefill por querystring ----------
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    var tipo = (q.get('tipo') || '').toLowerCase();
    if (tipo === 'venta') offerType.value = 'VENTA';
    else if (tipo === 'alquiler') offerType.value = 'ALQUILER';
    if (q.get('municipio')) el('property_municipality').value = q.get('municipio');
    if (q.get('departamento')) el('property_department').value = q.get('departamento');
    if (q.get('direccion')) el('property_address').value = q.get('direccion');
    if (q.get('ciudad')) el('issue_city').value = q.get('ciudad');
    var monto = (q.get('monto') || '').replace(/[^0-9.]/g, '');
    if (monto) amountNumber.value = monto;
  }

  // ---------- init ----------
  documentLanguage.addEventListener('change', toggleDocumentLanguage);
  offerType.addEventListener('change', toggleOfferType);
  documentType.addEventListener('change', function () { normalizeDocumentNumber(); });
  documentNumber.addEventListener('blur', normalizeDocumentNumber);
  amountNumber.addEventListener('input', syncAmountWords);
  generateBtn.addEventListener('click', generar);

  prefill();
  toggleOfferType();
  toggleDocumentLanguage();
  refreshOfferDate();
  syncAmountWords();
  initCanvas();
  setInterval(refreshOfferDate, 60000);
})();
