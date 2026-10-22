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
  var letterIssuer = el('letter_issuer');
  var recipientName = el('recipient_name');
  var recipientWrap = el('recipientWrap');
  var offerValidity = el('offer_validity');
  var validityWrap = el('validityWrap');
  var subjectPriorSale = el('subject_prior_sale');
  var priorSaleWrap = el('priorSaleWrap');
  var offerType = el('offer_type');
  var documentType = el('document_type');
  var documentNumber = el('document_number');
  var listPrice = el('list_price');
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
  var additionalNotes = el('additional_notes');
  var borradorSelect = el('borrador_select');
  var firmPrice = el('firm_price');
  var inventoryCard = el('inventoryCard');
  var inventoryItemsWrap = el('inventoryItemsWrap');
  var closingCostsCard = el('closingCostsCard');
  var ccTransferTax = el('cc_transfer_tax');
  var ccCnrFee = el('cc_cnr_fee');
  var ccTotal = el('cc_total');
  var ccGrandTotal = el('cc_grand_total');
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
  function refreshOfferDate() { offerDateView.value = nowParts().dateInput; }

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // El valor de un <input type="date"> es "yyyy-mm-dd". Se parsea a mano
  // porque new Date('2026-11-05') se interpreta como medianoche UTC y en
  // El Salvador (UTC-6) eso cae un día antes.
  function fechaLarga(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return null;
    var y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
    if (!y || !m || !d || m < 1 || m > 12) return null;
    return {
      es: d + ' de ' + MESES[m - 1] + ' de ' + y,
      en: MESES_EN[m - 1] + ' ' + d + ', ' + y,
      iso: p[0] + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'),
    };
  }
  function isoHoyMas(dias) {
    var d = new Date();
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- dirección de la carta ----------
  // COMPRADOR: el interesado le ofrece al propietario (oferta de compra, la
  // original). PROPIETARIO: el dueño le ofrece en venta al comprador y firma
  // él (oferta de venta) -- misma carta, partes invertidas.
  function delPropietario() { return letterIssuer.value === 'PROPIETARIO'; }

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

  // ---------- gastos de cierre (impuesto de transferencia + derechos CNR) ----------
  // Ley de Impuesto sobre Transferencia de Bienes Raíces: 3% sobre el excedente
  // de US$28,571.43 (equivalente a los ¢250,000 de la ley, umbral exento).
  // Ley de Aranceles del Registro de la Propiedad Raíz e Hipotecas, Art. 48 y
  // 50-A: compraventas US$0.63 por cada cien dólares o fracción, con un
  // mínimo de US$8.86 y un máximo de US$5,400.00.
  var TRANSFER_TAX_THRESHOLD = 28571.43;
  var TRANSFER_TAX_RATE = 0.03;
  var CNR_RATE_PER_HUNDRED = 0.63;
  var CNR_MIN = 8.86;
  var CNR_MAX = 5400;
  function closingCosts(price) {
    price = Number(price || 0);
    var transferTax = price > TRANSFER_TAX_THRESHOLD ? (price - TRANSFER_TAX_THRESHOLD) * TRANSFER_TAX_RATE : 0;
    var cnrFee = price > 0 ? Math.min(CNR_MAX, Math.max(CNR_MIN, Math.ceil(price / 100) * CNR_RATE_PER_HUNDRED)) : 0;
    var total = transferTax + cnrFee;
    return { transferTax: transferTax, cnrFee: cnrFee, total: total, grandTotal: price + total };
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
    closingCostsCard.classList.toggle('d-none', !isSale);
    // La cláusula de venta previa solo aplica a una venta ofrecida por el
    // propietario (en un alquiler no hay "venta previa" que la justifique).
    priorSaleWrap.classList.toggle('d-none', !delPropietario() || !isSale);
    refreshClosingCosts();
  }
  function refreshClosingCosts() {
    if (offerType.value !== 'VENTA') return;
    var c = closingCosts(amountNumber.value);
    ccTransferTax.textContent = 'US$ ' + formatMoney(c.transferTax);
    ccCnrFee.textContent = 'US$ ' + formatMoney(c.cnrFee);
    ccTotal.textContent = 'US$ ' + formatMoney(c.total);
    ccGrandTotal.textContent = 'US$ ' + formatMoney(c.grandTotal);
  }
  // ---------- orden de los idiomas en el formulario ----------
  // En el HTML cada rótulo está escrito "Español <span class="en">/ English</span>".
  // Si el documento se emite en inglés, quien llena el formulario es
  // extranjero, así que se invierte el par: inglés primero y español como
  // segunda línea, igual que el PDF (inglés + anexo en español). El registro
  // guarda las dos mitades la primera vez que se ven, para poder ir y volver
  // sin perder ninguna. El modo agente queda siempre en español: lo usa
  // Walter, no el cliente.
  var BILINGUES = new Map();
  function ordenIngles() { return documentLanguage.value === 'en'; }

  function capturarBilingues() {
    Array.prototype.forEach.call(document.querySelectorAll('span.en'), function (span) {
      var host = span.parentElement;
      if (!host || BILINGUES.has(host) || (host.closest && host.closest('#agenteCard'))) return;
      var es = '';
      Array.prototype.forEach.call(host.childNodes, function (nodo) {
        if (nodo === span) return;
        es += nodo.nodeType === 1 ? nodo.outerHTML : (nodo.textContent || '');
      });
      var crudo = span.innerHTML;
      BILINGUES.set(host, {
        es: es.trim(),
        en: crudo.replace(/^\s*\/\s*/, '').trim(),
        style: span.getAttribute('style') || '',
        // Los rótulos que ya venían en bloque (o sin barra) se mantienen así.
        barra: /^\s*\//.test(crudo) && window.getComputedStyle(span).display !== 'block',
      });
    });
  }
  function renderBilingue(host) {
    var p = BILINGUES.get(host);
    if (!p) return;
    var primero = ordenIngles() ? p.en : p.es;
    var segundo = ordenIngles() ? p.es : p.en;
    if (!segundo) { host.innerHTML = primero; return; }
    host.innerHTML = primero + ' <span class="en"' + (p.style ? ' style="' + p.style + '"' : '') + '>' +
      (p.barra ? '/ ' : '') + segundo + '</span>';
  }
  function setBilingue(id, es, en, conBarra) {
    var host = el(id);
    if (!host) return;
    var p = BILINGUES.get(host);
    BILINGUES.set(host, {
      es: es,
      en: en,
      style: p ? p.style : '',
      barra: conBarra === undefined ? (p ? p.barra : true) : conBarra,
    });
    renderBilingue(host);
  }
  function aplicarOrdenIdiomas() {
    BILINGUES.forEach(function (_, host) { renderBilingue(host); });
    Array.prototype.forEach.call(document.querySelectorAll('option[data-en]'), function (op) {
      var es = op.dataset.es || '';
      var en = op.dataset.en || '';
      op.textContent = ordenIngles() ? en + ' / ' + es : es + ' / ' + en;
    });
    btnTxt.textContent = ordenIngles() ? textoBotonEn() : textoBoton();
    btnTxtEn.textContent = '/ ' + (ordenIngles() ? textoBoton() : textoBotonEn());
  }
  // Mensajes de validación en el mismo orden que el resto del formulario.
  function bilingue(es, en) {
    return ordenIngles() ? en + ' / ' + es : es + ' / ' + en;
  }

  // Reescribe los rótulos del formulario según quién emite la carta. El PDF
  // se reescribe aparte, en renderOfferPage().
  function textoBoton() {
    return delPropietario() ? 'Generar carta de oferta de venta (PDF)' : 'Generar carta de oferta (PDF)';
  }
  function textoBotonEn() {
    return delPropietario() ? 'Generate offer to sell (PDF)' : 'Generate offer letter (PDF)';
  }
  function toggleLetterIssuer() {
    var esProp = delPropietario();
    var isSale = offerType.value !== 'ALQUILER';
    recipientWrap.classList.toggle('d-none', !esProp);
    validityWrap.classList.toggle('d-none', !esProp);
    priorSaleWrap.classList.toggle('d-none', !esProp || !isSale);
    if (esProp && !offerValidity.value) offerValidity.value = isoHoyMas(15);

    el('headerTitle').textContent = ordenIngles()
      ? (esProp ? 'Offer to Sell' : 'Offer Letter')
      : (esProp ? 'Carta de Oferta de Venta' : 'Carta de Oferta');
    setBilingue('headerSubtitle',
      esProp ? 'Oferta del propietario al comprador' : 'Oferta de compra o alquiler de inmueble',
      esProp ? 'Owner\'s offer to the buyer' : 'Offer to purchase or rent a property');
    setBilingue('clienteCardTitle',
      esProp ? 'Partes' : 'Datos del cliente',
      esProp ? 'Parties' : 'Client details');
    el('clienteCardHint').classList.toggle('d-none', !esProp);
    if (esProp) {
      setBilingue('clienteCardHint',
        'Quien firma esta carta es el propietario. El comprador solo la recibe.',
        'The owner is the one signing this letter. The buyer only receives it.');
    }
    setBilingue('fullNameLabel',
      esProp ? 'Nombre completo del propietario' : 'Nombre completo',
      esProp ? 'Owner\'s full name' : 'Full name');
    setBilingue('amountNumberLabel',
      esProp ? 'Precio ofrecido al comprador (US$)' : 'Monto ofrecido (US$)',
      esProp ? 'Price offered to the buyer' : 'Offered amount');
    setBilingue('inventoryHint',
      esProp
        ? 'Según el borrador elegido. Desmarcá lo que no vaya incluido en la venta.'
        : 'Según el borrador elegido. Desmarcá lo que no quieras incluir en tu oferta.',
      esProp
        ? 'From the selected draft. Uncheck anything not included in the sale.'
        : 'From the selected draft. Uncheck anything you don\'t want included in your offer.');
    setBilingue('firmaHint',
      esProp
        ? 'Firma del propietario. La fecha y hora se agregan automáticamente.'
        : 'Firma del cliente. La fecha y hora se agregan automáticamente.',
      esProp
        ? 'Owner\'s signature. The date and time are added automatically.'
        : 'Client\'s signature. The date and time are added automatically.');
    setBilingue('revisionBanner',
      esProp
        ? '<strong>Vista previa.</strong> Así se verá la carta de oferta de venta. Revisá el precio, la vigencia y los bienes incluidos antes de firmarla.'
        : '<strong>Revisión del propietario.</strong> Esta es la oferta que se le va a enviar al comprador para que la complete y firme. Revisá el precio, la forma de pago y los bienes incluidos. Si algo no está correcto, avisale a tu agente antes de que se envíe.',
      esProp
        ? '<strong>Preview.</strong> This is how the offer to sell will look. Please review the price, the validity date and the included items before signing it.'
        : '<strong>Owner review.</strong> This is the offer that will be sent to the buyer to complete and sign. Please review the price, payment method and included items. If anything is not correct, let your agent know before it is sent.',
      false);

    // El modo agente lo usa Walter: queda siempre en español.
    if (el('agenteTitle')) {
      el('agenteTitle').textContent = esProp ? 'Preparar el link para el propietario' : 'Preparar el link para el cliente';
      el('agenteHint').textContent = esProp
        ? 'Modo agente. Dejá lista la oferta (inmueble, precio, vigencia, bienes incluidos) y copiá el link de firma: se le abre al propietario con todo puesto y él solo pone su nombre, su documento y firma. El PDF firmado se archiva y vos se lo reenviás al comprador.'
        : 'Modo agente. Llená abajo todo lo que quieras dejar listo (inmueble, precio, forma de pago, bienes incluidos) y después apretá el botón: se copia un link que le abre al cliente la carta ya con todo eso puesto. Él solo pone su nombre, su documento y firma.';
      el('copiarLinkRevision').textContent = esProp
        ? '1. Copiar link de vista previa (solo lectura)'
        : '1. Copiar link de revisión (propietario)';
      el('copiarLinkCliente').textContent = esProp
        ? '2. Copiar link para que firme el propietario'
        : '2. Copiar link para el cliente';
    }
    btnTxt.textContent = ordenIngles() ? textoBotonEn() : textoBoton();
    btnTxtEn.textContent = '/ ' + (ordenIngles() ? textoBoton() : textoBotonEn());
  }

  function toggleDocumentLanguage() {
    var isEn = documentLanguage.value === 'en';
    amountWordsEnglishWrap.classList.toggle('d-none', !isEn);
    englishConsentWrap.classList.toggle('d-none', !isEn);
    if (!isEn) { englishConsent.checked = false; englishConsent.classList.remove('is-invalid'); }
    aplicarOrdenIdiomas();
    toggleLetterIssuer();
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
  function closingCostsBox(pdf, amount, x, y, width, language) {
    var isEnglish = language === 'en';
    var c = closingCosts(amount);
    var rows = [
      [isEnglish ? 'Property transfer tax (alcabala)' : 'Impuesto de transferencia (alcabala)', c.transferTax],
      [isEnglish ? 'CNR registration fee' : 'Derechos de registro CNR', c.cnrFee],
      [isEnglish ? 'Total closing costs' : 'Total gastos de cierre', c.total],
      [isEnglish ? 'Total to prepare (price + costs)' : 'Total a preparar (precio + gastos)', c.grandTotal],
    ];
    var rowHeight = 20;
    var boxHeight = 34 + rows.length * rowHeight;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(219, 228, 239);
    pdf.roundedRect(x, y, width, boxHeight, 14, 14, 'FD');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.6);
    pdf.text(isEnglish ? 'Estimated closing costs, payable by the buyer (not included in the price above)' : 'Gastos de cierre estimados, a cargo del comprador (no incluidos en el precio anterior)', x + 14, y + 18);
    var rowY = y + 38;
    rows.forEach(function (row, i) {
      var isTotal = i >= 2;
      pdf.setFont('helvetica', isTotal ? 'bold' : 'normal');
      pdf.setFontSize(9.8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(row[0], x + 14, rowY);
      pdf.setTextColor(11, 45, 92);
      pdf.text('US$ ' + formatMoney(row[1]), x + width - 14, rowY, { align: 'right' });
      rowY += rowHeight;
    });
    pdf.setTextColor(15, 23, 42);
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
  // Este archivo no usa el patrón de paginación robusto (ensureSpace) de
  // carta-respuesta.js/kyc-cliente.js -- layout fijo de una sola página con
  // un solo "pdf.addPage()" antes de la firma. Con bloques de contenido
  // variable (notas, bienes incluidos, gastos de cierre) el texto puede
  // acumular más altura que la página física y quedar dibujado FUERA del
  // área visible (se pierde en silencio, sin error). Por eso se llama a este
  // helper después de cada bloque grande, no solo una vez antes de la firma.
  function pageBreakIfNeeded(pdf, y, limit) {
    if (y > (limit == null ? 700 : limit)) { pdf.addPage(); return 80; }
    return y;
  }

  function renderOfferPage(pdf, values, language) {
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var x = 46;
    var width = pageW - 92;
    var isEnglish = language === 'en';
    var isSale = values.offerType === 'VENTA';
    var deProp = values.issuer === 'PROPIETARIO';
    var documentTitle = deProp
      ? (isEnglish ? (isSale ? 'OFFER TO SELL' : 'OFFER TO LEASE') : (isSale ? 'CARTA DE OFERTA DE VENTA' : 'CARTA DE OFERTA DE ALQUILER'))
      : (isEnglish ? 'OFFER LETTER' : 'CARTA DE OFERTA');
    var subtitle = deProp
      ? (isEnglish
          ? (isSale ? 'Owner\'s offer to sell to the buyer' : 'Owner\'s offer to lease to the tenant')
          : (isSale ? 'Oferta del propietario al comprador' : 'Oferta del propietario al arrendatario'))
      : (isEnglish
          ? (isSale ? 'Offer to purchase real property' : 'Offer to rent real property')
          : (isSale ? 'Oferta de compra de inmueble' : 'Oferta de alquiler de inmueble'));
    var y = addHeader(pdf, documentTitle, subtitle);

    if (values.documentLanguage === 'en') {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.2);
      pdf.text(isEnglish ? 'ATTACHMENT: The complete Spanish version follows this page.' : 'ANEXO: La versión en inglés forma parte de este mismo PDF.', x, y - 4);
      y += 8;
    }

    pdf.setTextColor(15, 23, 42);
    if (deProp && values.recipientName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.2);
      pdf.text((isEnglish ? 'Addressed to: ' : 'Dirigida a: ') + values.recipientName, x, y);
      pdf.setFont('helvetica', 'normal');
      y += 20;
    }

    var docEnIngles = values.documentType === 'PASAPORTE' ? 'passport' : values.documentType;
    var declaracion;
    if (deProp) {
      declaracion = isEnglish
        ? 'I, ' + values.fullName + ', holder of my ' + docEnIngles + ' number ' + values.documentNumber + ', acting as the owner of the property described below, hereby offer to ' + (isSale ? 'sell' : 'lease') + ' it to ' + (values.recipientName || 'the interested party') + '. The property has the following characteristics:'
        : 'Yo, ' + values.fullName + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de propietario del inmueble que se describe a continuación, ofrezco ' + (isSale ? 'en venta' : 'en alquiler') + ' dicho inmueble a ' + (values.recipientName || 'la parte interesada') + '. El inmueble cuenta con las siguientes características:';
    } else {
      declaracion = isEnglish
        ? 'I, ' + values.fullName + ', holder of my ' + docEnIngles + ' number ' + values.documentNumber + ', acting as the ' + (isSale ? 'buyer' : 'prospective tenant') + ', declare that I am interested in ' + (isSale ? 'purchasing' : 'renting') + ' the property with the following characteristics:'
        : 'Yo, ' + values.fullName + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de ' + (isSale ? 'comprador' : 'cliente') + ', declaro que me encuentro interesado en ' + (isSale ? 'comprar' : 'alquilar') + ' el inmueble que cuenta con las siguientes características:';
    }
    y = paragraph(pdf, declaracion, x, y, width, { fontSize: 11.8, minFontSize: 10.2, lineHeight: 16.8, maxLines: 7 });
    y += 12;

    y = fieldRow(pdf, 1, isEnglish ? 'Municipality' : 'Municipio', values.propertyMunicipality, x, y, width, 2);
    y = fieldRow(pdf, 2, isEnglish ? 'State or department' : 'Departamento', values.propertyDepartment, x, y, width, 2);
    y = fieldRow(pdf, 3, isEnglish ? 'Property address' : 'Dirección del inmueble', values.propertyAddress, x, y, width, 3);

    y += 6;
    var amountLabel = deProp
      ? (isEnglish ? (isSale ? 'Offered sale price' : 'Offered rental price') : (isSale ? 'Precio de venta ofrecido' : 'Precio de alquiler ofrecido'))
      : (isEnglish ? (isSale ? 'Offered purchase price' : 'Offered rental price') : (isSale ? 'Precio de compra ofrecido' : 'Precio de alquiler ofrecido'));
    y = amountBox(pdf, values, x, y, width, amountLabel, language);

    if (values.listPrice > 0) {
      var diff = values.listPrice - values.amountNumber;
      var listText;
      if (deProp) {
        // Lo ofrece el propietario: la diferencia con su precio de lista es
        // una concesión que él hace, no una rebaja que pide el comprador.
        listText = isEnglish
          ? 'Authorized list price: US$ ' + formatMoney(values.listPrice) + '. ' + (
              diff > 0 ? 'This price represents a US$ ' + formatMoney(diff) + ' reduction from the list price, granted to the buyer named in this letter.'
              : diff < 0 ? 'This price is US$ ' + formatMoney(-diff) + ' above the list price.'
              : 'This price matches the list price.')
          : 'Precio de lista autorizado: US$ ' + formatMoney(values.listPrice) + '. ' + (
              diff > 0 ? 'Este precio representa una reducción de US$ ' + formatMoney(diff) + ' respecto del precio de lista, concedida al comprador indicado en esta carta.'
              : diff < 0 ? 'Este precio está US$ ' + formatMoney(-diff) + ' por encima del precio de lista.'
              : 'Este precio corresponde al precio de lista.');
      } else {
        listText = isEnglish
          ? 'Authorized list price: US$ ' + formatMoney(values.listPrice) + '. ' + (
              diff > 0 ? 'This offer is US$ ' + formatMoney(diff) + ' below the list price.'
              : diff < 0 ? 'This offer is US$ ' + formatMoney(-diff) + ' above the list price.'
              : 'This offer matches the list price.')
          : 'Precio de lista autorizado: US$ ' + formatMoney(values.listPrice) + '. ' + (
              diff > 0 ? 'Esta oferta está US$ ' + formatMoney(diff) + ' por debajo del precio de lista.'
              : diff < 0 ? 'Esta oferta está US$ ' + formatMoney(-diff) + ' por encima del precio de lista.'
              : 'Esta oferta corresponde al precio de lista.');
      }
      y = paragraph(pdf, listText, x, y, width, { fontSize: 10.8, minFontSize: 9.6, lineHeight: 14.6, maxLines: 3 });
      y += 10;
    }

    if (values.firmPrice) {
      pdf.setTextColor(11, 45, 92);
      y = paragraph(pdf,
        isEnglish ? 'This price is firm and final between the parties; no additional costs will be added to the agreed amount.' : 'Este precio es cerrado y definitivo entre las partes; no se agregarán costos adicionales al monto pactado.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.6, fontStyle: 'bold', lineHeight: 14.6, maxLines: 2 });
      pdf.setTextColor(15, 23, 42);
      y += 10;
    }

    if (isSale) {
      y = closingCostsBox(pdf, values.amountNumber, x, y, width, language);
      y = pageBreakIfNeeded(pdf, y, 700);
    }

    if (!isSale) {
      y = paragraph(pdf, (isEnglish ? 'Offered rental term: ' : 'Plazo de alquiler ofrecido: ') + values.rentalTerm + '.', x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.2, maxLines: 3 });
      y += 8;
      y = paragraph(pdf, (isEnglish ? 'Conditions or requests to the property owner: ' : 'Condiciones o solicitudes al propietario: ') + values.ownerConditions, x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.8, maxLines: 4 });
      y += 14;
    }
    if (isSale) {
      var paymentText = deProp
        ? (isEnglish
            ? 'Required payment method: ' + translatedPaymentMethod(values.paymentMethod) + '. ' + values.paymentDetails
            : 'Forma de pago requerida: ' + values.paymentMethod + '. ' + values.paymentDetails)
        : (isEnglish
            ? 'Payment method: ' + translatedPaymentMethod(values.paymentMethod) + '. ' + values.paymentDetails
            : 'Forma de pago: ' + values.paymentMethod + '. ' + values.paymentDetails);
      var paymentLead = deProp
        ? (isEnglish ? 'The payment shall be made as follows: ' : 'El pago deberá realizarse de la siguiente manera: ')
        : (isEnglish ? 'The funds will be delivered as follows: ' : 'Los fondos serán entregados de la siguiente manera: ');
      y = paragraph(pdf, paymentLead + paymentText, x, y, width, { fontSize: 11.2, minFontSize: 9.6, lineHeight: 15.6, maxLines: 7 });
      y += 14;
    }
    y = pageBreakIfNeeded(pdf, y, 700);

    if (values.includedItems && values.includedItems.length) {
      y = paragraph(pdf,
        deProp
          ? (isEnglish ? 'The owner includes the following items together with the property:' : 'El propietario incluye los siguientes bienes junto con el inmueble:')
          : (isEnglish ? 'This offer includes the following items together with the property:' : 'Esta oferta incluye los siguientes bienes junto con el inmueble:'),
        x, y, width, { fontSize: 11, minFontSize: 9.8, lineHeight: 15, maxLines: 2 });
      y += 4;
      values.includedItems.forEach(function (it) {
        y = paragraph(pdf, '• ' + it, x + 10, y, width - 10, { fontSize: 10.4, minFontSize: 9.2, lineHeight: 13.8, maxLines: 2 });
        y = pageBreakIfNeeded(pdf, y, 760);
      });
      y += 10;
    }

    if (values.additionalNotes) {
      y = paragraph(pdf,
        (isEnglish ? 'Additional notes: ' : 'Notas adicionales: ') + values.additionalNotes,
        x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.8, maxLines: 5 });
      y += 14;
    }
    y = pageBreakIfNeeded(pdf, y, 700);

    // Condiciones propias de la oferta del propietario: hasta cuándo sostiene
    // el precio y que seguir publicando el inmueble no lo contradice.
    if (deProp && values.validityLong) {
      pdf.setTextColor(11, 45, 92);
      y = paragraph(pdf,
        isEnglish
          ? 'This offer is valid until ' + values.validityLong.en + ', after which it expires without any further formality.'
          : 'Esta oferta es válida hasta el ' + values.validityLong.es + ', fecha después de la cual queda sin efecto sin necesidad de trámite alguno.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.6, fontStyle: 'bold', lineHeight: 14.6, maxLines: 3 });
      pdf.setTextColor(15, 23, 42);
      y += 10;
    }
    if (deProp && values.subjectPriorSale) {
      y = paragraph(pdf,
        isEnglish
          ? 'This offer is subject to prior sale. Acceptance of an offer does not suspend the advertising or marketing of the property, which will continue until an effective reservation deposit has been made in favor of the owner. Until that deposit exists, the owner may receive and accept other offers.'
          : 'Esta oferta queda sujeta a venta previa. La aceptación de una oferta no implica la suspensión de la publicidad ni de la promoción del inmueble, las cuales continuarán hasta que exista una reserva efectiva depositada a favor del propietario. Mientras no exista dicho depósito, el propietario podrá recibir y aceptar otras ofertas.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.6, maxLines: 6 });
      y += 12;
    }
    y = pageBreakIfNeeded(pdf, y, 700);

    y = paragraph(pdf,
      deProp
        ? (isEnglish
            ? 'I also expressly authorize GUERRERO PROPERTIES to deliver this offer to the party named above in order to receive a response accepting or rejecting it. GUERRERO PROPERTIES acts solely as an intermediary and is not empowered to accept offers, modify their conditions, or sign contracts on my behalf.'
            : 'Así mismo, autorizo expresamente a GUERRERO PROPERTIES para que entregue la presente oferta a la parte antes indicada, a efectos de recibir respuesta de aceptación o rechazo. GUERRERO PROPERTIES actúa únicamente como intermediario y no está facultada para aceptar ofertas, modificar sus condiciones ni firmar contratos en mi nombre.')
        : (isEnglish
            ? 'I also expressly authorize GUERRERO PROPERTIES to notify the owner of the property of this offer in order to receive a response accepting or rejecting it.'
            : 'Así mismo, autorizo expresamente a GUERRERO PROPERTIES para que notifique al propietario de dicho inmueble la presente oferta, a efectos de recibir respuesta de aceptación o rechazo.'),
      x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.4, maxLines: 6 });
    y += 20;

    // El bloque de fecha + firma mide ~170pt. Si no entra completo en lo que
    // queda de página, se pasa entero a la siguiente. Antes la firma estaba
    // clavada al fondo (Math.min(710, ...)), así que cuando el texto terminaba
    // arriba quedaba un vacío enorme entre la fecha y la firma.
    var ALTO_BLOQUE_FIRMA = 170;
    if (y + ALTO_BLOQUE_FIRMA > pageH - 52) { pdf.addPage(); y = 80; }

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.2);
    pdf.text(isEnglish ? values.issueCity + ', on ' + values.signDateLongEnglish + '.' : values.issueCity + ', a ' + values.signDateLong + '.', x, y);

    // Dos columnas del mismo ancho repartidas sobre el ancho real del
    // contenido: a la izquierda la firma, a la derecha fecha y hora.
    var signatureTop = y + 90;
    var colW = (width - 40) / 2;
    var rightX = x + colW + 40;
    pdf.setDrawColor(110, 122, 144);
    pdf.line(x, signatureTop, x + colW, signatureTop);
    if (values.signatureData) {
      try {
        var sigProps = pdf.getImageProperties(values.signatureData);
        var sigRatio = sigProps.width / sigProps.height;
        var sw = Math.min(colW - 20, 58 * sigRatio);
        var sh = sw / sigRatio;
        if (sh > 58) { sh = 58; sw = sh * sigRatio; }
        pdf.addImage(values.signatureData, 'PNG', x + (colW - sw) / 2, signatureTop - sh - 10, sw, sh);
      } catch (e) {}
    }
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.1);
    pdf.text(isEnglish ? 'SIGNATURE:' : 'FIRMA:', x, signatureTop + 20);
    pdf.text(isEnglish ? 'NAME:' : 'NOMBRE:', x, signatureTop + 42);
    pdf.text((isEnglish && values.documentType === 'PASAPORTE' ? 'PASSPORT' : values.documentType.toUpperCase()) + ':', x, signatureTop + 64);
    pdf.text(isEnglish ? 'DATE:' : 'FECHA:', rightX, signatureTop + 20);
    pdf.text(isEnglish ? 'TIME:' : 'HORA:', rightX, signatureTop + 42);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.1);
    // 70pt alcanzaba para "DUI:"/"NIT:" pero no para "PASAPORTE:", que es más
    // ancha y quedaba pegada al número.
    pdf.text(values.fullName, x + 86, signatureTop + 42);
    pdf.text(values.documentNumber, x + 86, signatureTop + 64);
    pdf.text(values.signDate, rightX + 56, signatureTop + 20);
    pdf.text(values.signTime, rightX + 56, signatureTop + 42);

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
    ['full_name', 'property_municipality', 'property_department', 'property_address', 'amount_number', 'offer_type', 'document_type']
      .forEach(function (n) { if (form.elements[n]) form.elements[n].classList.remove('is-invalid'); });
    documentNumber.classList.remove('is-invalid');
    recipientName.classList.remove('is-invalid');
    paymentMethod.classList.remove('is-invalid');
    paymentDetails.classList.remove('is-invalid');
    rentalTerm.classList.remove('is-invalid');
    ownerConditions.classList.remove('is-invalid');
    englishConsent.classList.remove('is-invalid');

    var esProp = delPropietario();
    if (!offerType.value) bad(offerType, bilingue('Seleccioná venta o alquiler.', 'Select sale or rental.'));
    if (!val('full_name')) bad(form.elements['full_name'], esProp
      ? bilingue('Ingresá el nombre completo del propietario.', "Enter the owner's full name.")
      : bilingue('Ingresá el nombre completo.', 'Enter your full name.'));
    if (esProp && !val('recipient_name')) bad(recipientName, bilingue('Indicá a quién va dirigida la oferta (nombre del comprador).', "Enter who the offer is addressed to (buyer's name)."));
    if (!documentType.value) bad(documentType, bilingue('Seleccioná el tipo de documento.', 'Select the ID type.'));
    if (!validDocumentNumber()) bad(documentNumber, bilingue('Número de documento inválido para el tipo elegido.', 'Invalid ID number for the selected type.'));
    if (!val('property_municipality')) bad(form.elements['property_municipality'], bilingue('Ingresá el municipio del inmueble.', "Enter the property's municipality."));
    if (!val('property_department')) bad(form.elements['property_department'], bilingue('Ingresá el departamento del inmueble.', "Enter the property's state or department."));
    if (!val('property_address')) bad(form.elements['property_address'], bilingue('Ingresá la dirección del inmueble.', "Enter the property's address."));

    var amount = Number(val('amount_number'));
    if (!isFinite(amount) || amount <= 0) bad(amountNumber, bilingue('Ingresá un monto válido en dólares.', 'Enter a valid amount in US dollars.'));
    else if (!val('amount_words')) bad(amountNumber, bilingue('No se pudo generar el monto en letras.', 'The amount in words could not be generated.'));

    var isSale = offerType.value === 'VENTA';
    var isRental = offerType.value === 'ALQUILER';
    if (isSale) {
      if (!['Contado', 'Crédito', 'Mixto'].includes(paymentMethod.value)) bad(paymentMethod, bilingue('Seleccioná la forma de pago.', 'Select the payment method.'));
      if (!val('payment_details')) bad(paymentDetails, bilingue('Detallá la entrega de fondos.', 'Describe how the funds will be delivered.'));
    }
    if (isRental) {
      if (!val('rental_term')) bad(rentalTerm, bilingue('Indicá el plazo de alquiler.', 'Enter the rental term.'));
      if (!val('owner_conditions')) bad(ownerConditions, bilingue('Indicá las condiciones o solicitudes al propietario.', 'Enter the conditions or requests to the owner.'));
    }
    if (documentLanguage.value === 'en' && !englishConsent.checked) bad(englishConsent, bilingue('Tenés que aceptar que el PDF incluye la versión en inglés y su anexo en español.', 'You must accept that the PDF includes the English version and its Spanish annex.'));
    if (!hasSignature || !signatureData) errors.push(esProp
      ? bilingue('La firma del propietario es obligatoria.', "The owner's signature is required.")
      : bilingue('La firma del cliente es obligatoria.', "The client's signature is required."));

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    var vigencia = esProp ? fechaLarga(offerValidity.value) : null;
    return {
      documentLanguage: documentLanguage.value,
      offerType: offerType.value,
      issuer: esProp ? 'PROPIETARIO' : 'COMPRADOR',
      recipientName: esProp ? val('recipient_name') : '',
      validityLong: vigencia,
      validityIso: vigencia ? vigencia.iso : null,
      subjectPriorSale: esProp && offerType.value === 'VENTA' && !!subjectPriorSale.checked,
      issueCity: val('issue_city') || 'San Salvador',
      fullName: val('full_name'),
      documentType: documentType.value,
      documentNumber: val('document_number'),
      propertyMunicipality: val('property_municipality'),
      propertyDepartment: val('property_department'),
      propertyAddress: val('property_address'),
      amountNumber: amount,
      listPrice: Number(val('list_price')) || 0,
      amountWords: val('amount_words'),
      amountWordsEnglish: val('amount_words_english'),
      rentalTerm: val('rental_term'),
      ownerConditions: val('owner_conditions'),
      paymentMethod: paymentMethod.value,
      paymentDetails: val('payment_details'),
      additionalNotes: val('additional_notes'),
      firmPrice: !!firmPrice.checked,
      includedItems: collectIncludedItems(),
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

  // Archiva la carta en su propia sección del panel (no crea lead: el
  // pipeline de leads es para interesados que llegan del sitio). Pasa por
  // /api/lead, que escribe con la clave service_role del lado del servidor.
  function registrarEnCRM(v, pdfBlob) {
    (pdfBlob ? blobToBase64(pdfBlob) : Promise.resolve(null)).then(function (pdfBase64) {
      return fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_base64: pdfBase64 || undefined,
          carta: {
            // En la oferta de venta el que firma es el propietario y el
            // cliente es el destinatario, así que las partes van cruzadas.
            tipo: v.issuer === 'PROPIETARIO' ? 'oferta_venta' : 'oferta',
            transaccion: v.offerType,
            idioma: v.documentLanguage,
            cliente_nombre: v.issuer === 'PROPIETARIO' ? (v.recipientName || null) : v.fullName,
            cliente_documento: v.issuer === 'PROPIETARIO' ? null : v.documentType + ' ' + v.documentNumber,
            propietario_nombre: v.issuer === 'PROPIETARIO' ? v.fullName : null,
            propietario_documento: v.issuer === 'PROPIETARIO' ? v.documentType + ' ' + v.documentNumber : null,
            vigencia: v.validityIso,
            sujeto_venta_previa: v.subjectPriorSale,
            propiedad_municipio: v.propertyMunicipality,
            propiedad_departamento: v.propertyDepartment,
            propiedad_direccion: v.propertyAddress,
            monto: v.amountNumber,
            precio_lista: v.listPrice || null,
            forma_pago: v.paymentMethod || null,
            detalle_pago: v.paymentDetails || null,
            plazo: v.rentalTerm || null,
            bienes: v.includedItems,
            gastos_cierre: v.offerType === 'VENTA' ? closingCosts(v.amountNumber) : null,
            notas: v.additionalNotes || null,
          },
        }),
      });
    }).catch(function (e) { console.error('registro carta de oferta:', e); });
  }

  // ---------- generar ----------
  function generar() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showErrors([bilingue('No se pudo cargar el generador de PDF. Recargá la página e intentá de nuevo.', 'The PDF generator could not be loaded. Reload the page and try again.')]);
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
      var nombreArchivo = values.issuer === 'PROPIETARIO' ? (values.recipientName || values.fullName) : values.fullName;
      var slug = (nombreArchivo || 'cliente').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'cliente';
      var pdfBlob = pdf.output('blob');
      pdf.save((values.issuer === 'PROPIETARIO' ? 'carta-oferta-venta-' : 'carta-oferta-') + slug + '.pdf');
      registrarEnCRM(values, pdfBlob);
    } catch (ex) {
      console.error('PDF carta de oferta:', ex);
      showErrors(['No se pudo generar el PDF: ' + (ex.message || ex)]);
    } finally {
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      btnTxt.textContent = textoBoton();
      btnTxtEn.textContent = '/ Generate letter';
    }
  }

  // ---------- bienes incluidos (checklist a partir del borrador) ----------
  function renderInventoryItems(items) {
    inventoryItemsWrap.innerHTML = '';
    items = items || [];
    inventoryCard.classList.toggle('d-none', items.length === 0);
    items.forEach(function (it) {
      var row = document.createElement('label');
      row.className = 'co-inventory-item';
      var cant = it.cantidad ? ' (' + it.cantidad + ')' : '';
      var label = ((it.item || it.descripcion || '') + cant).trim();
      row.innerHTML =
        '<input type="checkbox" checked>' +
        '<span>' + label +
        (it.item && it.descripcion ? '<span class="co-inventory-desc">' + it.descripcion + '</span>' : '') +
        '</span>';
      row.querySelector('input').dataset.label = label;
      inventoryItemsWrap.appendChild(row);
    });
  }
  function collectIncludedItems() {
    var boxes = inventoryItemsWrap.querySelectorAll('input[type=checkbox]');
    var out = [];
    boxes.forEach(function (cb) {
      if (cb.checked && cb.dataset.label) out.push(cb.dataset.label);
    });
    return out;
  }

  // ---------- borradores (lectura pública, sin login -- los crea Walter
  // desde el panel; esta página solo lee para precargar) ----------
  function aplicarBorrador(campos) {
    if (campos.tipo_oferta) { offerType.value = campos.tipo_oferta; toggleOfferType(); }
    if (campos.ciudad_emision) el('issue_city').value = campos.ciudad_emision;
    if (campos.propiedad_municipio) el('property_municipality').value = campos.propiedad_municipio;
    if (campos.propiedad_departamento) el('property_department').value = campos.propiedad_departamento;
    if (campos.propiedad_direccion) el('property_address').value = campos.propiedad_direccion;
    listPrice.value = campos.precio_lista != null ? campos.precio_lista : '';
    rentalTerm.value = campos.rental_term || '';
    ownerConditions.value = campos.owner_conditions || '';
    if (campos.payment_method) paymentMethod.value = campos.payment_method;
    paymentDetails.value = campos.payment_details || '';
    additionalNotes.value = campos.notas_adicionales || '';
    renderInventoryItems(campos.inventario || []);
  }
  function cargarBorradores() {
    var cfg = window.SITE_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    fetch(cfg.SUPABASE_URL + '/rest/v1/oferta_borradores?select=*&order=created_at.desc', {
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
        else renderInventoryItems([]);
      });
      // Link que manda el agente ya con el borrador aplicado: el cliente solo
      // pone sus datos, el monto y firma.
      var pedido = new URLSearchParams(window.location.search).get('borrador');
      if (pedido) {
        var b = borradores.find(function (x) { return x.id === pedido; });
        if (b) {
          borradorSelect.value = b.id;
          aplicarBorrador(b);
          // Lo que el agente dejó explícito en el link le gana al borrador.
          prefill();
          aplicarSeleccionItems();
          toggleLetterIssuer();
          toggleOfferType();
          toggleDocumentLanguage();
          syncAmountWords();
        }
      }
    }).catch(function () {});
  }

  // ---------- prefill por querystring ----------
  // Se corre dos veces: al cargar, y otra vez después de aplicar el borrador,
  // para que lo que el agente dejó explícito en el link le gane al borrador.
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    var tipo = (q.get('tipo') || '').toLowerCase();
    if (tipo === 'venta') offerType.value = 'VENTA';
    else if (tipo === 'alquiler') offerType.value = 'ALQUILER';
    var emisor = (q.get('emisor') || '').toUpperCase();
    if (emisor === 'PROPIETARIO' || emisor === 'COMPRADOR') letterIssuer.value = emisor;
    if (q.get('dirigidaa')) recipientName.value = q.get('dirigidaa');
    if (q.get('vigencia')) offerValidity.value = q.get('vigencia');
    if (q.get('previa')) subjectPriorSale.checked = q.get('previa') === '1';
    if (q.get('idioma')) documentLanguage.value = q.get('idioma');
    if (q.get('municipio')) el('property_municipality').value = q.get('municipio');
    if (q.get('departamento')) el('property_department').value = q.get('departamento');
    if (q.get('direccion')) el('property_address').value = q.get('direccion');
    if (q.get('ciudad')) el('issue_city').value = q.get('ciudad');
    if (q.get('pago')) paymentMethod.value = q.get('pago');
    if (q.get('detallepago')) paymentDetails.value = q.get('detallepago');
    if (q.get('plazo')) rentalTerm.value = q.get('plazo');
    if (q.get('condiciones')) ownerConditions.value = q.get('condiciones');
    if (q.get('notas')) additionalNotes.value = q.get('notas');
    if (q.get('cerrado')) firmPrice.checked = q.get('cerrado') === '1';
    var lista = (q.get('lista') || '').replace(/[^0-9.]/g, '');
    if (lista) listPrice.value = lista;
    var monto = (q.get('monto') || '').replace(/[^0-9.]/g, '');
    if (monto) amountNumber.value = monto;
  }

  // ---------- modo agente: preparar la carta y generar el link del cliente ----------
  function aplicarSeleccionItems() {
    var crudo = new URLSearchParams(window.location.search).get('items');
    if (crudo === null) return;
    var marcados = crudo.split(',').filter(function (s) { return s !== ''; });
    inventoryItemsWrap.querySelectorAll('input[type=checkbox]').forEach(function (cb, i) {
      cb.checked = marcados.indexOf(String(i)) !== -1;
    });
  }
  function construirLinkCliente() {
    var base = ((window.SITE_CONFIG || {}).SITE_URL || (location.origin + location.pathname.replace(/[^/]*$/, ''))).replace(/\/$/, '');
    var p = new URLSearchParams();
    if (borradorSelect.value) p.set('borrador', borradorSelect.value);
    if (offerType.value) p.set('tipo', offerType.value.toLowerCase());
    p.set('emisor', letterIssuer.value);
    if (delPropietario()) {
      if (recipientName.value.trim()) p.set('dirigidaa', recipientName.value.trim());
      if (offerValidity.value) p.set('vigencia', offerValidity.value);
      p.set('previa', subjectPriorSale.checked ? '1' : '0');
    }
    p.set('idioma', documentLanguage.value);
    if (el('issue_city').value.trim()) p.set('ciudad', el('issue_city').value.trim());
    if (el('property_municipality').value.trim()) p.set('municipio', el('property_municipality').value.trim());
    if (el('property_department').value.trim()) p.set('departamento', el('property_department').value.trim());
    if (el('property_address').value.trim()) p.set('direccion', el('property_address').value.trim());
    if (listPrice.value) p.set('lista', listPrice.value);
    if (amountNumber.value) p.set('monto', amountNumber.value);
    if (paymentMethod.value) p.set('pago', paymentMethod.value);
    if (paymentDetails.value.trim()) p.set('detallepago', paymentDetails.value.trim());
    if (rentalTerm.value.trim()) p.set('plazo', rentalTerm.value.trim());
    if (ownerConditions.value.trim()) p.set('condiciones', ownerConditions.value.trim());
    if (additionalNotes.value.trim()) p.set('notas', additionalNotes.value.trim());
    p.set('cerrado', firmPrice.checked ? '1' : '0');
    var marcados = [];
    inventoryItemsWrap.querySelectorAll('input[type=checkbox]').forEach(function (cb, i) {
      if (cb.checked) marcados.push(i);
    });
    if (inventoryItemsWrap.querySelectorAll('input[type=checkbox]').length) p.set('items', marcados.join(','));
    return base + '/carta-oferta.html?' + p.toString();
  }
  function modoAgente() {
    if (new URLSearchParams(window.location.search).get('agente') !== '1') return;
    el('agenteCard').classList.remove('d-none');
    function copiar(url, aviso) {
      var salida = el('agenteLink');
      salida.value = url;
      salida.classList.remove('d-none');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(
          function () { el('agenteAviso').textContent = aviso; },
          function () { el('agenteAviso').textContent = 'No se pudo copiar solo. Copiá el link del recuadro de abajo.'; });
      } else {
        el('agenteAviso').textContent = 'Copiá el link del recuadro de abajo.';
      }
      salida.select();
    }
    el('copiarLinkRevision').addEventListener('click', function () {
      copiar(construirLinkCliente() + '&revision=1',
        'Link de revisión copiado. Mandáselo primero al propietario: lo ve completo, de solo lectura, sin poder firmar ni modificar.');
    });
    el('copiarLinkCliente').addEventListener('click', function () {
      copiar(construirLinkCliente(),
        'Link del cliente copiado. Mandáselo recién cuando el propietario haya dado el visto bueno: el cliente solo pone su nombre, su documento y firma.');
    });
  }

  // ---------- modo revisión: el propietario ve la oferta, no la firma ----------
  function modoRevision() {
    if (new URLSearchParams(window.location.search).get('revision') !== '1') return;
    document.body.classList.add('co-revision');
    el('revisionBanner').classList.remove('d-none');
    ['agenteCard', 'borradorCard', 'clienteCard', 'firmaCard'].forEach(function (id) {
      if (el(id)) el(id).classList.add('d-none');
    });
    generateBtn.classList.add('d-none');
  }

  // ---------- init ----------
  documentLanguage.addEventListener('change', toggleDocumentLanguage);
  letterIssuer.addEventListener('change', function () { toggleLetterIssuer(); toggleOfferType(); });
  offerType.addEventListener('change', toggleOfferType);
  documentType.addEventListener('change', function () { normalizeDocumentNumber(); });
  documentNumber.addEventListener('blur', normalizeDocumentNumber);
  amountNumber.addEventListener('input', function () { syncAmountWords(); refreshClosingCosts(); });
  generateBtn.addEventListener('click', generar);

  // Antes que nada: guardar los pares español/inglés de todos los rótulos tal
  // como vienen en el HTML, porque toggleLetterIssuer reescribe algunos.
  capturarBilingues();
  prefill();
  toggleLetterIssuer();
  toggleOfferType();
  toggleDocumentLanguage();
  refreshOfferDate();
  syncAmountWords();
  initCanvas();
  modoAgente();
  modoRevision();
  cargarBorradores();
  setInterval(refreshOfferDate, 60000);
})();
