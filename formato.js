// ============================================================
//  Costo SV — Formato uniforme de precios y áreas (navegador)
//
//  COPIA CANÓNICA DEL NAVEGADOR. El servidor usa la misma lógica en
//  lib/formato.js (api/propiedad.js la importa de ahí). Las dos están
//  duplicadas porque este archivo se carga como script clásico y no puede
//  importar módulos, y lib/ no se publica al sitio. Para que no se separen,
//  `node predeploy-check.mjs` compara la salida de ambas contra una lista de
//  valores reales de la base y falla si difieren. Si tocás una, tocá la otra.
//
//  Este archivo NO toca el DOM ni registra listeners: se puede cargar solo,
//  sin app.js, y por eso también lo usan las páginas del panel.
//
//  Por qué hace falta normalizar al mostrar: las fichas vienen de tres
//  lugares distintos (importadas de RE/MAX Connect, cargadas a mano en el
//  panel, y migradas de versiones viejas del sitio), así que el MISMO dato
//  llega escrito de formas distintas: "$125000", "$125,000", "$576,000.00"
//  y hasta "$950.000.00" con puntos de miles al estilo europeo. Sin
//  normalizar, la portada muestra tres formatos uno al lado del otro.
//
//  Si no entienden un valor lo devuelven tal cual: nunca se inventa un
//  número que el cliente podría leer como el precio real.
// ============================================================
(function () {
  // "$950.000.00" -> 950000 | "$125000" -> 125000 | "$576,000.00" -> 576000
  function precioANumero(crudo) {
    var t = String(crudo == null ? '' : crudo).trim().replace(/^\$/, '').replace(/\s/g, '');
    if (!t) return null;
    // Rangos ("245-380") o cualquier texto suelto ("Consultar"): no se tocan.
    if (/[^0-9.,]/.test(t)) return null;
    var entero;
    if (/^\d{1,3}(\.\d{3})+(\.\d{1,2})?$/.test(t)) {
      // Puntos de miles al estilo europeo, con decimales opcionales al final.
      var partes = t.split('.');
      var cola = partes[partes.length - 1];
      if (cola.length < 3) partes.pop();
      entero = partes.join('');
    } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t) || /^\d+(\.\d{1,2})?$/.test(t)) {
      entero = t.replace(/,/g, '').split('.')[0];
    } else {
      return null;
    }
    var n = parseInt(entero, 10);
    return isNaN(n) ? null : n;
  }

  // Precio listo para mostrar. Los alquileres llevan "/mes" -- si no, un
  // alquiler de $890 se lee como una venta de $890 al lado de una de $125,000.
  window.precioFmt = function (crudo, tipoContrato) {
    var n = precioANumero(crudo);
    var sufijo = tipoContrato === 'alquiler' ? '/mes' : '';
    if (n === null) {
      var tal = String(crudo == null ? '' : crudo).trim();
      return sufijo && tal ? tal + ' ' + sufijo : tal;
    }
    return '$' + n.toLocaleString('en-US') + (sufijo ? ' ' + sufijo : '');
  };

  // Área lista para mostrar: agrega separador de miles, normaliza "Vr2"/"m2"
  // a "v²"/"m²" y le pone "m²" al valor que vino sin unidad (los únicos
  // valores sin unidad en la base son metros cuadrados -- verificado contra
  // la descripción de cada ficha). Si el valor YA trae unidad no se le agrega
  // otra: así se evita el "2,568.00 m² m²" que salía al concatenar a mano.
  window.areaFmt = function (crudo, unidadPorDefecto) {
    var t = String(crudo == null ? '' : crudo).trim();
    if (!t) return '';
    t = t.replace(/\bVr2\b|\bvr2\b|\bV2\b|\bv2\b/g, 'v²').replace(/\bm2\b/gi, 'm²');
    if (/^[\d.,]+$/.test(t)) {
      var n = parseFloat(t.replace(/,/g, ''));
      if (!isNaN(n)) {
        var dec = (t.split('.')[1] || '').length;
        t = n.toLocaleString('en-US', { minimumFractionDigits: dec > 2 ? 2 : dec, maximumFractionDigits: 2 });
      }
      return t + ' ' + (unidadPorDefecto || 'm²');
    }
    // Trae unidad: solo se le arreglan los separadores de miles del número.
    return t.replace(/^(\d[\d.,]*)/, function (num) {
      var n2 = parseFloat(num.replace(/,/g, ''));
      if (isNaN(n2)) return num;
      var d = (num.split('.')[1] || '').length;
      return n2.toLocaleString('en-US', { minimumFractionDigits: d > 2 ? 2 : d, maximumFractionDigits: 2 });
    });
  };
})();
