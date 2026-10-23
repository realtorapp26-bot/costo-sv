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
  var issuerRole = el('issuer_role');
  var issuerRoleWrap = el('issuerRoleWrap');
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
  // Título del listado. Por defecto "Bienes incluidos", pero un borrador puede
  // cambiarlo (p. ej. "Lo que incluye Golden Lake") para listar generalidades
  // de un proyecto y no solo muebles.
  var itemsTitle = el('items_title');
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
  // ASESOR: carta de presentación "a quien interese" que firma el agente.
  // No hay partes ni negociación: describe lo que ofrece un proyecto y vale
  // como constancia informativa, no como oferta vinculante.
  function delAsesor() { return letterIssuer.value === 'ASESOR'; }

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
    if (delAsesor()) return 'Generar carta de presentación (PDF)';
    return delPropietario() ? 'Generar carta de oferta de venta (PDF)' : 'Generar carta de oferta (PDF)';
  }
  function textoBotonEn() {
    if (delAsesor()) return 'Generate letter of introduction (PDF)';
    return delPropietario() ? 'Generate offer to sell (PDF)' : 'Generate offer letter (PDF)';
  }
  function toggleLetterIssuer() {
    var esProp = delPropietario();
    var esAsesor = delAsesor();
    var isSale = offerType.value !== 'ALQUILER';
    recipientWrap.classList.toggle('d-none', !esProp && !esAsesor);
    issuerRoleWrap.classList.toggle('d-none', !esAsesor);
    validityWrap.classList.toggle('d-none', !esProp && !esAsesor);
    priorSaleWrap.classList.toggle('d-none', !esProp || !isSale);
    if ((esProp || esAsesor) && !offerValidity.value) offerValidity.value = isoHoyMas(15);
    if (esAsesor && !recipientName.value.trim()) recipientName.value = 'A quien interese';

    el('headerTitle').textContent = ordenIngles()
      ? (esAsesor ? 'To Whom It May Concern' : esProp ? 'Offer to Sell' : 'Offer Letter')
      : (esAsesor ? 'Carta de Presentación' : esProp ? 'Carta de Oferta de Venta' : 'Carta de Oferta');
    setBilingue('headerSubtitle',
      esAsesor ? 'Constancia del asesor sobre lo que ofrece el proyecto'
        : esProp ? 'Oferta del propietario al comprador' : 'Oferta de compra o alquiler de inmueble',
      esAsesor ? 'Agent\'s statement of what the project offers'
        : esProp ? 'Owner\'s offer to the buyer' : 'Offer to purchase or rent a property');
    setBilingue('clienteCardTitle',
      esAsesor ? 'Quien firma' : esProp ? 'Partes' : 'Datos del cliente',
      esAsesor ? 'Signed by' : esProp ? 'Parties' : 'Client details');
    el('clienteCardHint').classList.toggle('d-none', !esProp && !esAsesor);
    if (esAsesor) {
      setBilingue('clienteCardHint',
        'Esta carta la firmás vos como asesor. No tiene comprador ni vendedor: describe lo que ofrece el proyecto.',
        'You sign this letter as the agent. It has no buyer or seller: it states what the project offers.');
    } else if (esProp) {
      setBilingue('clienteCardHint',
        'Quien firma esta carta es el propietario. El comprador solo la recibe.',
        'The owner is the one signing this letter. The buyer only receives it.');
    }
    setBilingue('recipientLabel',
      esAsesor ? 'Dirigida a' : 'Dirigida a (comprador)',
      esAsesor ? 'Addressed to' : 'Addressed to (buyer)');
    setBilingue('recipientHelp',
      esAsesor
        ? 'Dejalo en "A quien interese" o poné el nombre de tu cliente.'
        : 'Nombre de la persona a quien el propietario le ofrece el inmueble.',
      esAsesor
        ? 'Leave it as "To whom it may concern" or enter your client\'s name.'
        : 'Name of the person the owner is offering the property to.');
    setBilingue('fullNameLabel',
      esAsesor ? 'Tu nombre completo' : esProp ? 'Nombre completo del propietario' : 'Nombre completo',
      esAsesor ? 'Your full name' : esProp ? 'Owner\'s full name' : 'Full name');
    setBilingue('amountNumberLabel',
      esAsesor ? 'Precio de referencia (US$, opcional)'
        : esProp ? 'Precio ofrecido al comprador (US$)' : 'Monto ofrecido (US$)',
      esAsesor ? 'Reference price (US$, optional)'
        : esProp ? 'Price offered to the buyer' : 'Offered amount');
    setBilingue('inventoryHint',
      esAsesor
        ? 'Según el borrador elegido. Desmarcá lo que no quieras mencionar en la carta.'
        : esProp
        ? 'Según el borrador elegido. Desmarcá lo que no vaya incluido en la venta.'
        : 'Según el borrador elegido. Desmarcá lo que no quieras incluir en tu oferta.',
      esAsesor
        ? 'From the selected draft. Uncheck anything you don\'t want to mention in the letter.'
        : esProp
        ? 'From the selected draft. Uncheck anything not included in the sale.'
        : 'From the selected draft. Uncheck anything you don\'t want included in your offer.');
    setBilingue('firmaHint',
      esAsesor
        ? 'Tu firma. La fecha y hora se agregan automáticamente.'
        : esProp
        ? 'Firma del propietario. La fecha y hora se agregan automáticamente.'
        : 'Firma del cliente. La fecha y hora se agregan automáticamente.',
      esAsesor
        ? 'Your signature. The date and time are added automatically.'
        : esProp
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

    // El modo agente lo usa Walter: queda siempre en español. En la carta de
    // presentación no hay link que mandar (la firma él), así que los botones
    // se esconden y queda solo el selector de borrador.
    if (el('agenteTitle')) {
      el('agenteTitle').textContent = esAsesor
        ? 'Zona del agente — carta de presentación'
        : esProp
        ? 'Zona del agente — oferta de venta'
        : 'Zona del agente — oferta de compra';
      el('agenteHint').textContent = esAsesor
        ? 'Esto solo lo ves vos. Elegí el proyecto, revisá los puntos que querés mencionar, firmá abajo y descargá el PDF para mandárselo a tu cliente.'
        : esProp
        ? 'Esto solo lo ves vos. Elegí el borrador, completá abajo el trato (a quién va dirigida, vigencia, bienes) y copiá el link: al propietario le llega todo puesto de solo lectura y solo elige el monto, revisa los bienes y firma.'
        : 'Esto solo lo ves vos. Elegí el borrador, completá abajo todo lo que quieras dejar listo (inmueble, precio, forma de pago, bienes) y copiá el link: al cliente le llega todo puesto y solo pone lo suyo y firma.';
      el('copiarLinkRevision').parentElement.classList.toggle('d-none', esAsesor);
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
  // Escala global del cuerpo del documento. buildPdf la va bajando y vuelve a
  // armar la carta hasta que entre en el máximo de páginas pedido, igual que
  // uno ajustaría a mano los tamaños hasta que cierre. El encabezado y el
  // bloque de firma quedan fuera: tienen que seguir legibles.
  var ESCALA = 1;
  function esc(n) { return n * ESCALA; }

  function fitText(pdf, text, width, opts) {
    opts = opts || {};
    var fontSize = esc(opts.fontSize || 11.4);
    var minFontSize = esc(opts.minFontSize || Math.max(9.2, (opts.fontSize || 11.4) - 2.2));
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
    return { lines: lines, fontSize: fontSize, lineHeight: opts.lineHeight ? esc(opts.lineHeight) : (fontSize * 1.42) };
  }
  function paragraph(pdf, text, x, y, width, opts) {
    var fit = fitText(pdf, text, width, opts || {});
    pdf.setFont('helvetica', (opts && opts.fontStyle) || 'normal');
    pdf.setFontSize(fit.fontSize);
    pdf.text(fit.lines, x, y);
    return y + (fit.lines.length * fit.lineHeight);
  }
  // Igual que paragraph, pero mide primero cuánto va a ocupar y solo salta de
  // página si de verdad no entra. Los cortes por umbral fijo (y > 700) dejaban
  // hasta 240pt en blanco al pie porque no sabían qué venía después.
  var PIE_PAGINA = 790;
  function paragraphFit(pdf, text, x, y, width, opts) {
    var fit = fitText(pdf, text, width, opts || {});
    if (y + fit.lines.length * fit.lineHeight > PIE_PAGINA) { pdf.addPage(); y = 80; }
    return paragraph(pdf, text, x, y, width, opts);
  }
  function fieldRow(pdf, index, label, value, x, y, width, maxLines) {
    var fit = fitText(pdf, value || '—', width - 48, { fontSize: 11.4, minFontSize: 9.6, maxLines: maxLines || 2 });
    var dynamicHeight = Math.max(esc(38), esc(22) + fit.lines.length * (fit.lineHeight));
    pdf.setFillColor(250, 252, 255);
    pdf.setDrawColor(229, 235, 243);
    pdf.roundedRect(x, y - esc(14), width, dynamicHeight, 9, 9, 'FD');
    pdf.setTextColor(229, 57, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.2);
    pdf.text(String(index) + '.', x + 14, y + 2);
    pdf.setTextColor(11, 45, 92);
    pdf.text(label, x + 34, y + 2);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fit.fontSize);
    pdf.text(fit.lines, x + 34, y + esc(18));
    return y + dynamicHeight + esc(7);
  }
  function amountBox(pdf, values, x, y, width, title, language) {
    var w = language === 'en' ? values.amountWordsEnglish : values.amountWords;
    // En la carta de presentación no hay oferta: el monto es de referencia.
    var etiqueta = values.issuer === 'ASESOR'
      ? (language === 'en' ? 'Amount: (IN WORDS) ' : 'Monto: (LETRAS) ')
      : (language === 'en' ? 'Offered amount: (IN WORDS) ' : 'Monto ofrecido: (LETRAS) ');
    var text = etiqueta + w + ' (US$ ' + formatMoney(values.amountNumber) + ')';
    var fit = fitText(pdf, text, width - 28, { fontSize: 11.7, minFontSize: 9.8, maxLines: values.offerType === 'VENTA' ? 5 : 4 });
    // 30 = título arriba + aire bajo la última línea (si no, con montos de
    // tres líneas el texto se sale por el borde de la caja).
    var boxHeight = Math.max(esc(64), esc(30) + fit.lines.length * fit.lineHeight);
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
    pdf.text(fit.lines, x + 14, y + esc(38));
    return y + boxHeight + esc(12);
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
    var rowHeight = esc(18);
    var boxHeight = esc(30) + rows.length * rowHeight;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(219, 228, 239);
    pdf.roundedRect(x, y, width, boxHeight, 14, 14, 'FD');
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.6);
    pdf.text(isEnglish ? 'Estimated closing costs, payable by the buyer (not included in the price above)' : 'Gastos de cierre estimados, a cargo del comprador (no incluidos en el precio anterior)', x + 14, y + 18);
    var rowY = y + esc(34);
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
    return y + boxHeight + esc(12);
  }
  function addHeader(pdf, documentTitle, subtitle) {
    var pageW = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(229, 57, 53);
    pdf.rect(0, 0, pageW * 0.34, 14, 'F');
    pdf.setFillColor(11, 45, 92);
    pdf.rect(pageW * 0.34, 0, pageW * 0.66, 14, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(30, 22, pageW - 60, 92, 20, 20, 'F');
    pdf.setDrawColor(225, 232, 240);
    pdf.roundedRect(30, 22, pageW - 60, 92, 20, 20, 'S');
    pdf.setTextColor(229, 57, 53);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Guerrero Properties', 50, 48);
    pdf.setTextColor(11, 45, 92);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(documentTitle, 50, 74);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12.8);
    pdf.text(subtitle, 50, 95);
    pdf.setDrawColor(229, 57, 53);
    pdf.setLineWidth(1.2);
    pdf.line(50, 104, 188, 104);
    return 136;
  }
  function translatedPaymentMethod(v) {
    return ({ 'Contado': 'Cash', 'Crédito': 'Financing', 'Mixto': 'Mixed' })[v] || v;
  }
  // Corte de página para bloques de alto conocido (las cajas), que no se
  // pueden medir con fitText. Los textos usan paragraphFit, que mide primero.
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
    var deAsesor = values.issuer === 'ASESOR';
    var documentTitle = deAsesor
      ? (isEnglish ? 'TO WHOM IT MAY CONCERN' : 'A QUIEN INTERESE')
      : deProp
      ? (isEnglish ? (isSale ? 'OFFER TO SELL' : 'OFFER TO LEASE') : (isSale ? 'CARTA DE OFERTA DE VENTA' : 'CARTA DE OFERTA DE ALQUILER'))
      : (isEnglish ? 'OFFER LETTER' : 'CARTA DE OFERTA');
    var subtitle = deAsesor
      ? (isEnglish ? 'Letter of introduction issued by the real estate agent' : 'Carta de presentación emitida por el asesor inmobiliario')
      : deProp
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
      y += esc(8);
    }

    pdf.setTextColor(15, 23, 42);
    if ((deProp || deAsesor) && values.recipientName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.2);
      pdf.text((isEnglish ? 'Addressed to: ' : 'Dirigida a: ') + values.recipientName, x, y);
      pdf.setFont('helvetica', 'normal');
      y += esc(16);
    }

    var docEnIngles = values.documentType === 'PASAPORTE' ? 'passport' : values.documentType;
    var declaracion;
    if (deAsesor) {
      var cargo = values.issuerRole || (isEnglish ? 'real estate agent' : 'asesor inmobiliario');
      declaracion = isEnglish
        ? 'I, ' + values.fullName + ', holder of my ' + docEnIngles + ' number ' + values.documentNumber + ', acting as ' + cargo + ', hereby state that the property and the development described below offer the conditions set out in this letter.'
        : 'Yo, ' + values.fullName + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de ' + cargo + ', hago constar que el inmueble y el desarrollo que se describen a continuación ofrecen las condiciones detalladas en la presente carta.';
    } else if (deProp) {
      declaracion = isEnglish
        ? 'I, ' + values.fullName + ', holder of my ' + docEnIngles + ' number ' + values.documentNumber + ', acting as the owner of the property described below, hereby offer to ' + (isSale ? 'sell' : 'lease') + ' it to ' + (values.recipientName || 'the interested party') + '. The property has the following characteristics:'
        : 'Yo, ' + values.fullName + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de propietario del inmueble que se describe a continuación, ofrezco ' + (isSale ? 'en venta' : 'en alquiler') + ' dicho inmueble a ' + (values.recipientName || 'la parte interesada') + '. El inmueble cuenta con las siguientes características:';
    } else {
      declaracion = isEnglish
        ? 'I, ' + values.fullName + ', holder of my ' + docEnIngles + ' number ' + values.documentNumber + ', acting as the ' + (isSale ? 'buyer' : 'prospective tenant') + ', declare that I am interested in ' + (isSale ? 'purchasing' : 'renting') + ' the property with the following characteristics:'
        : 'Yo, ' + values.fullName + ', portador de mi ' + values.documentType + ' número ' + values.documentNumber + ', en mi calidad de ' + (isSale ? 'comprador' : 'cliente') + ', declaro que me encuentro interesado en ' + (isSale ? 'comprar' : 'alquilar') + ' el inmueble que cuenta con las siguientes características:';
    }
    y = paragraph(pdf, declaracion, x, y, width, { fontSize: 11.8, minFontSize: 10.2, lineHeight: 16.0, maxLines: 7 });
    y += esc(10);

    y = fieldRow(pdf, 1, isEnglish ? 'Municipality' : 'Municipio', values.propertyMunicipality, x, y, width, 2);
    y = fieldRow(pdf, 2, isEnglish ? 'State or department' : 'Departamento', values.propertyDepartment, x, y, width, 2);
    y = fieldRow(pdf, 3, isEnglish ? 'Property address' : 'Dirección del inmueble', values.propertyAddress, x, y, width, 3);

    y += esc(6);
    var amountLabel = deAsesor
      ? (isEnglish ? 'Reference price' : 'Precio de referencia')
      : deProp
      ? (isEnglish ? (isSale ? 'Offered sale price' : 'Offered rental price') : (isSale ? 'Precio de venta ofrecido' : 'Precio de alquiler ofrecido'))
      : (isEnglish ? (isSale ? 'Offered purchase price' : 'Offered rental price') : (isSale ? 'Precio de compra ofrecido' : 'Precio de alquiler ofrecido'));
    // En la carta de presentación el precio es opcional: si no se puso, no se
    // dibuja la caja del monto ni los gastos de cierre.
    var hayMonto = Number(values.amountNumber) > 0;
    if (hayMonto) y = amountBox(pdf, values, x, y, width, amountLabel, language);

    if (deAsesor && values.listPrice > 0) {
      var textoLista = isEnglish
        ? 'Project list price: US$ ' + formatMoney(values.listPrice) + '.' +
          (hayMonto && values.listPrice > values.amountNumber
            ? ' Current promotional price: US$ ' + formatMoney(values.amountNumber) + '.'
            : '')
        : 'Precio de lista del proyecto: US$ ' + formatMoney(values.listPrice) + '.' +
          (hayMonto && values.listPrice > values.amountNumber
            ? ' Precio promocional vigente: US$ ' + formatMoney(values.amountNumber) + '.'
            : '');
      y = paragraph(pdf, textoLista, x, y, width, { fontSize: 10.8, minFontSize: 9.6, lineHeight: 14.6, maxLines: 3 });
      y += esc(10);
    } else if (!deAsesor && values.listPrice > 0) {
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
      y += esc(10);
    }

    if (values.firmPrice) {
      pdf.setTextColor(11, 45, 92);
      y = paragraph(pdf,
        isEnglish ? 'This price is firm and final between the parties; no additional costs will be added to the agreed amount.' : 'Este precio es cerrado y definitivo entre las partes; no se agregarán costos adicionales al monto pactado.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.6, fontStyle: 'bold', lineHeight: 14.6, maxLines: 2 });
      pdf.setTextColor(15, 23, 42);
      y += esc(10);
    }

    // La caja de gastos de cierre mide ~150pt y no se puede medir con
    // fitText, así que acá sí se corta por umbral, antes de dibujarla.
    if (isSale && hayMonto) {
      y = pageBreakIfNeeded(pdf, y, PIE_PAGINA - 150);
      y = closingCostsBox(pdf, values.amountNumber, x, y, width, language);
    }

    if (!isSale) {
      y = paragraphFit(pdf, (isEnglish ? 'Offered rental term: ' : 'Plazo de alquiler ofrecido: ') + values.rentalTerm + '.', x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.2, maxLines: 3 });
      y += esc(8);
      y = paragraphFit(pdf, (isEnglish ? 'Conditions or requests to the property owner: ' : 'Condiciones o solicitudes al propietario: ') + values.ownerConditions, x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.8, maxLines: 4 });
      y += esc(14);
    }
    // La forma de pago puede quedar sin definir (la carta de presentación no
    // siempre puede afirmarla). En ese caso se imprimen solo las condiciones
    // escritas, sin encabezarlas con un método que no se confirmó.
    if (isSale && (values.paymentMethod || values.paymentDetails)) {
      var metodo = values.paymentMethod
        ? (isEnglish ? translatedPaymentMethod(values.paymentMethod) : values.paymentMethod) + '. '
        : '';
      var paymentText = deAsesor
        ? (isEnglish
            ? 'Payment terms: ' + metodo + values.paymentDetails
            : 'Condiciones de pago: ' + metodo + values.paymentDetails)
        : deProp
        ? (isEnglish
            ? 'Required payment method: ' + metodo + values.paymentDetails
            : 'Forma de pago requerida: ' + metodo + values.paymentDetails)
        : (isEnglish
            ? 'Payment method: ' + metodo + values.paymentDetails
            : 'Forma de pago: ' + metodo + values.paymentDetails);
      var paymentLead = deAsesor
        ? ''
        : deProp
        ? (isEnglish ? 'The payment shall be made as follows: ' : 'El pago deberá realizarse de la siguiente manera: ')
        : (isEnglish ? 'The funds will be delivered as follows: ' : 'Los fondos serán entregados de la siguiente manera: ');
      y = paragraphFit(pdf, paymentLead + paymentText, x, y, width, { fontSize: 11.2, minFontSize: 9.6, lineHeight: 15.2, maxLines: 7 });
      y += esc(10);
    }

    if (values.includedItems && values.includedItems.length) {
      var encabezadoItems = values.itemsTitle
        ? values.itemsTitle + ':'
        : (deAsesor
            ? (isEnglish ? 'The development offers the following:' : 'El desarrollo ofrece lo siguiente:')
            : deProp
            ? (isEnglish ? 'The owner includes the following items together with the property:' : 'El propietario incluye los siguientes bienes junto con el inmueble:')
            : (isEnglish ? 'This offer includes the following items together with the property:' : 'Esta oferta incluye los siguientes bienes junto con el inmueble:'));
      y = paragraphFit(pdf, encabezadoItems, x, y, width, { fontSize: 11, minFontSize: 9.8, lineHeight: 15, maxLines: 2 });
      y += esc(4);
      values.includedItems.forEach(function (it) {
        y = paragraphFit(pdf, '• ' + it, x + 10, y, width - 10, { fontSize: 10.4, minFontSize: 9.2, lineHeight: 13.2, maxLines: 2 });
      });
      y += esc(10);
    }

    if (values.additionalNotes) {
      y = paragraphFit(pdf,
        (isEnglish ? 'Additional notes: ' : 'Notas adicionales: ') + values.additionalNotes,
        x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.4, maxLines: 5 });
      y += esc(10);
    }

    // Condiciones propias de la oferta del propietario: hasta cuándo sostiene
    // el precio y que seguir publicando el inmueble no lo contradice.
    if ((deProp || deAsesor) && values.validityLong) {
      pdf.setTextColor(11, 45, 92);
      y = paragraphFit(pdf,
        deAsesor
          ? (isEnglish
              ? 'The prices and conditions stated in this letter are valid until ' + values.validityLong.en + '.'
              : 'Los precios y condiciones indicados en esta carta tienen vigencia hasta el ' + values.validityLong.es + '.')
          : (isEnglish
              ? 'This offer is valid until ' + values.validityLong.en + ', after which it expires without any further formality.'
              : 'Esta oferta es válida hasta el ' + values.validityLong.es + ', fecha después de la cual queda sin efecto sin necesidad de trámite alguno.'),
        x, y, width, { fontSize: 10.8, minFontSize: 9.6, fontStyle: 'bold', lineHeight: 14.6, maxLines: 3 });
      pdf.setTextColor(15, 23, 42);
      y += esc(10);
    }
    // La carta de presentación no es una oferta: hay que decirlo en el texto.
    if (deAsesor) {
      y = paragraphFit(pdf,
        isEnglish
          ? 'This letter is informational and does not constitute a binding offer or a commitment to sell. Prices, availability and conditions of the development may change without prior notice, and any transaction remains subject to the corresponding contractual documents.'
          : 'La presente carta tiene carácter informativo y no constituye una oferta vinculante ni un compromiso de venta. Los precios, la disponibilidad y las condiciones del desarrollo pueden variar sin previo aviso, y toda operación queda sujeta a los documentos contractuales correspondientes.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.6, maxLines: 6 });
      y += esc(12);
    }
    if (deProp && values.subjectPriorSale) {
      y = paragraphFit(pdf,
        isEnglish
          ? 'This offer is subject to prior sale. Acceptance of an offer does not suspend the advertising or marketing of the property, which will continue until an effective reservation deposit has been made in favor of the owner. Until that deposit exists, the owner may receive and accept other offers.'
          : 'Esta oferta queda sujeta a venta previa. La aceptación de una oferta no implica la suspensión de la publicidad ni de la promoción del inmueble, las cuales continuarán hasta que exista una reserva efectiva depositada a favor del propietario. Mientras no exista dicho depósito, el propietario podrá recibir y aceptar otras ofertas.',
        x, y, width, { fontSize: 10.8, minFontSize: 9.4, lineHeight: 14.6, maxLines: 6 });
      y += esc(12);
    }

    y = paragraphFit(pdf,
      deAsesor
        ? (isEnglish
            ? 'This letter is issued at the request of the interested party, for whatever purposes they deem appropriate. I remain available to expand on any of the information stated above.'
            : 'Se extiende la presente carta a solicitud de la parte interesada, para los fines que estime convenientes. Quedo a disposición para ampliar cualquiera de los puntos aquí detallados.')
        : deProp
        ? (isEnglish
            ? 'I also expressly authorize GUERRERO PROPERTIES to deliver this offer to the party named above in order to receive a response accepting or rejecting it. GUERRERO PROPERTIES acts solely as an intermediary and is not empowered to accept offers, modify their conditions, or sign contracts on my behalf.'
            : 'Así mismo, autorizo expresamente a GUERRERO PROPERTIES para que entregue la presente oferta a la parte antes indicada, a efectos de recibir respuesta de aceptación o rechazo. GUERRERO PROPERTIES actúa únicamente como intermediario y no está facultada para aceptar ofertas, modificar sus condiciones ni firmar contratos en mi nombre.')
        : (isEnglish
            ? 'I also expressly authorize GUERRERO PROPERTIES to notify the owner of the property of this offer in order to receive a response accepting or rejecting it.'
            : 'Así mismo, autorizo expresamente a GUERRERO PROPERTIES para que notifique al propietario de dicho inmueble la presente oferta, a efectos de recibir respuesta de aceptación o rechazo.'),
      x, y, width, { fontSize: 11.2, minFontSize: 10, lineHeight: 15.0, maxLines: 6 });
    y += esc(16);

    // El bloque de fecha + firma mide ~170pt. Si no entra completo en lo que
    // queda de página, se pasa entero a la siguiente. Antes la firma estaba
    // clavada al fondo (Math.min(710, ...)), así que cuando el texto terminaba
    // arriba quedaba un vacío enorme entre la fecha y la firma.
    // El bloque de firma = hueco para la rúbrica + las etiquetas de abajo (una
    // línea más en la carta de presentación, por el cargo). Si no entra con el
    // hueco normal pero sí con uno más justo, se aprieta: mandar solo la firma
    // a la página siguiente deja media hoja en blanco arriba y otra abajo.
    var HUECO_FIRMA = 90, HUECO_FIRMA_MIN = 80;
    var COLA_FIRMA = (deAsesor && values.issuerRole ? 86 : 64) + 20;
    var tope = pageH - 52;
    var huecoFirma = HUECO_FIRMA;
    if (y + HUECO_FIRMA + COLA_FIRMA > tope) {
      if (y + HUECO_FIRMA_MIN + COLA_FIRMA <= tope) huecoFirma = HUECO_FIRMA_MIN;
      else { pdf.addPage(); y = 80; }
    }

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11.2);
    pdf.text(isEnglish ? values.issueCity + ', on ' + values.signDateLongEnglish + '.' : values.issueCity + ', a ' + values.signDateLong + '.', x, y);

    // Dos columnas del mismo ancho repartidas sobre el ancho real del
    // contenido: a la izquierda la firma, a la derecha fecha y hora.
    var signatureTop = y + huecoFirma;
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
    if (deAsesor && values.issuerRole) {
      pdf.setTextColor(11, 45, 92);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isEnglish ? 'ROLE:' : 'CARGO:', x, signatureTop + 86);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'normal');
      pdf.text(values.issuerRole, x + 86, signatureTop + 86);
    }
    pdf.text(values.signDate, rightX + 56, signatureTop + 20);
    pdf.text(values.signTime, rightX + 56, signatureTop + 42);

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.text(
      isEnglish ? 'English offer - The attached Spanish version follows.' : (values.documentLanguage === 'en' ? 'Versión en español - Se anexa la versión en inglés en este mismo PDF.' : 'Versión en español.'),
      pageW / 2, pageH - 16, { align: 'center' });
  }

  function armarPdf(values) {
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

  // La carta tiene que caber en dos páginas por idioma (el PDF bilingüe lleva
  // el documento completo dos veces, así que son cuatro). Se arma, se cuenta,
  // y si se pasó se vuelve a armar un poco más compacto. Si ni al mínimo
  // entra, se devuelve el último intento en vez de fallar: mejor una carta
  // larga que ninguna.
  var PAGINAS_POR_IDIOMA = 2;
  var ESCALAS = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82];
  function buildPdf(values) {
    var tope = PAGINAS_POR_IDIOMA * (values.documentLanguage === 'en' ? 2 : 1);
    var pdf = null;
    for (var i = 0; i < ESCALAS.length; i++) {
      ESCALA = ESCALAS[i];
      pdf = armarPdf(values);
      if (pdf.internal.getNumberOfPages() <= tope) break;
    }
    ESCALA = 1;
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
    var esAsesor = delAsesor();
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

    // En la carta de presentación el precio y la forma de pago son
    // opcionales: puede describir un proyecto sin cotizar nada.
    var amount = Number(val('amount_number'));
    if (esAsesor) {
      if (val('amount_number') && (!isFinite(amount) || amount <= 0)) {
        bad(amountNumber, bilingue('El precio de referencia no es válido.', 'The reference price is not valid.'));
      }
    } else if (!isFinite(amount) || amount <= 0) {
      bad(amountNumber, bilingue('Ingresá un monto válido en dólares.', 'Enter a valid amount in US dollars.'));
    } else if (!val('amount_words')) {
      bad(amountNumber, bilingue('No se pudo generar el monto en letras.', 'The amount in words could not be generated.'));
    }

    var isSale = offerType.value === 'VENTA';
    var isRental = offerType.value === 'ALQUILER';
    if (isSale && !esAsesor) {
      if (!['Contado', 'Crédito', 'Mixto'].includes(paymentMethod.value)) bad(paymentMethod, bilingue('Seleccioná la forma de pago.', 'Select the payment method.'));
      if (!val('payment_details')) bad(paymentDetails, bilingue('Detallá la entrega de fondos.', 'Describe how the funds will be delivered.'));
    }
    if (isRental && !esAsesor) {
      if (!val('rental_term')) bad(rentalTerm, bilingue('Indicá el plazo de alquiler.', 'Enter the rental term.'));
      if (!val('owner_conditions')) bad(ownerConditions, bilingue('Indicá las condiciones o solicitudes al propietario.', 'Enter the conditions or requests to the owner.'));
    }
    if (documentLanguage.value === 'en' && !englishConsent.checked) bad(englishConsent, bilingue('Tenés que aceptar que el PDF incluye la versión en inglés y su anexo en español.', 'You must accept that the PDF includes the English version and its Spanish annex.'));
    if (!hasSignature || !signatureData) errors.push(
      esAsesor ? bilingue('Falta tu firma.', 'Your signature is required.')
      : esProp ? bilingue('La firma del propietario es obligatoria.', "The owner's signature is required.")
      : bilingue('La firma del cliente es obligatoria.', "The client's signature is required."));

    if (errors.length) {
      showErrors(Array.from(new Set(errors)));
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      else if (!hasSignature) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }

    var now = nowParts();
    var vigencia = (esProp || esAsesor) ? fechaLarga(offerValidity.value) : null;
    return {
      documentLanguage: documentLanguage.value,
      offerType: offerType.value,
      issuer: esAsesor ? 'ASESOR' : esProp ? 'PROPIETARIO' : 'COMPRADOR',
      recipientName: (esProp || esAsesor) ? val('recipient_name') : '',
      issuerRole: esAsesor ? val('issuer_role') : '',
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
      itemsTitle: itemsTitle.value.trim(),
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
            tipo: v.issuer === 'ASESOR' ? 'presentacion' : v.issuer === 'PROPIETARIO' ? 'oferta_venta' : 'oferta',
            transaccion: v.offerType,
            idioma: v.documentLanguage,
            cliente_nombre: v.issuer === 'COMPRADOR' ? v.fullName : (v.recipientName || null),
            cliente_documento: v.issuer === 'COMPRADOR' ? v.documentType + ' ' + v.documentNumber : null,
            // En la carta de presentación el que firma es el asesor; se guarda
            // en el mismo campo del firmante para poder verlo en el archivo.
            propietario_nombre: v.issuer === 'COMPRADOR' ? null : v.fullName,
            propietario_documento: v.issuer === 'COMPRADOR' ? null : v.documentType + ' ' + v.documentNumber,
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
      var nombreArchivo = values.issuer === 'COMPRADOR' ? values.fullName : (values.recipientName || values.fullName);
      var slug = (nombreArchivo || 'cliente').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'cliente';
      var pdfBlob = pdf.output('blob');
      var prefijo = values.issuer === 'ASESOR' ? 'carta-presentacion-'
        : values.issuer === 'PROPIETARIO' ? 'carta-oferta-venta-' : 'carta-oferta-';
      pdf.save(prefijo + slug + '.pdf');
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
  function aplicarTituloItems(titulo) {
    itemsTitle.value = titulo || '';
    if (titulo) {
      // Sale del registro bilingüe: el título a medida lo escribe el agente y
      // no tiene par español/inglés que invertir (si no, al cambiar el idioma
      // volvería al título por defecto).
      BILINGUES.delete(el('inventoryTitle'));
      el('inventoryTitle').textContent = titulo;
    } else {
      setBilingue('inventoryTitle', 'Bienes incluidos', 'Items included');
    }
  }
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
    aplicarTituloItems(campos.titulo_inventario || '');
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
          // Recién acá se sabe qué quedó definido por el borrador.
          modoSimple();
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
    if (['PROPIETARIO', 'COMPRADOR', 'ASESOR'].indexOf(emisor) !== -1) letterIssuer.value = emisor;
    if (q.get('dirigidaa')) recipientName.value = q.get('dirigidaa');
    if (q.get('cargo')) issuerRole.value = q.get('cargo');
    if (q.get('firmante')) el('full_name').value = q.get('firmante');
    if (q.get('tipodoc')) documentType.value = q.get('tipodoc');
    if (q.get('doc')) documentNumber.value = q.get('doc');
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
    if (q.get('tituloitems')) aplicarTituloItems(q.get('tituloitems'));
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
  // Qué le quedaría por llenar al que firma, aparte de lo suyo (monto, bienes
  // y firma). Sirve para avisarle al agente antes de mandar el link: si acá
  // hay algo, es porque él no lo completó.
  function pendientesDelFirmante() {
    var faltan = [];
    if (delAsesor()) return faltan;
    if (!offerType.value) faltan.push('el tipo de oferta (venta o alquiler)');
    if (delPropietario() && !recipientName.value.trim()) faltan.push('a quién va dirigida la carta');
    if (!el('property_municipality').value.trim()) faltan.push('el municipio del inmueble');
    if (!el('property_department').value.trim()) faltan.push('el departamento del inmueble');
    if (!el('property_address').value.trim()) faltan.push('la dirección del inmueble');
    if (offerType.value === 'VENTA') {
      if (!paymentMethod.value) faltan.push('la forma de pago');
      if (!paymentDetails.value.trim()) faltan.push('el detalle de entrega de fondos');
    }
    if (offerType.value === 'ALQUILER') {
      if (!rentalTerm.value.trim()) faltan.push('el plazo de alquiler');
      if (!ownerConditions.value.trim()) faltan.push('las condiciones al propietario');
    }
    return faltan;
  }
  function mostrarPendientes() {
    var caja = el('agentePendientes');
    if (!caja) return;
    var faltan = pendientesDelFirmante();
    var quien = delPropietario() ? 'El propietario' : 'El cliente';
    if (faltan.length) {
      caja.innerHTML = '<strong style="color:#b45309;">Ojo:</strong> ' + quien +
        ' va a tener que completar ' + faltan.join(', ') + '. Si no querés que lo haga él, llenalo acá antes de copiar el link.';
    } else {
      caja.innerHTML = '<strong style="color:#15803d;">Listo:</strong> ' + quien +
        ' solo va a elegir el monto, revisar los bienes incluidos y firmar.';
    }
    caja.classList.remove('d-none');
  }

  function construirLinkCliente() {
    var base = ((window.SITE_CONFIG || {}).SITE_URL || (location.origin + location.pathname.replace(/[^/]*$/, ''))).replace(/\/$/, '');
    var p = new URLSearchParams();
    if (borradorSelect.value) p.set('borrador', borradorSelect.value);
    if (offerType.value) p.set('tipo', offerType.value.toLowerCase());
    p.set('emisor', letterIssuer.value);
    if (delAsesor() && issuerRole.value.trim()) p.set('cargo', issuerRole.value.trim());
    if (delPropietario() || delAsesor()) {
      if (recipientName.value.trim()) p.set('dirigidaa', recipientName.value.trim());
      if (offerValidity.value) p.set('vigencia', offerValidity.value);
      p.set('previa', subjectPriorSale.checked ? '1' : '0');
    }
    // Datos del que firma: solo viajan si el agente los escribió. Llegan
    // precargados pero editables, para que pueda corregirlos antes de firmar.
    if (el('full_name').value.trim()) p.set('firmante', el('full_name').value.trim());
    if (documentType.value) p.set('tipodoc', documentType.value);
    if (documentNumber.value.trim()) p.set('doc', documentNumber.value.trim());
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
    if (itemsTitle.value.trim()) p.set('tituloitems', itemsTitle.value.trim());
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
      copiar(construirLinkCliente() + '&simple=1&revision=1',
        'Link de revisión copiado. Lo ve completo, de solo lectura, sin poder firmar ni modificar.');
      mostrarPendientes();
    });
    el('copiarLinkCliente').addEventListener('click', function () {
      // simple=1: al que firma se le esconde todo lo que ya quedó definido acá.
      copiar(construirLinkCliente() + '&simple=1',
        delPropietario()
          ? 'Link de firma copiado. Mandáselo al propietario: ve de solo lectura todo lo que dejaste armado y solo elige el monto, revisa los bienes incluidos y firma.'
          : 'Link del cliente copiado. Mandáselo recién cuando el propietario haya dado el visto bueno: el cliente solo pone lo suyo y firma.');
      mostrarPendientes();
    });
  }

  // ---------- modo simple: el que firma solo ve lo que le toca ----------
  // Con ?simple=1 todo lo que el agente ya dejó definido se muestra en una
  // tarjeta de solo lectura y su campo se esconde. La regla es "esconder lo
  // que ya tiene valor": si el agente se olvidó de algo obligatorio, ese
  // campo queda visible para que el que firma lo pueda completar y no se
  // trabe con un error sobre un campo que no ve.
  function filaResumen(etiquetaEs, etiquetaEn, valor) {
    if (!valor) return '';
    return '<div class="co-resumen-row"><div class="co-resumen-k">' +
      bilingue(etiquetaEs, etiquetaEn) + '</div><div class="co-resumen-v">' + valor + '</div></div>';
  }
  function modoSimple() {
    if (new URLSearchParams(window.location.search).get('simple') !== '1') return;
    var esProp = delPropietario();
    var isSale = offerType.value === 'VENTA';
    var dinero = function (v) { return v ? 'US$ ' + formatMoney(Number(v)) : ''; };

    var inmueble = [el('property_address').value, el('property_municipality').value, el('property_department').value]
      .map(function (s) { return (s || '').trim(); }).filter(Boolean).join(', ');
    var pago = [paymentMethod.value, paymentDetails.value.trim()].filter(Boolean).join('. ');
    var vigencia = esProp && offerValidity.value ? (fechaLarga(offerValidity.value) || {}) : {};

    var html = '';
    html += filaResumen('Tipo de oferta', 'Offer type',
      offerType.value === 'ALQUILER' ? bilingue('Alquiler', 'Rental') : (isSale ? bilingue('Venta', 'Sale') : ''));
    if (esProp) html += filaResumen('Dirigida a', 'Addressed to', recipientName.value.trim());
    html += filaResumen('Inmueble', 'Property', inmueble);
    html += filaResumen('Ciudad de emisión', 'Place of issue', el('issue_city').value.trim() || 'San Salvador');
    html += filaResumen('Precio de lista autorizado', 'Authorized list price', dinero(listPrice.value));
    html += filaResumen('Forma de pago', 'Payment method', pago);
    html += filaResumen('Plazo de alquiler', 'Rental term', rentalTerm.value.trim());
    html += filaResumen('Condiciones al propietario', 'Conditions to the owner', ownerConditions.value.trim());
    html += filaResumen('Vigencia de la oferta', 'Offer valid until', vigencia.es ? (ordenIngles() ? vigencia.en : vigencia.es) : '');
    if (esProp && isSale && subjectPriorSale.checked) {
      html += filaResumen('Sujeta a venta previa', 'Subject to prior sale',
        bilingue('Sí, se sigue publicando hasta que haya reserva depositada', 'Yes, marketing continues until a reservation deposit is made'));
    }
    if (firmPrice.checked) {
      html += filaResumen('Precio cerrado', 'Firm price', bilingue('Sí, sin costos adicionales al monto pactado', 'Yes, no additional costs over the agreed amount'));
    }
    html += filaResumen('Notas adicionales', 'Additional notes', additionalNotes.value.trim());
    html += filaResumen('Idioma del documento', 'Document language',
      documentLanguage.value === 'en' ? bilingue('Inglés + anexo en español', 'English + Spanish annex') : bilingue('Español', 'Spanish'));

    el('resumenRows').innerHTML = html;
    el('resumenCard').classList.toggle('d-none', !html);

    // Esconder solo lo que ya está resuelto.
    additionalNotes.closest('.co-card').classList.add('d-none');
    // Esa tarjeta lleva también el idioma y la dirección de la carta: solo se
    // esconde si el tipo de oferta ya vino resuelto (si no, el que firma no
    // tendría cómo elegirlo y la validación lo trabaría).
    if (offerType.value) el('issue_city').closest('.co-card').classList.add('d-none');
    if (inmueble && el('property_address').value.trim() && el('property_municipality').value.trim() && el('property_department').value.trim()) {
      el('property_address').closest('.co-card').classList.add('d-none');
    }
    if (isSale && paymentMethod.value && paymentDetails.value.trim()) saleFields.classList.add('d-none');
    if (!isSale && rentalTerm.value.trim() && ownerConditions.value.trim()) rentalFields.classList.add('d-none');
    if (listPrice.value) listPrice.closest('.co-field').classList.add('d-none');
    if (esProp) {
      recipientWrap.classList.add('d-none');
      validityWrap.classList.add('d-none');
      priorSaleWrap.classList.add('d-none');
    }
    el('firmPriceWrap').classList.add('d-none');
    offerDateView.closest('.co-field').classList.add('d-none');

    // Ya no quedan "partes" en esa tarjeta: solo los datos del que firma.
    setBilingue('clienteCardTitle', 'Tus datos', 'Your details');
    el('clienteCardHint').classList.remove('d-none');
    setBilingue('clienteCardHint',
      'Poné tu nombre y tu número de documento tal como aparecen en tu identificación.',
      'Enter your name and ID number exactly as they appear on your identification document.');
  }

  // ---------- modo revisión: el propietario ve la oferta, no la firma ----------
  function modoRevision() {
    if (new URLSearchParams(window.location.search).get('revision') !== '1') return;
    document.body.classList.add('co-revision');
    el('revisionBanner').classList.remove('d-none');
    ['agenteCard', 'clienteCard', 'firmaCard'].forEach(function (id) {
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
  modoSimple();
  modoRevision();
  cargarBorradores();
  setInterval(refreshOfferDate, 60000);
})();
