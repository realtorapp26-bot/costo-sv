// Login compartido para los paneles internos (panel, propiedades-admin).
// Usa Supabase Auth por REST directo (sin librería) — misma clave publicable
// de config.js. La sesión vive en sessionStorage: se borra al cerrar la pestaña.
(function () {
  const CFG = window.SITE_CONFIG || {};
  const SUPA_URL = CFG.SUPABASE_URL || '';
  const SUPA_KEY = CFG.SUPABASE_ANON_KEY || '';
  const SESSION_KEY = 'costosv_admin_session';

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  async function signIn(email, password) {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Correo o contraseña incorrectos.');
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      email,
      expires_at: Date.now() + data.expires_in * 1000,
    });
    return data;
  }

  function signOut() {
    clearSession();
    location.reload();
  }

  async function recoverPassword(email) {
    const redirectTo = new URL('restablecer-password.html', window.location.href).href;
    const res = await fetch(`${SUPA_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error_description || data.msg || 'No se pudo enviar el correo de recuperación.');
    }
  }

  async function authHeaders() {
    let s = getSession();
    if (!s) throw new Error('No hay sesión activa.');
    if (Date.now() > s.expires_at - 30000) {
      const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      const data = await res.json();
      if (!res.ok) { clearSession(); throw new Error('La sesión expiró. Volvé a entrar.'); }
      s = { ...s, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + data.expires_in * 1000 };
      setSession(s);
    }
    return { apikey: SUPA_KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' };
  }

  const BUCKET_FOTOS = 'fichas-fotos';

  const MAX_LADO_FOTO = 2000; // px — de sobra para verse nítida en la web, mucho más liviano que el original de cámara

  // Redibuja la imagen en un canvas más chico. Además de aligerar el sitio,
  // esto es lo que evita que convertir/subir varias fotos pesadas seguidas
  // sature la memoria del navegador en el celular (la causa real de que
  // algunas fotos de un mismo lote se quedaran sin convertir).
  async function reescalarBlob(blob) {
    const bitmap = await createImageBitmap(blob);
    const escala = Math.min(1, MAX_LADO_FOTO / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85);
    });
  }

  // Los iPhone guardan las fotos de la cámara como .heic por defecto — casi
  // ningún navegador las muestra en <img> (subían bien, pero se veían "rotas"
  // en la ficha) — se convierten a JPEG acá. Si la conversión falla, se lanza
  // el error en vez de subir el .heic original: subirlo igual solo cambia un
  // problema visible (el error) por uno invisible (la foto rota en el sitio).
  async function prepararFoto(file) {
    const esHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    let blob = file;
    let nombre = file.name;
    let tipo = file.type || 'image/jpeg';

    if (esHeic) {
      if (typeof window.heic2any !== 'function') {
        throw new Error('no se pudo convertir este formato HEIC (no cargó la librería de conversión) — recargá la página e intentá de nuevo');
      }
      const resultado = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      blob = Array.isArray(resultado) ? resultado[0] : resultado;
      nombre = file.name.replace(/\.hei[cf]$/i, '.jpg');
      tipo = 'image/jpeg';
    }

    try {
      blob = await reescalarBlob(blob);
      tipo = 'image/jpeg';
      nombre = nombre.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
    } catch (ex) {
      console.error('No se pudo reescalar la foto, se sube tal cual:', ex);
    }

    return new File([blob], nombre.replace(/[^a-zA-Z0-9.\-]/g, '_'), { type: tipo });
  }

  async function subirFoto(file) {
    const headers = await authHeaders();
    const archivo = await prepararFoto(file);
    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const ruta = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nombreLimpio}`;
    const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET_FOTOS}/${ruta}`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: headers.Authorization, 'Content-Type': archivo.type || 'application/octet-stream' },
      body: archivo,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || `No se pudo subir la foto (${res.status})`);
    }
    return `${SUPA_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${ruta}`;
  }

  // Sube uno o varios archivos elegidos en un <input type="file">, agrega cada
  // URL resultante al textarea de fotos indicado y llama a alTerminar() para
  // refrescar la vista previa. Pensado para usarse como onchange del input.
  async function subirFotosA(inputEl, textareaId, alTerminar) {
    const archivos = Array.from(inputEl.files || []);
    if (!archivos.length) return;
    const textarea = document.getElementById(textareaId);
    const status = inputEl.nextElementSibling;
    if (status) status.style.display = 'inline';
    const fallidas = [];
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      if (status) status.textContent = `Subiendo ${i + 1} de ${archivos.length}...`;
      try {
        const url = await subirFoto(file);
        const actuales = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
        actuales.push(url);
        textarea.value = actuales.join('\n');
      } catch (ex) {
        console.error(`No se pudo subir "${file.name}":`, ex);
        fallidas.push(file.name);
      }
      // Pausa entre fotos: convertir/reescalar varias fotos pesadas de corrido
      // puede saturar la memoria del navegador en el celular — antes eso hacía
      // que se convirtieran bien las primeras y fallaran en silencio las de más
      // atrás del lote.
      await new Promise((r) => setTimeout(r, 250));
    }
    inputEl.value = '';
    if (status) { status.style.display = 'none'; status.textContent = ''; }
    // Una sola alerta con el resumen al final — un alert() por cada foto
    // fallida frenaba (bloqueaba) el resto del lote hasta tocar "aceptar".
    if (fallidas.length) {
      alert(`No se pudieron subir ${fallidas.length} de ${archivos.length} foto(s):\n${fallidas.join('\n')}\n\nProbá subirlas de nuevo (de a pocas si el problema sigue).`);
    }
    if (typeof alTerminar === 'function') alTerminar();
  }

  function renderLoginGate(onSuccess) {
    const gate = document.createElement('div');
    gate.id = 'login-gate';
    gate.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,28,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:sans-serif;';
    gate.innerHTML = `
      <form id="login-form" style="background:white;padding:32px;border-radius:12px;width:320px;box-shadow:0 20px 40px rgba(0,0,0,0.3);">
        <h2 style="margin:0 0 4px;font-size:1.2rem;color:#0a0f1c;">Acceso al panel</h2>
        <p style="margin:0 0 18px;font-size:0.85rem;color:#64748b;">Costo SV — uso interno</p>
        <input type="email" id="login-email" placeholder="Correo" required autocomplete="username"
               style="width:100%;padding:10px 12px;margin-bottom:10px;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;">
        <input type="password" id="login-password" placeholder="Contraseña" required autocomplete="current-password"
               style="width:100%;padding:10px 12px;margin-bottom:14px;border:1px solid #d1d5db;border-radius:6px;font-size:0.95rem;">
        <div id="login-error" style="color:#b91c1c;font-size:0.85rem;margin-bottom:10px;display:none;"></div>
        <div id="login-recover-msg" style="font-size:0.8rem;margin-bottom:10px;display:none;"></div>
        <button type="submit" id="login-submit"
                style="width:100%;padding:11px;background:#d4af37;color:#0a0f1c;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.95rem;">
          Entrar
        </button>
        <button type="button" id="login-recover"
                style="width:100%;padding:8px;margin-top:8px;background:none;border:none;color:#64748b;font-size:0.8rem;cursor:pointer;text-decoration:underline;">
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    `;
    document.body.appendChild(gate);

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const err = document.getElementById('login-error');
      const btn = document.getElementById('login-submit');
      err.style.display = 'none';
      btn.textContent = 'Entrando...';
      btn.disabled = true;
      try {
        await signIn(email, password);
        gate.remove();
        onSuccess();
      } catch (ex) {
        err.textContent = ex.message;
        err.style.display = 'block';
        btn.textContent = 'Entrar';
        btn.disabled = false;
      }
    });

    document.getElementById('login-recover').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const recoverBtn = document.getElementById('login-recover');
      const recoverMsg = document.getElementById('login-recover-msg');
      if (!email) {
        recoverMsg.style.color = '#b91c1c';
        recoverMsg.textContent = 'Escribí primero tu correo arriba.';
        recoverMsg.style.display = 'block';
        return;
      }
      recoverBtn.disabled = true;
      recoverBtn.textContent = 'Enviando...';
      try {
        await recoverPassword(email);
        recoverMsg.style.color = '#1b5e20';
        recoverMsg.textContent = 'Listo — revisá tu correo (' + email + ') para el link de recuperación.';
      } catch (ex) {
        recoverMsg.style.color = '#b91c1c';
        recoverMsg.textContent = ex.message;
      } finally {
        recoverMsg.style.display = 'block';
        recoverBtn.disabled = false;
        recoverBtn.textContent = '¿Olvidaste tu contraseña?';
      }
    });
  }

  function requireLogin(onReady) {
    if (getSession()) { onReady(); return; }
    renderLoginGate(onReady);
  }

  window.CostoSVAuth = { signIn, signOut, getSession, authHeaders, requireLogin, recoverPassword, subirFoto, subirFotosA };
})();
