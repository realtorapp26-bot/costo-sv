import { NavLink } from 'react-router-dom';
import { cx } from './ui';

const SITE = 'https://guerrero-properties.com';

interface Item {
  label: string;
  to?: string;
  href?: string;
  soon?: boolean;
}
interface Group {
  title: string;
  items: Item[];
}

const GROUPS: Group[] = [
  { title: 'Principal', items: [{ label: 'Dashboard', to: '/' }] },
  {
    title: 'Trabajo diario',
    items: [
      { label: 'Leads web', to: '/leads' },
      { label: 'Búsquedas activas', soon: true },
      { label: 'Publicidad inteligente', soon: true },
      { label: 'Captación', soon: true },
      { label: 'KYC / Cumplimiento', soon: true },
      { label: 'Comisiones', soon: true },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { label: 'Carta de oferta', href: `${SITE}/carta-oferta.html` },
      { label: 'Carta de respuesta', href: `${SITE}/carta-respuesta.html` },
      { label: 'Calculadoras', soon: true },
    ],
  },
];

const linkBase =
  'block rounded-lg px-3 py-2 text-sm font-medium transition';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-6 p-4">
      <div className="px-2">
        <div className="text-xs font-bold uppercase tracking-widest text-navy/60">Guerrero</div>
        <div className="font-serif text-lg font-bold text-navy">Properties</div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1 px-3 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              {g.title}
            </div>
            {g.items.map((it) => {
              if (it.to) {
                return (
                  <NavLink
                    key={it.label}
                    to={it.to}
                    end={it.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        linkBase,
                        isActive
                          ? 'bg-navy text-white'
                          : 'text-slate-600 hover:bg-slate-100',
                      )
                    }
                  >
                    {it.label}
                  </NavLink>
                );
              }
              if (it.href) {
                return (
                  <a
                    key={it.label}
                    href={it.href}
                    target="_blank"
                    rel="noopener"
                    className={cx(linkBase, 'text-slate-600 hover:bg-slate-100')}
                  >
                    {it.label} <span className="text-slate-400">↗</span>
                  </a>
                );
              }
              return (
                <div
                  key={it.label}
                  className={cx(linkBase, 'cursor-default text-slate-400')}
                  title="Próximamente"
                >
                  {it.label} <span className="text-[0.65rem]">· pronto</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <a
        href={`${SITE}/panel.html`}
        target="_blank"
        rel="noopener"
        className={cx(linkBase, 'border border-slate-200 text-center text-slate-500 hover:bg-slate-50')}
      >
        Panel clásico ↗
      </a>
    </nav>
  );
}
