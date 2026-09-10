import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState('');

  if (!loading && session) {
    const to = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError('Correo o contraseña incorrectos.');
  }

  async function onRecover() {
    if (!email.trim()) {
      setRecoverMsg('Escribí primero tu correo.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/login',
    });
    setRecoverMsg(
      error ? 'No se pudo enviar el correo.' : `Listo — revisá ${email.trim()} para el enlace.`,
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-1 text-xs font-bold uppercase tracking-widest text-navy">
          Guerrero Properties
        </div>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Panel interno</h1>
        <p className="mb-6 text-sm text-slate-500">Acceso solo para el equipo.</p>

        <label className="mb-1 block text-sm font-medium text-slate-600">Correo</label>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/15"
        />
        <label className="mb-1 block text-sm font-medium text-slate-600">Contraseña</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/15"
        />

        {error && <p className="mb-3 text-sm text-accent">{error}</p>}
        {recoverMsg && <p className="mb-3 text-sm text-slate-600">{recoverMsg}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white hover:bg-navy-900 disabled:opacity-70"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={onRecover}
          className="mt-3 w-full text-center text-xs text-slate-500 underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  );
}
