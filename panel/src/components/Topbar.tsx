import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { nombreDe } from '../lib/usuarios';
import { Button } from './ui';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { email, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Menú"
      >
        ☰
      </button>

      <input
        type="search"
        placeholder="Buscar cliente, propiedad…"
        className="hidden max-w-sm flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-navy focus:bg-white sm:block"
        disabled
        title="El buscador global llega en la próxima versión"
      />

      <div className="relative ml-auto">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
            {nombreDe(email).slice(0, 1)}
          </span>
          <span className="hidden sm:inline">{nombreDe(email)}</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="px-2 py-1 text-xs text-slate-400">{email}</div>
            <Button
              variant="ghost"
              className="mt-1 w-full justify-start"
              onClick={() => void signOut()}
            >
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
