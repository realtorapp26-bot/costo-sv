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
  ORIGEN_ICONO,
  ORIGEN_LABEL,
} from '../lib/enums';
import { esHoy, formatearFecha, waHref } from '../lib/format';
import {
  ofertaSignedUrl,
  useAddLead,
  useAddNota,
  useDeleteLead,
  useLeads,
  useUpdateLeadEstado,
} from '../lib/queries';
import { Badge, Button, Card, ChipRow, EmptyState, Field, Modal, StatCard, cx, inputClass } from '../components/ui';
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
  const [detalleLead, setDetalleLead] = useState<LeadConContacto | null>(null);
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
        <h1 className="font-serif text-xl font-bold text-navy">Leads web</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 p-0.5">
            {(
              [
                { v: 'tabla', icon: 'fas fa-list', label: 'Lista' },
                { v: 'pipeline', icon: 'fas fa-table-columns', label: 'Pipeline' },
              ] as const
            ).map(({ v, icon, label }) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium',
                  vista === v ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <i className={icon} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Button variant="gold" onClick={() => setNuevoOpen(true)}>
            <i className="fas fa-plus" />
            <span className="hidden sm:inline">Nuevo lead</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Nuevos hoy" value={kpis.nuevos} icon="fas fa-bolt" tono="blue" />
        <StatCard label="En seguimiento" value={kpis.seguimiento} icon="fas fa-clock" tono="amber" />
        <StatCard label="Calificados" value={kpis.calificados} icon="fas fa-circle-check" tono="emerald" />
        <StatCard label="Mostrados" value={kpis.total} icon="fas fa-filter" tono="navy" />
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
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState>No hay leads con estos filtros.</EmptyState>
        </Card>
      ) : (
        <>
          {/* Mobile: tarjetas (una tabla de 8 columnas no se puede leer en un
              celular -- esta es la vista por defecto bajo el breakpoint md). */}
          <div className="space-y-2.5 md:hidden">
            {filtrados.map((l) => (
              <LeadCard
                key={l.id}
                lead={l}
                onEstado={(estado) => updateEstado.mutate({ id: l.id, estado })}
                onVer={() => setDetalleLead(l)}
                onNota={() => setNotaLead(l)}
                onEliminar={() => eliminar(l)}
                onDescargarOferta={descargarOferta}
              />
            ))}
          </div>

          {/* Desktop/tablet: tabla completa */}
          <Card className="hidden overflow-x-auto md:block">
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
                {filtrados.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{l.contactos?.nombre ?? 'Sin nombre'}</div>
                      {l.contactos?.telefono && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <a href={`tel:${l.contactos.telefono}`} className="hover:underline" title="Llamar">
                            {l.contactos.telefono}
                          </a>
                          {waHref(l.contactos.telefono) && (
                            <a
                              href={waHref(l.contactos.telefono)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir WhatsApp"
                              className="text-[#25d366]"
                            >
                              <i className="fab fa-whatsapp" />
                            </a>
                          )}
                        </div>
                      )}
                      {l.contactos?.correo && (
                        <a
                          href={`mailto:${l.contactos.correo}`}
                          className="text-xs text-slate-500 hover:underline"
                          title="Enviar correo"
                        >
                          {l.contactos.correo}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>
                        <i className={cx(ORIGEN_ICONO[l.origen], 'mr-1')} />
                        {ORIGEN_LABEL[l.origen] ?? l.origen}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{INTERES_LABEL[l.interes]}</td>
                    <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                      {l.propiedad_referencia || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoSelect value={l.estado} onChange={(estado) => updateEstado.mutate({ id: l.id, estado })} />
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
                          <i className="fas fa-file-arrow-down" />
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setDetalleLead(l)}
                        title="Ver detalle"
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <i className="fas fa-eye" />
                      </button>
                      <button
                        onClick={() => setNotaLead(l)}
                        title="Agregar nota"
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        onClick={() => eliminar(l)}
                        title="Eliminar"
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <DetalleModal lead={detalleLead} onClose={() => setDetalleLead(null)} />
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

function EstadoSelect({ value, onChange }: { value: Estado; onChange: (estado: Estado) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Estado)}
      className={cx('rounded-md border-0 px-2 py-1 text-xs font-semibold', ESTADO_CLASE[value])}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>
          {ESTADO_LABEL[e]}
        </option>
      ))}
    </select>
  );
}

// Tarjeta de lead para mobile -- reemplaza a la fila de tabla, que con 8
// columnas no entra en una pantalla de celular ni siendo scrolleable.
function LeadCard({
  lead: l,
  onEstado,
  onVer,
  onNota,
  onEliminar,
  onDescargarOferta,
}: {
  lead: LeadConContacto;
  onEstado: (estado: Estado) => void;
  onVer: () => void;
  onNota: () => void;
  onEliminar: () => void;
  onDescargarOferta: (path: string) => void;
}) {
  const c = l.contactos;
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{c?.nombre ?? 'Sin nombre'}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {c?.telefono && (
              <a href={`tel:${c.telefono}`} className="flex items-center gap-1 hover:underline">
                <i className="fas fa-phone" /> {c.telefono}
              </a>
            )}
            {c?.telefono && waHref(c.telefono) && (
              <a
                href={waHref(c.telefono)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#25d366]"
              >
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
            )}
          </div>
          {c?.correo && (
            <a href={`mailto:${c.correo}`} className="mt-0.5 block truncate text-xs text-slate-500 hover:underline">
              {c.correo}
            </a>
          )}
        </div>
        <EstadoSelect value={l.estado} onChange={onEstado} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge>
          <i className={cx(ORIGEN_ICONO[l.origen], 'mr-1')} />
          {ORIGEN_LABEL[l.origen] ?? l.origen}
        </Badge>
        <Badge className="bg-slate-100 text-slate-600">{INTERES_LABEL[l.interes]}</Badge>
        <span className="ml-auto text-[0.7rem] text-slate-400">{formatearFecha(l.created_at)}</span>
      </div>

      {l.propiedad_referencia && (
        <div className="mt-2 line-clamp-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
          {l.propiedad_referencia}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
        <button
          onClick={onVer}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <i className="fas fa-eye" /> Ver
        </button>
        <button
          onClick={onNota}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <i className="fas fa-pen" /> Nota
        </button>
        {l.oferta_pdf_path && (
          <button
            onClick={() => onDescargarOferta(l.oferta_pdf_path!)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
          >
            <i className="fas fa-file-arrow-down" /> Oferta
          </button>
        )}
        <button
          onClick={onEliminar}
          className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
          aria-label="Eliminar"
        >
          <i className="fas fa-trash" />
        </button>
      </div>
    </Card>
  );
}

function DetalleModal({ lead, onClose }: { lead: LeadConContacto | null; onClose: () => void }) {
  return (
    <Modal open={!!lead} onClose={onClose} title={`Detalle — ${lead?.contactos?.nombre ?? 'lead'}`}>
      {lead && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Teléfono:</span>{' '}
              {lead.contactos?.telefono || '—'}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Correo:</span>{' '}
              {lead.contactos?.correo || '—'}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Origen:</span>{' '}
              {ORIGEN_LABEL[lead.origen] ?? lead.origen}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Interés:</span>{' '}
              {INTERES_LABEL[lead.interes]}
            </div>
            {lead.propiedad_referencia && (
              <div className="col-span-2">
                <span className="font-semibold text-slate-800">Propiedad / Anuncio:</span>{' '}
                {lead.propiedad_referencia}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 font-semibold text-slate-800">Respuestas del formulario</div>
            <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-slate-600">
              {lead.notas || 'Sin respuestas adicionales.'}
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
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
