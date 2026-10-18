import { useMemo, useState } from 'react';
import type { KycClienteTipo, KycEstado, KycSolicitud } from '../lib/types';
import { KYC_CLIENTE_TIPO_LABEL, KYC_ESTADOS, KYC_ESTADO_CLASE, KYC_ESTADO_LABEL, KYC_MOTIVO_PLANTILLAS } from '../lib/enums';
import { formatearFecha } from '../lib/format';
import { kycDocumentoSignedUrl, subirDocumentoKyc } from '../lib/storageKyc';
import { useCreateKyc, useDeleteKyc, useKyc, useUpdateKycEstado, type NuevoKyc } from '../lib/queries';
import { Badge, Button, Card, ChipRow, EmptyState, Field, Modal, cx, inputClass } from '../components/ui';

export function KycPage() {
  const { data: casos = [], isLoading, error } = useKyc();
  const updateEstado = useUpdateKycEstado();
  const deleteKyc = useDeleteKyc();

  const [fEstado, setFEstado] = useState<KycEstado | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const filtrados = useMemo(
    () =>
      casos.filter(
        (k) => (!fEstado || k.estado === fEstado) && (!soloPendientes || k.estado === 'pendiente'),
      ),
    [casos, fEstado, soloPendientes],
  );

  function eliminar(caso: KycSolicitud) {
    if (!confirm(`¿Eliminar el caso de KYC de "${caso.cliente_nombre}"? No se puede deshacer.`)) return;
    deleteKyc.mutate(caso.id);
  }

  async function verDocumento(path: string) {
    try {
      const url = await kycDocumentoSignedUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('No se pudo abrir el documento.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-xl font-bold text-navy">KYC / Cumplimiento</h1>
        <Button variant="gold" onClick={() => setNuevoOpen(true)}>
          <i className="fas fa-plus" />
          <span className="hidden sm:inline">Nuevo KYC</span>
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <ChipRow label="Estado" valores={KYC_ESTADOS} labelFn={(e) => KYC_ESTADO_LABEL[e]} activo={fEstado} onChange={setFEstado} />
        <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
            className="rounded border-slate-300"
          />
          Solo pendientes
        </label>
      </Card>

      {error && (
        <Card className="p-4 text-sm text-red-700">
          No se pudieron cargar los KYC: {(error as Error).message}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Cargando…</Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState>No hay casos de KYC con estos filtros.</EmptyState>
        </Card>
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="space-y-2.5 md:hidden">
            {filtrados.map((k) => (
              <KycCard
                key={k.id}
                caso={k}
                onEstado={(estado) => updateEstado.mutate({ id: k.id, estado })}
                onVerDocumento={verDocumento}
                onEliminar={() => eliminar(k)}
              />
            ))}
          </div>

          {/* Desktop/tablet: tabla */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Oficina</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Creada</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((k) => (
                  <tr key={k.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{k.numero}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{k.cliente_nombre}</div>
                      {k.cliente_correo && (
                        <a href={`mailto:${k.cliente_correo}`} className="text-xs text-slate-500 hover:underline">
                          {k.cliente_correo}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{k.solicitante}</td>
                    <td className="px-4 py-3 text-slate-600">{k.oficina}</td>
                    <td className="px-4 py-3">
                      <EstadoSelect value={k.estado} onChange={(estado) => updateEstado.mutate({ id: k.id, estado })} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {k.vence_at ? new Date(`${k.vence_at}T00:00:00`).toLocaleDateString('es-SV') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatearFecha(k.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {k.doc_frontal_path && (
                        <button
                          onClick={() => verDocumento(k.doc_frontal_path!)}
                          title="Ver documento frontal"
                          className="rounded p-1.5 text-navy hover:bg-slate-100"
                        >
                          <i className="fas fa-id-card" />
                        </button>
                      )}
                      {k.doc_reverso_path && (
                        <button
                          onClick={() => verDocumento(k.doc_reverso_path!)}
                          title="Ver documento reverso"
                          className="rounded p-1.5 text-navy hover:bg-slate-100"
                        >
                          <i className="fas fa-id-card-clip" />
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(k)}
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

      <NuevoKycModal open={nuevoOpen} onClose={() => setNuevoOpen(false)} />
    </div>
  );
}

function EstadoSelect({ value, onChange }: { value: KycEstado; onChange: (estado: KycEstado) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as KycEstado)}
      className={cx('rounded-md border-0 px-2 py-1 text-xs font-semibold', KYC_ESTADO_CLASE[value])}
    >
      {KYC_ESTADOS.map((e) => (
        <option key={e} value={e}>
          {KYC_ESTADO_LABEL[e]}
        </option>
      ))}
    </select>
  );
}

function KycCard({
  caso: k,
  onEstado,
  onVerDocumento,
  onEliminar,
}: {
  caso: KycSolicitud;
  onEstado: (estado: KycEstado) => void;
  onVerDocumento: (path: string) => void;
  onEliminar: () => void;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{k.cliente_nombre}</div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">{k.numero}</div>
          {k.cliente_correo && (
            <a href={`mailto:${k.cliente_correo}`} className="mt-0.5 block truncate text-xs text-slate-500 hover:underline">
              {k.cliente_correo}
            </a>
          )}
        </div>
        <EstadoSelect value={k.estado} onChange={onEstado} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge>{k.oficina}</Badge>
        <span className="ml-auto text-[0.7rem] text-slate-400">{formatearFecha(k.created_at)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
        {k.doc_frontal_path && (
          <button
            onClick={() => onVerDocumento(k.doc_frontal_path!)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
          >
            <i className="fas fa-id-card" /> Frontal
          </button>
        )}
        {k.doc_reverso_path && (
          <button
            onClick={() => onVerDocumento(k.doc_reverso_path!)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
          >
            <i className="fas fa-id-card-clip" /> Reverso
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

function NuevoKycModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createKyc = useCreateKyc();
  const [tipo, setTipo] = useState<KycClienteTipo>('persona_natural');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [frontal, setFrontal] = useState<File | null>(null);
  const [reverso, setReverso] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setTipo('persona_natural');
    setNombre('');
    setCorreo('');
    setMotivo('');
    setFrontal(null);
    setReverso(null);
    setErrorMsg('');
  }

  async function crear() {
    if (!nombre.trim()) { setErrorMsg('Ingresá el nombre del cliente.'); return; }
    if (!motivo.trim()) { setErrorMsg('Describí el motivo de la diligencia.'); return; }
    setErrorMsg('');
    setBusy(true);
    try {
      const casoId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const campos: NuevoKyc = {
        cliente_tipo: tipo,
        cliente_nombre: nombre.trim(),
        cliente_correo: correo.trim() || null,
        motivo_diligencia: motivo.trim(),
        doc_frontal_path: frontal ? await subirDocumentoKyc(frontal, casoId, 'frontal') : null,
        doc_reverso_path: reverso ? await subirDocumentoKyc(reverso, casoId, 'reverso') : null,
      };
      await createKyc.mutateAsync(campos);
      reset();
      onClose();
    } catch (ex) {
      setErrorMsg((ex as Error).message || 'No se pudo crear el KYC.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo KYC" size="xl">
      <div className="space-y-5">
        {errorMsg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div>}

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Datos del cliente</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Oficina de trabajo">
              <input value="RE/MAX Elite El Salvador" disabled className={cx(inputClass, 'text-slate-400')} />
            </Field>
            <Field label="Solicitado por">
              <input value="Walter Guerrero" disabled className={cx(inputClass, 'text-slate-400')} />
            </Field>
            <Field label="Tipo de cliente">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as KycClienteTipo)} className={inputClass}>
                {(Object.keys(KYC_CLIENTE_TIPO_LABEL) as KycClienteTipo[]).map((t) => (
                  <option key={t} value={t}>
                    {KYC_CLIENTE_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del cliente">
              <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Correo electrónico del cliente">
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Motivo de la diligencia</h4>
          <p className="text-xs text-slate-500">¿Por qué se solicita esta diligencia?</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(KYC_MOTIVO_PLANTILLAS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMotivo(p.texto)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.slice(0, 1000))}
            rows={4}
            maxLength={1000}
            placeholder="Describa el caso concreto: inmueble, monto aproximado, forma de pago y cómo se originó la relación con el cliente."
            className={inputClass}
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>No incluyas resultados AML ni decisiones de Cumplimiento.</span>
            <span>{motivo.length}/1000</span>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Documento de identificación</h4>
          <p className="text-xs text-slate-500">
            Adjuntá ambos lados si los tenés. PDF, JPG o PNG; hasta 20MB por archivo. Es opcional: podés crear el
            caso y subirlos después.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Documento de identificación frontal">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFrontal(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
            </Field>
            <Field label="Documento de identificación reverso">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setReverso(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button onClick={crear} disabled={busy}>
          {busy ? 'Creando…' : 'Crear KYC'}
        </Button>
      </div>
    </Modal>
  );
}
