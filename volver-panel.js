// ============================================================
//  Costo SV — Botón "Volver al panel" para las páginas de documentos
//  (carta de oferta, carta de respuesta, KYC y firma de contrato).
//
//  Walter abre estas páginas desde el panel, muchas veces desde el acceso
//  directo del teléfono: al terminar de firmar quedaba sin forma de volver
//  y tenía que cerrar toda la app. Esto agrega una barra arriba que lo
//  devuelve exactamente a donde estaba.
//
//  Solo aparece si la página se abrió DESDE el panel (o con ?agente=1).
//  El cliente que recibe el link por WhatsApp no tiene por qué ver un
//  acceso a la administración, así que para él la barra no existe.
// ============================================================
(function () {
  'use strict';

  var CLAVE = 'costosv_volver_panel';

  function esDelPanel(url) {
    if (!url) return false;
    try {
      var u = new URL(url, location.href);
      return u.origin === location.origin && /\/panel(\.html|\/|$)/.test(u.pathname);
    } catch (e) {
      return false;
    }
  }

  function leerGuardado() {
    try { return sessionStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(v) {
    try { sessionStorage.setItem(CLAVE, v); } catch (e) {}
  }

  // De dónde vino: el referrer es lo más preciso (vuelve a la misma
  // pantalla). Se guarda en la sesión porque al recargar la página el
  // referrer se pierde.
  var destino = null;
  if (esDelPanel(document.referrer)) {
    destino = document.referrer;
    guardar(destino);
  } else {
    destino = leerGuardado();
  }
  // Modo agente: aunque el link se haya pegado a mano, es Walter.
  if (!destino) {
    try {
      if (new URLSearchParams(window.location.search).get('agente') === '1') {
        var base = ((window.SITE_CONFIG || {}).SITE_URL || window.location.origin).replace(/\/$/, '');
        destino = base + '/panel.html';
        guardar(destino);
      }
    } catch (e) {}
  }
  if (!destino) return;

  function montar() {
    if (document.getElementById('volverPanelBar')) return;
    var barra = document.createElement('div');
    barra.id = 'volverPanelBar';
    barra.style.cssText = [
      'position:sticky', 'top:0', 'z-index:60',
      'background:#0b2d5c', 'padding:7px 14px',
      'box-shadow:0 1px 6px rgba(0,0,0,.18)',
    ].join(';');
    var a = document.createElement('a');
    a.href = destino;
    a.innerHTML = '&larr;&nbsp; Volver al panel';
    a.style.cssText = [
      'color:#fff', 'text-decoration:none',
      "font:600 .85rem/1.3 'Outfit',system-ui,sans-serif",
      'display:inline-block', 'padding:5px 2px',
    ].join(';');
    barra.appendChild(a);
    document.body.insertBefore(barra, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();
