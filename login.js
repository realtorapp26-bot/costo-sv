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
        <button type="submit" id="login-submit"
                style="width:100%;padding:11px;background:#d4af37;color:#0a0f1c;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.95rem;">
          Entrar
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
  }

  function requireLogin(onReady) {
    if (getSession()) { onReady(); return; }
    renderLoginGate(onReady);
  }

  window.CostoSVAuth = { signIn, signOut, getSession, authHeaders, requireLogin };
})();
