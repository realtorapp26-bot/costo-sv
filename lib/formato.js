// ============================================================
//  Costo SV — Formato uniforme de precios y áreas (lado servidor)
//
//  COPIA CANÓNICA. El navegador usa la misma lógica dentro de app.js
//  (window.precioFmt / window.areaFmt), porque app.js se carga como
//  script clásico y no puede importar módulos. Para que las dos copias
//  no se separen con el tiempo, `node predeploy-check.mjs` compara la
//  salida de ambas contra una lista de valores reales y falla si
//  difieren en alguno. Si tocás una, tocá la otra.
//
//  Por qué hace falta normalizar al mostrar: las fichas vienen de tres
//  lugares (importadas de RE/MAX Connect, cargadas a mano en el panel, y
//  migradas de versiones viejas del sitio) y el mismo dato llega escrito
//  de formas distintas: "$125000", "$125,000", "$576,000.00" y hasta
//  "$950.000.00" con puntos de miles al estilo europeo.
// ============================================================

function precioANumero(crudo) {
  const t = String(crudo == null ? '' : crudo).trim().replace(/^\$/, '').replace(/\s/g, '');
  if (!t) return null;
  if (/[^0-9.,]/.test(t)) return null;
  let entero;
  if (/^\d{1,3}(\.\d{3})+(\.\d{1,2})?$/.test(t)) {
    const partes = t.split('.');
    const cola = partes[partes.length - 1];
    if (cola.length < 3) partes.pop();
    entero = partes.join('');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t) || /^\d+(\.\d{1,2})?$/.test(t)) {
    entero = t.replace(/,/g, '').split('.')[0];
  } else {
    return null;
  }
  const n = parseInt(entero, 10);
  return isNaN(n) ? null : n;
}

export function precioFmt(crudo, tipoContrato) {
  const n = precioANumero(crudo);
  const sufijo = tipoContrato === 'alquiler' ? '/mes' : '';
  if (n === null) {
    const tal = String(crudo == null ? '' : crudo).trim();
    return sufijo && tal ? tal + ' ' + sufijo : tal;
  }
  return '$' + n.toLocaleString('en-US') + (sufijo ? ' ' + sufijo : '');
}

export function areaFmt(crudo, unidadPorDefecto) {
  let t = String(crudo == null ? '' : crudo).trim();
  if (!t) return '';
  t = t.replace(/\bVr2\b|\bvr2\b|\bV2\b|\bv2\b/g, 'v²').replace(/\bm2\b/gi, 'm²');
  if (/^[\d.,]+$/.test(t)) {
    const n = parseFloat(t.replace(/,/g, ''));
    if (!isNaN(n)) {
      const dec = (t.split('.')[1] || '').length;
      t = n.toLocaleString('en-US', { minimumFractionDigits: dec > 2 ? 2 : dec, maximumFractionDigits: 2 });
    }
    return t + ' ' + (unidadPorDefecto || 'm²');
  }
  return t.replace(/^(\d[\d.,]*)/, (num) => {
    const n2 = parseFloat(num.replace(/,/g, ''));
    if (isNaN(n2)) return num;
    const d = (num.split('.')[1] || '').length;
    return n2.toLocaleString('en-US', { minimumFractionDigits: d > 2 ? 2 : d, maximumFractionDigits: 2 });
  });
}
