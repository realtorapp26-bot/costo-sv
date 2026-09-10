import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { nombreDe } from '../lib/usuarios';
import { useLeads } from '../lib/queries';
import { ESTADOS, ESTADO_LABEL } from '../lib/enums';
import { esHoy, diasDesde } from '../lib/format';
import { Badge, Button, Card, StatCard } from '../components/ui';

const SITE = 'https://guerrero-properties.com';

export function DashboardPage() {
  const { email } = useAuth();
  const { data: leads = [], isLoading } = useLeads();

  const nuevosHoy = leads.filter((l) => esHoy(l.created_at)).length;
  const seguimiento = leads.filter((l) => ['nuevo', 'contactado'].includes(l.estado)).length;
  const calificados = leads.filter((l) => l.estado === 'calificado').length;
  const sinMover7d = leads.filter(
    (l) => ['nuevo', 'contactado'].includes(l.estado) && diasDesde(l.created_at) >= 7,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-navy">Hola, {nombreDe(email)}</h1>
        <p className="text-sm text-slate-500">Resumen operativo y accesos rápidos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/leads?nuevo=1"
          className="inline-flex items-center rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-900"
        >
          + Nuevo lead
        </Link>
        <a href={`${SITE}/carta-oferta.html`} target="_blank" rel="noopener">
          <Button variant="outline">Carta de oferta</Button>
        </a>
        <a href={`${SITE}/carta-respuesta.html`} target="_blank" rel="noopener">
          <Button variant="outline">Carta de respuesta</Button>
        </a>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Pendientes importantes
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Leads nuevos hoy" value={isLoading ? '…' : nuevosHoy} />
          <StatCard label="En seguimiento" value={isLoading ? '…' : seguimiento} />
          <StatCard label="Calificados" value={isLoading ? '…' : calificados} />
          <StatCard
            label="Sin avanzar +7 días"
            value={isLoading ? '…' : sinMover7d}
            hint={sinMover7d > 0 ? 'Revisá estos' : undefined}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Pipeline de leads web
          </h2>
          <Link to="/leads" className="text-sm font-medium text-navy">
            Abrir pipeline →
          </Link>
        </div>
        <Card className="flex flex-wrap gap-6 p-4">
          {ESTADOS.map((e) => (
            <div key={e}>
              <div className="text-xl font-bold text-navy">
                {isLoading ? '…' : leads.filter((l) => l.estado === e).length}
              </div>
              <div className="mt-0.5">
                <Badge>{ESTADO_LABEL[e]}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
