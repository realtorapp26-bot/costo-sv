import { NavLink } from 'react-router-dom';
import { cx } from './ui';

const SITE = 'https://guerrero-properties.com';

interface Item {
  label: string;
  icon: string;
  to?: string;
  href?: string;
  soon?: boolean;
}
interface Group {
  title: string;
  items: Item[];
}

const GROUPS: Group[] = [
  { title: 'Principal', items: [{ label: 'Dashboard', icon: 'fas fa-gauge-high', to: '/' }] },
  {
    title: 'Trabajo diario',
    items: [
      { label: 'Propiedades', icon: 'fas fa-house', to: '/propiedades' },
      { label: 'Leads web', icon: 'fas fa-user-group', to: '/leads' },
      { label: 'Búsquedas activas', icon: 'fas fa-magnifying-glass', soon: true },
      { label: 'Publicidad inteligente', icon: 'fas fa-bullhorn', soon: true },
      { label: 'Captación', icon: 'fas fa-handshake', soon: true },
      { label: 'KYC / Cumplimiento', icon: 'fas fa-shield-halved', soon: true },
      { label: 'Comisiones', icon: 'fas fa-sack-dollar', soon: true },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { label: 'Carta de oferta', icon: 'fas fa-file-signature', href: `${SITE}/carta-oferta.html` },
      { label: 'Carta de respuesta', icon: 'fas fa-reply', href: `${SITE}/carta-respuesta.html` },
      { label: 'Calculadoras', icon: 'fas fa-calculator', soon: true },
    ],
  },
];

const linkBase =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-6 p-4">
      <div className="px-2">
        <div className="text-xs font-bold uppercase tracking-widest text-navy/60">Guerrero</div>
        <div className="font-serif text-lg font-bold text-navy">Properties</div>
        <div className="mt-1.5 h-0.5 w-8 rounded-full bg-gold" />
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
                    <i className={cx(it.icon, 'w-4 text-center text-[0.8rem]')} />
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
                    <i className={cx(it.icon, 'w-4 text-center text-[0.8rem] text-slate-400')} />
                    {it.label} <span className="ml-auto text-slate-400">↗</span>
                  </a>
                );
              }
              return (
                <div
                  key={it.label}
                  className={cx(linkBase, 'cursor-default text-slate-400')}
                  title="Próximamente"
                >
                  <i className={cx(it.icon, 'w-4 text-center text-[0.8rem]')} />
                  {it.label} <span className="ml-auto text-[0.65rem]">pronto</span>
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
