import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CamposContratoBorrador, ContratoComercializacion, ContratoEstado, ItemInventario, TipoListado } from '../lib/types';
import { CONTRATO_ESTADO_CLASE, CONTRATO_ESTADOS, CONTRATO_ESTADO_LABEL, TIPO_LISTADO_LABEL } from '../lib/enums';
import { formatearFecha } from '../lib/format';
import { contratoDocumentoSignedUrl, subirFirmaCorredor } from '../lib/storageContratos';
import {
  useContratoBorradores,
  useContratos,
  useCreateContrato,
  useCreateContratoBorrador,
  useDeleteContrato,
  useDeleteContratoBorrador,
  useUpdateContratoEstado,
  type NuevoContrato,
} from '../lib/queries';
import { Badge, Button, Card, ChipRow, EmptyState, Field, Modal, cx, inputClass } from '../components/ui';

const SITE = 'https://guerrero-properties.com';

function fmtMoney(n: number) {
  return 'US$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function addMonths(dateIso: string, months: number): string {
  if (!dateIso) return '';
  const d = new Date(dateIso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function ContratosPage() {
  const { data: contratos = [], isLoading, error } = useContratos();
  const updateEstado = useUpdateContratoEstado();
  const deleteContrato = useDeleteContrato();

  const [fEstado, setFEstado] = useState<ContratoEstado | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  const filtrados = useMemo(
    () => contratos.filter((c) => !fEstado || c.estado === fEstado),
    [contratos, fEstado],
  );

  function eliminar(c: ContratoComercializacion) {
    if (!confirm(`¿Eliminar el contrato de "${c.vendedor_nombre}"? No se puede deshacer.`)) return;
    deleteContrato.mutate(c.id);
  }

  async function verDocumento(path: string) {
    try {
      const url = await contratoDocumentoSignedUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('No se pudo abrir el documento.');
    }
  }

  function copiarLink(c: ContratoComercializacion) {
    const params = new URLSearchParams({ contrato: c.id, numero: c.numero });
    const url = `${SITE}/contrato-firma.html?${params.toString()}`;
    navigator.clipboard.writeText(url).then(
      () => alert(`Link para ${c.vendedor_nombre} copiado:\n\n${url}\n\nMandáselo para que revise el acuerdo y firme.`),
      () => prompt('Copiá el link:', url),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-xl font-bold text-navy">Contratos de comercialización</h1>
        <Button variant="gold" onClick={() => setNuevoOpen(true)}>
          <i className="fas fa-plus" />
          <span className="hidden sm:inline">Nuevo contrato</span>
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <ChipRow label="Estado" valores={CONTRATO_ESTADOS} labelFn={(e) => CONTRATO_ESTADO_LABEL[e]} activo={fEstado} onChange={setFEstado} />
      </Card>

      {error && (
        <Card className="p-4 text-sm text-red-700">
          No se pudieron cargar los contratos: {(error as Error).message}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Cargando…</Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <EmptyState>No hay contratos con estos filtros.</EmptyState>
        </Card>
      ) : (
        <>
          <div className="space-y-2.5 md:hidden">
            {filtrados.map((c) => (
              <ContratoCard
                key={c.id}
                contrato={c}
                onEstado={(estado) => updateEstado.mutate({ id: c.id, estado })}
                onVerDocumento={verDocumento}
                onCopiarLink={() => copiarLink(c)}
                onEliminar={() => eliminar(c)}
              />
            ))}
          </div>

          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Propiedad</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Comisión</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{c.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.vendedor_nombre}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{c.propiedad_descripcion}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtMoney(c.precio_lista)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {c.comision_porcentaje}%{c.comision_incluye_iva ? ' + IVA' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoSelect value={c.estado} onChange={(estado) => updateEstado.mutate({ id: c.id, estado })} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatearFecha(c.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.estado === 'pendiente' ? (
                        <button
                          onClick={() => copiarLink(c)}
                          title="Copiar link para el vendedor"
                          className="rounded-md bg-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <i className="fas fa-link" /> Copiar link
                        </button>
                      ) : (
                        <span title="Ya no está pendiente de firma" className="rounded p-1.5 text-emerald-600">
                          <i className="fas fa-circle-check" />
                        </span>
                      )}
                      {c.pdf_path && (
                        <button
                          onClick={() => verDocumento(c.pdf_path!)}
                          title="Descargar PDF firmado"
                          className="rounded p-1.5 text-navy hover:bg-slate-100"
                        >
                          <i className="fas fa-file-pdf" />
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(c)}
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

      <NuevoContratoModal open={nuevoOpen} onClose={() => setNuevoOpen(false)} onCreated={copiarLink} />
    </div>
  );
}

function EstadoSelect({ value, onChange }: { value: ContratoEstado; onChange: (estado: ContratoEstado) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ContratoEstado)}
      className={cx('rounded-md border-0 px-2 py-1 text-xs font-semibold', CONTRATO_ESTADO_CLASE[value])}
    >
      {CONTRATO_ESTADOS.map((e) => (
        <option key={e} value={e}>
          {CONTRATO_ESTADO_LABEL[e]}
        </option>
      ))}
    </select>
  );
}

function ContratoCard({
  contrato: c,
  onEstado,
  onVerDocumento,
  onCopiarLink,
  onEliminar,
}: {
  contrato: ContratoComercializacion;
  onEstado: (estado: ContratoEstado) => void;
  onVerDocumento: (path: string) => void;
  onCopiarLink: () => void;
  onEliminar: () => void;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{c.vendedor_nombre}</div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">{c.numero}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{c.propiedad_descripcion}</div>
        </div>
        <EstadoSelect value={c.estado} onChange={onEstado} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge>{fmtMoney(c.precio_lista)}</Badge>
        <Badge>{c.comision_porcentaje}%{c.comision_incluye_iva ? ' + IVA' : ''}</Badge>
        <span className="ml-auto text-[0.7rem] text-slate-400">{formatearFecha(c.created_at)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
        {c.estado === 'pendiente' ? (
          <button
            onClick={onCopiarLink}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
          >
            <i className="fas fa-link" /> Link
          </button>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-emerald-600">
            <i className="fas fa-circle-check" /> {CONTRATO_ESTADO_LABEL[c.estado]}
          </span>
        )}
        {c.pdf_path && (
          <button
            onClick={() => onVerDocumento(c.pdf_path!)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-navy hover:bg-slate-100"
          >
            <i className="fas fa-file-pdf" /> PDF
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

// ---------- firma del corredor (canvas) ----------
interface FirmaPadHandle {
  getDataUrl: () => string | null;
  clear: () => void;
}

const FirmaPad = forwardRef<FirmaPadHandle>(function FirmaPad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasSignatureRef = useRef(false);

  function initCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 300);
    const height = Math.max(Math.floor(rect.height), 140);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b2d5c';
  }

  useEffect(() => {
    initCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let drawing = false;
    function point(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect();
      const p = 'touches' in e && e.touches[0] ? e.touches[0] : (e as MouseEvent);
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }
    function start(e: Event) { e.preventDefault(); drawing = true; const p = point(e as MouseEvent); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    function move(e: Event) { if (!drawing) return; e.preventDefault(); const p = point(e as MouseEvent); ctx.lineTo(p.x, p.y); ctx.stroke(); hasSignatureRef.current = true; }
    function end(e: Event) { if (!drawing) return; e.preventDefault(); drawing = false; ctx.closePath(); }
    const downEvents = ['mousedown', 'touchstart'];
    const moveEvents = ['mousemove', 'touchmove'];
    const upEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];
    downEvents.forEach((ev) => canvas.addEventListener(ev, start, { passive: false }));
    moveEvents.forEach((ev) => canvas.addEventListener(ev, move, { passive: false }));
    upEvents.forEach((ev) => canvas.addEventListener(ev, end, { passive: false }));
    const onResize = () => initCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      downEvents.forEach((ev) => canvas.removeEventListener(ev, start));
      moveEvents.forEach((ev) => canvas.removeEventListener(ev, move));
      upEvents.forEach((ev) => canvas.removeEventListener(ev, end));
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => (hasSignatureRef.current && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null),
    clear: () => { hasSignatureRef.current = false; initCanvas(); },
  }));

  return (
    <div className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
      <canvas ref={canvasRef} className="block h-40 w-full cursor-crosshair touch-none" />
    </div>
  );
});

const INVENTARIO_VACIO: ItemInventario = { item: '', descripcion: '', cantidad: '' };

function NuevoContratoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: ContratoComercializacion) => void;
}) {
  const createContrato = useCreateContrato();
  const { data: borradores = [] } = useContratoBorradores();
  const createBorrador = useCreateContratoBorrador();
  const deleteBorrador = useDeleteContratoBorrador();
  const hoy = new Date().toISOString().slice(0, 10);

  const [borradorId, setBorradorId] = useState('');
  const [fechaAcuerdo, setFechaAcuerdo] = useState(hoy);
  const [vendedorNombre, setVendedorNombre] = useState('');
  const [corredorNombre, setCorredorNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [registro, setRegistro] = useState('');
  const [direccion, setDireccion] = useState('');
  const [gravamenes, setGravamenes] = useState('');
  const [certificado, setCertificado] = useState('');
  const [precio, setPrecio] = useState('');
  const [tipoListado, setTipoListado] = useState<TipoListado>('no_exclusivo');
  const [comision, setComision] = useState('5');
  const [iva, setIva] = useState(true);
  const [plazoMeses, setPlazoMeses] = useState('6');
  const [plazoInicio, setPlazoInicio] = useState(hoy);
  const [plazoFin, setPlazoFin] = useState(() => addMonths(hoy, 6));
  const [proteccionDias, setProteccionDias] = useState('180');
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const firmaRef = useRef<FirmaPadHandle>(null);

  useEffect(() => {
    setPlazoFin(addMonths(plazoInicio, parseInt(plazoMeses, 10) || 0));
  }, [plazoInicio, plazoMeses]);

  function reset() {
    setBorradorId('');
    setFechaAcuerdo(hoy);
    setVendedorNombre(''); setCorredorNombre('');
    setDescripcion(''); setRegistro(''); setDireccion(''); setGravamenes(''); setCertificado('');
    setPrecio(''); setTipoListado('no_exclusivo'); setComision('5'); setIva(true);
    setPlazoMeses('6'); setPlazoInicio(hoy); setPlazoFin(addMonths(hoy, 6)); setProteccionDias('180');
    setInventario([]); setNotas(''); setErrorMsg('');
    firmaRef.current?.clear();
  }

  function actualizarFila(i: number, campo: keyof ItemInventario, valor: string) {
    setInventario((rows) => rows.map((r, idx) => (idx === i ? { ...r, [campo]: valor } : r)));
  }

  function aplicarBorrador(id: string) {
    setBorradorId(id);
    if (!id) return;
    const b = borradores.find((x) => x.id === id);
    if (!b) return;
    const c = b.campos;
    setVendedorNombre(c.vendedor_nombre || '');
    setCorredorNombre(c.corredor_nombre || '');
    setDescripcion(c.propiedad_descripcion || '');
    setRegistro(c.propiedad_registro || '');
    setDireccion(c.propiedad_direccion || '');
    setGravamenes(c.propiedad_gravamenes || '');
    setCertificado(c.propiedad_certificado || '');
    setPrecio(c.precio_lista ? String(c.precio_lista) : '');
    setTipoListado(c.tipo_listado || 'no_exclusivo');
    setComision(c.comision_porcentaje != null ? String(c.comision_porcentaje) : '5');
    setIva(c.comision_incluye_iva !== false);
    setPlazoMeses(c.plazo_meses ? String(c.plazo_meses) : '6');
    setProteccionDias(c.periodo_proteccion_dias != null ? String(c.periodo_proteccion_dias) : '180');
    setInventario(c.inventario ? c.inventario.map((it) => ({ ...it })) : []);
    setNotas(c.notas || '');
  }

  function camposActuales(): CamposContratoBorrador {
    return {
      vendedor_nombre: vendedorNombre.trim(),
      corredor_nombre: corredorNombre.trim(),
      propiedad_descripcion: descripcion.trim(),
      propiedad_registro: registro.trim() || null,
      propiedad_direccion: direccion.trim() || null,
      propiedad_gravamenes: gravamenes.trim() || null,
      propiedad_certificado: certificado.trim() || null,
      precio_lista: parseFloat(precio) || 0,
      tipo_listado: tipoListado,
      comision_porcentaje: parseFloat(comision) || 5,
      comision_incluye_iva: iva,
      plazo_meses: parseInt(plazoMeses, 10) || 6,
      periodo_proteccion_dias: parseInt(proteccionDias, 10) || 180,
      inventario: inventario.filter((f) => f.item.trim() || f.descripcion.trim()),
      notas: notas.trim() || null,
    };
  }

  async function guardarComoBorrador() {
    const nombre = (prompt('¿Con qué nombre querés guardar este borrador?') || '').trim();
    if (!nombre) return;
    try {
      await createBorrador.mutateAsync({ nombre, campos: camposActuales() });
      alert(`Borrador "${nombre}" guardado.`);
    } catch (ex) {
      alert((ex as Error).message || 'No se pudo guardar el borrador.');
    }
  }

  async function eliminarBorradorSeleccionado() {
    const b = borradores.find((x) => x.id === borradorId);
    if (!b) return;
    if (!confirm(`¿Eliminar el borrador "${b.nombre}"? No se puede deshacer.`)) return;
    await deleteBorrador.mutateAsync(b.id);
    setBorradorId('');
  }

  async function crear() {
    if (!vendedorNombre.trim()) { setErrorMsg('Ingresá el nombre del vendedor.'); return; }
    if (!corredorNombre.trim()) { setErrorMsg('Ingresá el nombre del corredor.'); return; }
    if (!descripcion.trim()) { setErrorMsg('Describí la propiedad.'); return; }
    const precioNum = parseFloat(precio);
    if (!precioNum || precioNum <= 0) { setErrorMsg('Ingresá el precio de lista.'); return; }
    if (!plazoFin) { setErrorMsg('No se pudo calcular el fin del plazo.'); return; }
    const firmaDataUrl = firmaRef.current?.getDataUrl();
    if (!firmaDataUrl) { setErrorMsg('Falta la firma del corredor.'); return; }

    setErrorMsg('');
    setBusy(true);
    try {
      const contratoId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const firmaBlob = await (await fetch(firmaDataUrl)).blob();
      const corredorFirmaPath = await subirFirmaCorredor(firmaBlob, contratoId);

      const campos: NuevoContrato = {
        id: contratoId,
        fecha_acuerdo: fechaAcuerdo,
        vendedor_nombre: vendedorNombre.trim(),
        corredor_nombre: corredorNombre.trim(),
        propiedad_descripcion: descripcion.trim(),
        propiedad_registro: registro.trim() || null,
        propiedad_direccion: direccion.trim() || null,
        propiedad_gravamenes: gravamenes.trim() || null,
        propiedad_certificado: certificado.trim() || null,
        precio_lista: precioNum,
        tipo_listado: tipoListado,
        comision_porcentaje: parseFloat(comision) || 5,
        comision_incluye_iva: iva,
        plazo_meses: parseInt(plazoMeses, 10) || 6,
        plazo_inicio: plazoInicio,
        plazo_fin: plazoFin,
        periodo_proteccion_dias: parseInt(proteccionDias, 10) || 180,
        inventario: inventario.filter((f) => f.item.trim() || f.descripcion.trim()),
        notas: notas.trim() || null,
        corredor_firma_path: corredorFirmaPath,
      };
      const creado = await createContrato.mutateAsync(campos);
      reset();
      onClose();
      onCreated(creado);
    } catch (ex) {
      setErrorMsg((ex as Error).message || 'No se pudo crear el contrato.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo contrato de comercialización" size="xl">
      <div className="space-y-5">
        {errorMsg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</div>}

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Borrador (opcional)</h4>
          <p className="text-xs text-slate-500">Elegí un borrador para precargar el formulario, o empezá en blanco.</p>
          <div className="flex gap-2">
            <select value={borradorId} onChange={(e) => aplicarBorrador(e.target.value)} className={cx(inputClass, 'flex-1')}>
              <option value="">— Empezar en blanco —</option>
              {borradores.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
            <Button type="button" variant="danger" disabled={!borradorId} onClick={eliminarBorradorSeleccionado}>
              <i className="fas fa-trash" />
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Acuerdo</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fecha del acuerdo">
              <input type="date" value={fechaAcuerdo} onChange={(e) => setFechaAcuerdo(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Vendedor">
              <input autoFocus value={vendedorNombre} onChange={(e) => setVendedorNombre(e.target.value)} className={inputClass} placeholder="Nombre completo del vendedor" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Corredor">
                <input value={corredorNombre} onChange={(e) => setCorredorNombre(e.target.value)} className={inputClass} placeholder="Nombre de quien firma como corredor" />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Propiedad</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} placeholder="Ej: Rancho de playa, terreno rústico, 540.64 m²" />
              </Field>
            </div>
            <Field label="No. de registro">
              <input value={registro} onChange={(e) => setRegistro(e.target.value)} className={inputClass} placeholder="Matrícula..." />
            </Field>
            <Field label="Dirección">
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Gravámenes / restricciones">
                <input value={gravamenes} onChange={(e) => setGravamenes(e.target.value)} className={inputClass} placeholder="Ninguno / detalle" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Certificado de registro">
                <input value={certificado} onChange={(e) => setCertificado(e.target.value)} className={inputClass} placeholder="Certificación CNR, número de solicitud, fecha..." />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Términos clave</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Precio de lista (US$)">
              <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tipo de listado">
              <select value={tipoListado} onChange={(e) => setTipoListado(e.target.value as TipoListado)} className={inputClass}>
                <option value="no_exclusivo">{TIPO_LISTADO_LABEL.no_exclusivo}</option>
                <option value="exclusivo">{TIPO_LISTADO_LABEL.exclusivo}</option>
              </select>
            </Field>
            <Field label="Comisión (%)">
              <input type="number" min="0" step="0.1" value={comision} onChange={(e) => setComision(e.target.value)} className={inputClass} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={iva} onChange={(e) => setIva(e.target.checked)} className="rounded border-slate-300" /> + IVA
            </label>
            <Field label="Plazo (meses)">
              <input type="number" min="1" value={plazoMeses} onChange={(e) => setPlazoMeses(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Período de protección (días)">
              <input type="number" min="0" value={proteccionDias} onChange={(e) => setProteccionDias(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Inicio del plazo">
              <input type="date" value={plazoInicio} onChange={(e) => setPlazoInicio(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Fin del plazo">
              <input type="date" value={plazoFin} onChange={(e) => setPlazoFin(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Bienes incluidos (opcional)</h4>
          <p className="text-xs text-slate-500">Artículos que quedan en la propiedad, incluidos en el precio de venta.</p>
          <div className="space-y-2">
            {inventario.map((fila, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_60px_auto] gap-2">
                <input value={fila.item} onChange={(e) => actualizarFila(i, 'item', e.target.value)} className={inputClass} placeholder="Artículo" />
                <input value={fila.descripcion} onChange={(e) => actualizarFila(i, 'descripcion', e.target.value)} className={inputClass} placeholder="Descripción / ubicación" />
                <input value={fila.cantidad} onChange={(e) => actualizarFila(i, 'cantidad', e.target.value)} className={inputClass} placeholder="Cant." />
                <button
                  type="button"
                  onClick={() => setInventario((rows) => rows.filter((_, idx) => idx !== i))}
                  className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2 text-red-600 hover:bg-red-100"
                  aria-label="Quitar"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => setInventario((rows) => [...rows, { ...INVENTARIO_VACIO }])}>
            <i className="fas fa-plus" /> Agregar artículo
          </Button>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Notas (opcional)</h4>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={inputClass} placeholder="Notas internas o aclaraciones adicionales para este contrato." />
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-navy">Firma del corredor</h4>
          <p className="text-xs text-slate-500">Firmá en el recuadro -- esta firma queda impresa en el PDF final, junto a la del vendedor.</p>
          <FirmaPad ref={firmaRef} />
          <Button type="button" variant="outline" onClick={() => firmaRef.current?.clear()}>
            Limpiar firma
          </Button>
        </section>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={guardarComoBorrador}>
          <i className="fas fa-floppy-disk" /> <span className="hidden sm:inline">Guardar como borrador</span>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={crear} disabled={busy}>
            {busy ? 'Creando…' : 'Crear contrato'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
