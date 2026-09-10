import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Estado, Interes, LeadConContacto, Origen } from '../lib/types';
import {
  ESTADOS,
  ESTADO_CLASE,
  ESTADO_LABEL,
  INTERESES,
  INTERES_LABEL,
  ORIGENES,
  ORIGEN_LABEL,
} from '../lib/enums';
import { esHoy, formatearFecha } from '../lib/format';
import {
  ofertaSignedUrl,
  useAddLead,
  useAddNota,
  useDeleteLead,
  useLeads,
  useUpdateLeadEstado,
} from '../lib/queries';
import { Badge, Button, Card, EmptyState, Field, Modal, StatCard, cx, inputClass } from '../components/ui';
import { LeadsPipeline } from './LeadsPipeline';

type Vista = 'tabla' | 'pipeline';

export function LeadsPage() {
  const { data: leads = [], isLoading, error } = useLeads();
  const updateEstado = useUpdateLeadEstado();
  const addNota = useAddNota();
  const deleteLead = useDeleteLead();

  const [params, setParams] = useSearchParams();
  const [vista, setVista] = useState<Vista>('tabla');
  const [fEstado, setFEstado] = useState<Estado | null>(null);
  const [fOrigen, setFOrigen] = useState<Origen | null>(null);
  const [fInteres, setFInteres] = useState<Interes | null>(null);
  const [notaLead, setNotaLead] = useState<LeadConContacto | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(params.get('nuevo') === '1');

  const filtrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!fEstado || l.estado === fEstado) &&
          (!fOrigen || l.origen === fOrigen) &&
          (!fInteres || l.interes === fInteres),
      ),
    [leads, fEstado, fOrigen, fInteres],
  );

  const kpis = useMemo(
    () => ({
      nuevos: leads.filter((l) => esHoy(l.created_at)).length,
      seguimiento: leads.filter((l) => ['nuevo', 'contactado'].includes(l.estado)).length,
      calificados: leads.filter((l) => l.estado === 'calificado').length,
      total: filtrados.length,
    }),
    [leads, filtrados],
  );

  async function descargarOferta(path: string) {
    try {
      const url = await ofertaSignedUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('No se pudo descargar la oferta.');
    }
  }

  function eliminar(lead: LeadConContacto) {
    if (!confirm(`¿Eliminar el lead de "${lead.contactos?.nombre ?? 'este lead'}"? No se puede deshacer.`))
      return;
    deleteLead.mutate(lead.id);
  }

  function cerrarNuevo() {
    setNuevoOpen(false);
    if (params.has('nuevo')) {
      params.delete('nuevo');
      setParams(params, { replace: true });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Leads web</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 p-0.5">
            {(['tabla', 'pipeline'] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={cx(
                  'rounded-md px-3 py-1 text-sm font-medium capitalize',
                  vista === v ? 'bg-navy text-white' : 'text-slate-600',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => setNuevoOpen(true)}>+ Nuevo lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Nuevos hoy" value={kpis.nuevos} />
        <StatCard label="En seguimiento" value={kpis.seguimiento} />
        <StatCard label="Calificados" value={kpis.calificados} />
        <StatCard label="Mostrados" value={kpis.total} />
      </div>

      <Card className="space-y-2 p-3">
        <ChipRow label="Estado" valores={ESTADOS} labelFn={(e) => ESTADO_LABEL[e]} activo={fEstado} onChange={setFEstado} />
        <ChipRow label="Origen" valores={ORIGENES} labelFn={(o) => ORIGEN_LABEL[o]} activo={fOrigen} onChange={setFOrigen} />
        <ChipRow label="Interés" valores={INTERESES} labelFn={(i) => INTERES_LABEL[i]} activo={fInteres} onChange={setFInteres} />
      </Card>

      {error && (
        <Card className="p-4 text-sm text-red-700">
          No se pudieron cargar los leads: {(error as Error).message}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Cargando leads…</Card>
      ) : vista === 'pipeline' ? (
        <LeadsPipeline
          leads={filtrados}
          onMover={(id, estado) => updateEstado.mutate({ id, estado })}
          onNota={setNotaLead}
          onEliminar={eliminar}
          onDescargarOferta={descargarOferta}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Interés</th>
                <th className="px-4 py-3">Propiedad / Nota</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Oferta</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState>No hay leads con estos filtros.</EmptyState>
                  </td>
                </tr>
              ) : (
                filtrados.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{l.contactos?.nombre ?? 'Sin nombre'}</div>
                      <div className="text-xs text-slate-500">{l.contactos?.telefono ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{ORIGEN_LABEL[l.origen] ?? l.origen}</Badge>
                    </td>
                    <td className="px-4 py-3">{INTERES_LABEL[l.interes]}</td>
                    <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                      {l.propiedad_referencia || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.estado}
                        onChange={(e) =>
                          updateEstado.mutate({ id: l.id, estado: e.target.value as Estado })
                        }
                        className={cx(
                          'rounded-md border-0 px-2 py-1 text-xs font-semibold',
                          ESTADO_CLASE[l.estado],
                        )}
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {ESTADO_LABEL[e]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatearFecha(l.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {l.oferta_pdf_path ? (
                        <button
                          onClick={() => descargarOferta(l.oferta_pdf_path!)}
                          title="Descargar carta firmada"
                          className="rounded p-1.5 text-navy hover:bg-slate-100"
                        >
                          ⬇︎
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setNotaLead(l)}
                        title="Agregar nota"
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => eliminar(l)}
                        title="Eliminar"
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      <NotaModal
        lead={notaLead}
        onClose={() => setNotaLead(null)}
        onSave={async (detalle) => {
          if (!notaLead) return;
          await addNota.mutateAsync({ leadId: notaLead.id, detalle });
          setNotaLead(null);
        }}
      />
      <NuevoLeadModal open={nuevoOpen} onClose={cerrarNuevo} />
    </div>
  );
}

function ChipRow<T extends string>({
  label,
  valores,
  labelFn,
  activo,
  onChange,
}: {
  label: string;
  valores: T[];
  labelFn: (v: T) => string;
  activo: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-slate-400">{label}</span>
      <Chip active={activo === null} onClick={() => onChange(null)}>
        Todos
      </Chip>
      {valores.map((v) => (
        <Chip key={v} active={activo === v} onClick={() => onChange(v)}>
          {labelFn(v)}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full px-3 py-1 text-xs font-medium transition',
        active ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}

function NotaModal({
  lead,
  onClose,
  onSave,
}: {
  lead: LeadConContacto | null;
  onClose: () => void;
  onSave: (detalle: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title={`Nota — ${lead?.contactos?.nombre ?? 'lead'}`}
    >
      <textarea
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        placeholder="Seguimiento, llamada, próxima acción…"
        className={inputClass}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!texto.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(texto.trim());
              setTexto('');
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar nota
        </Button>
      </div>
    </Modal>
  );
}

function NuevoLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addLead = useAddLead();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [origen, setOrigen] = useState<Origen>('whatsapp');
  const [interes, setInteres] = useState<Interes>('comprar');
  const [referencia, setReferencia] = useState('');

  function reset() {
    setNombre('');
    setTelefono('');
    setOrigen('whatsapp');
    setInteres('comprar');
    setReferencia('');
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo lead">
      <div className="space-y-3">
        <Field label="Nombre">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Teléfono">
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origen">
            <select value={origen} onChange={(e) => setOrigen(e.target.value as Origen)} className={inputClass}>
              {ORIGENES.map((o) => (
                <option key={o} value={o}>
                  {ORIGEN_LABEL[o]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Interés">
            <select value={interes} onChange={(e) => setInteres(e.target.value as Interes)} className={inputClass}>
              {INTERESES.map((i) => (
                <option key={i} value={i}>
                  {INTERES_LABEL[i]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Propiedad / referencia">
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!nombre.trim() || addLead.isPending}
          onClick={async () => {
            await addLead.mutateAsync({ nombre: nombre.trim(), telefono, origen, interes, referencia });
            reset();
            onClose();
          }}
        >
          Agregar lead
        </Button>
      </div>
    </Modal>
  );
}
