import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { nombreDe } from '../lib/usuarios';
import { useCartas, useContratos, useKyc, useLeads } from '../lib/queries';
import { ESTADOS, ESTADO_LABEL } from '../lib/enums';
import { esHoy, diasDesde } from '../lib/format';
import { Badge, Button, Card, StatCard } from '../components/ui';

const SITE = 'https://guerrero-properties.com';

export function DashboardPage() {
  const { email } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const { data: casosKyc = [], isLoading: cargandoKyc } = useKyc();
  const { data: contratos = [], isLoading: cargandoContratos } = useContratos();
  const { data: cartas = [], isLoading: cargandoCartas } = useCartas();

  const nuevosHoy = leads.filter((l) => esHoy(l.created_at)).length;
  const seguimiento = leads.filter((l) => ['nuevo', 'contactado'].includes(l.estado)).length;
  const calificados = leads.filter((l) => l.estado === 'calificado').length;
  const sinMover7d = leads.filter(
    (l) => ['nuevo', 'contactado'].includes(l.estado) && diasDesde(l.created_at) >= 7,
  ).length;
  const kycPendientes = casosKyc.filter((k) => k.estado === 'pendiente').length;
  const contratosPendientes = contratos.filter((c) => c.estado === 'pendiente').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-navy">Hola, {nombreDe(email)}</h1>
        <p className="text-sm text-slate-500">Resumen operativo y accesos rápidos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/leads?nuevo=1"
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-navy shadow-sm hover:bg-gold-light"
        >
          <i className="fas fa-plus" /> Nuevo lead
        </Link>
        <a href={`${SITE}/carta-oferta.html?agente=1`} target="_blank" rel="noopener">
          <Button variant="outline">
            <i className="fas fa-file-signature" /> Carta de oferta
          </Button>
        </a>
        <a href={`${SITE}/carta-oferta.html?agente=1&emisor=PROPIETARIO`} target="_blank" rel="noopener">
          <Button variant="outline">
            <i className="fas fa-file-export" /> Oferta de venta
          </Button>
        </a>
        <a href={`${SITE}/carta-respuesta.html`} target="_blank" rel="noopener">
          <Button variant="outline">
            <i className="fas fa-reply" /> Carta de respuesta
          </Button>
        </a>
        <Link to="/kyc?nuevo=1">
          <Button variant="outline">
            <i className="fas fa-shield-halved" /> Nuevo KYC
          </Button>
        </Link>
        <Link to="/contratos?nuevo=1">
          <Button variant="outline">
            <i className="fas fa-file-contract" /> Nuevo contrato
          </Button>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Pendientes importantes
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Leads nuevos hoy" value={isLoading ? '…' : nuevosHoy} icon="fas fa-bolt" tono="blue" />
          <StatCard label="En seguimiento" value={isLoading ? '…' : seguimiento} icon="fas fa-clock" tono="amber" />
          <StatCard label="Calificados" value={isLoading ? '…' : calificados} icon="fas fa-circle-check" tono="emerald" />
          <StatCard
            label="Sin avanzar +7 días"
            value={isLoading ? '…' : sinMover7d}
            hint={sinMover7d > 0 ? 'Revisá estos' : undefined}
            icon="fas fa-triangle-exclamation"
            tono={sinMover7d > 0 ? 'red' : 'navy'}
          />
          <Link to="/kyc">
            <StatCard
              label="KYC pendientes"
              value={cargandoKyc ? '…' : kycPendientes}
              icon="fas fa-shield-halved"
              tono={kycPendientes > 0 ? 'amber' : 'navy'}
            />
          </Link>
          <Link to="/contratos">
            <StatCard
              label="Contratos por firmar"
              value={cargandoContratos ? '…' : contratosPendientes}
              icon="fas fa-file-contract"
              tono={contratosPendientes > 0 ? 'amber' : 'navy'}
            />
          </Link>
          <Link to="/cartas">
            <StatCard
              label="Cartas archivadas"
              value={cargandoCartas ? '…' : cartas.length}
              icon="fas fa-envelope-open-text"
              tono="navy"
            />
          </Link>
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
