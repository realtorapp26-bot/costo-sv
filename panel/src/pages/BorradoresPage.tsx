import { useEffect, useState } from 'react';
import type { ItemInventarioOferta, NuevoOfertaBorrador, OfertaBorrador } from '../lib/types';
import {
  useCreateOfertaBorrador,
  useDeleteOfertaBorrador,
  useOfertaBorradores,
  useUpdateOfertaBorrador,
} from '../lib/queries';
import { Button, Card, EmptyState, Field, Modal, inputClass } from '../components/ui';

const SITE = 'https://guerrero-properties.com';

const VACIO: NuevoOfertaBorrador = {
  nombre: '',
  tipo_oferta: null,
  ciudad_emision: null,
  propiedad_municipio: null,
  propiedad_departamento: null,
  propiedad_direccion: null,
  precio_lista: null,
  rental_term: null,
  owner_conditions: null,
  payment_method: null,
  payment_details: null,
  notas_adicionales: null,
  titulo_inventario: null,
  inventario: [],
};

function money(v: number | null) {
  if (v == null) return null;
  return 'US$ ' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function BorradoresPage() {
  const { data: borradores = [], isLoading, error } = useOfertaBorradores();
  const crear = useCreateOfertaBorrador();
  const actualizar = useUpdateOfertaBorrador();
  const borrar = useDeleteOfertaBorrador();

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<OfertaBorrador | null>(null);
  const [form, setForm] = useState<NuevoOfertaBorrador>(VACIO);
  const [items, setItems] = useState<ItemInventarioOferta[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(null), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setItems([]);
    setAviso(null);
    setAbierto(true);
  }

  function abrirEdicion(b: OfertaBorrador) {
    setEditando(b);
    setForm({
      nombre: b.nombre,
      tipo_oferta: b.tipo_oferta,
      ciudad_emision: b.ciudad_emision,
      propiedad_municipio: b.propiedad_municipio,
      propiedad_departamento: b.propiedad_departamento,
      propiedad_direccion: b.propiedad_direccion,
      precio_lista: b.precio_lista,
      rental_term: b.rental_term,
      owner_conditions: b.owner_conditions,
      payment_method: b.payment_method,
      payment_details: b.payment_details,
      notas_adicionales: b.notas_adicionales,
      titulo_inventario: b.titulo_inventario,
      inventario: b.inventario ?? [],
    });
    setItems(Array.isArray(b.inventario) ? b.inventario : []);
    setAviso(null);
    setAbierto(true);
  }

  function set<K extends keyof NuevoOfertaBorrador>(campo: K, valor: NuevoOfertaBorrador[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function texto(campo: keyof NuevoOfertaBorrador) {
    return (form[campo] as string | null) ?? '';
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setAviso('Ponele un nombre al borrador.');
      return;
    }
    const campos: NuevoOfertaBorrador = {
      ...form,
      nombre: form.nombre.trim(),
      inventario: items.filter((i) => i.item.trim() || i.descripcion.trim()),
    };
    try {
      if (editando) await actualizar.mutateAsync({ id: editando.id, campos });
      else await crear.mutateAsync(campos);
      setAbierto(false);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar.');
    }
  }

  function eliminar(b: OfertaBorrador) {
    if (!confirm(`¿Eliminar el borrador "${b.nombre}"? No se puede deshacer.`)) return;
    borrar.mutate(b.id);
  }

  function abrirCarta(b: OfertaBorrador, comoPropietario: boolean) {
    const emisor = comoPropietario ? '&emisor=PROPIETARIO' : '';
    window.open(`${SITE}/carta-oferta.html?agente=1${emisor}&borrador=${b.id}`, '_blank', 'noopener');
  }

  async function copiarLink(b: OfertaBorrador) {
    const url = `${SITE}/carta-oferta.html?borrador=${b.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(b.id);
    } catch {
      prompt('Copiá el link:', url);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Borradores de oferta</h1>
          <p className="text-sm text-slate-500">
            Una plantilla por propiedad: precarga el inmueble, el precio de lista, la forma de pago y el
            listado de bienes o generalidades en la carta de oferta.
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <i className="fas fa-plus" /> Nuevo borrador
        </Button>
      </div>

      {error ? (
        <EmptyState>No se pudieron cargar los borradores.</EmptyState>
      ) : isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !borradores.length ? (
        <EmptyState>Todavía no hay borradores guardados.</EmptyState>
      ) : (
        <div className="space-y-3">
          {borradores.map((b) => {
            const puntos = Array.isArray(b.inventario) ? b.inventario.length : 0;
            const faltan: string[] = [];
            if (!b.tipo_oferta) faltan.push('tipo de oferta');
            if (!b.propiedad_direccion) faltan.push('dirección');
            if (b.tipo_oferta === 'VENTA' && !b.payment_method) faltan.push('forma de pago');
            if (b.tipo_oferta === 'VENTA' && !b.payment_details) faltan.push('detalle de fondos');
            return (
              <Card key={b.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-navy">{b.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {[
                        b.tipo_oferta === 'ALQUILER' ? 'Alquiler' : b.tipo_oferta === 'VENTA' ? 'Venta' : null,
                        b.propiedad_direccion,
                        money(b.precio_lista),
                        puntos ? `${puntos} ${puntos === 1 ? 'punto' : 'puntos'} en el listado` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>
                {faltan.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Le falta: {faltan.join(', ')}. Quien firme va a tener que completarlo.
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" onClick={() => abrirCarta(b, false)}>
                    <i className="fas fa-pen-to-square" /> Oferta de compra
                  </Button>
                  <Button variant="outline" onClick={() => abrirCarta(b, true)}>
                    <i className="fas fa-file-export" /> Oferta de venta
                  </Button>
                  <Button variant="outline" onClick={() => abrirEdicion(b)}>
                    <i className="fas fa-pen" /> Editar
                  </Button>
                  <Button variant="outline" onClick={() => copiarLink(b)}>
                    <i className="fas fa-link" /> {copiado === b.id ? '¡Copiado!' : 'Copiar link'}
                  </Button>
                  <Button variant="outline" onClick={() => eliminar(b)}>
                    <i className="fas fa-trash" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title={editando ? `Editando: ${editando.nombre}` : 'Nuevo borrador'}
        size="xl"
      >
        <div className="space-y-4">
          <Field label="Nombre del borrador">
            <input
              className={inputClass}
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Beach Ranch - David Bamford"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de oferta">
              <select
                className={inputClass}
                value={form.tipo_oferta ?? ''}
                onChange={(e) => set('tipo_oferta', (e.target.value || null) as 'VENTA' | 'ALQUILER' | null)}
              >
                <option value="">— Sin definir —</option>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
              </select>
            </Field>
            <Field label="Ciudad de emisión">
              <input
                className={inputClass}
                value={texto('ciudad_emision')}
                onChange={(e) => set('ciudad_emision', e.target.value || null)}
                placeholder="San Salvador"
              />
            </Field>
            <Field label="Municipio del inmueble">
              <input
                className={inputClass}
                value={texto('propiedad_municipio')}
                onChange={(e) => set('propiedad_municipio', e.target.value || null)}
              />
            </Field>
            <Field label="Departamento del inmueble">
              <input
                className={inputClass}
                value={texto('propiedad_departamento')}
                onChange={(e) => set('propiedad_departamento', e.target.value || null)}
              />
            </Field>
          </div>

          <Field label="Dirección del inmueble">
            <input
              className={inputClass}
              value={texto('propiedad_direccion')}
              onChange={(e) => set('propiedad_direccion', e.target.value || null)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Precio de lista autorizado (US$)">
              <input
                type="number"
                className={inputClass}
                value={form.precio_lista ?? ''}
                onChange={(e) => set('precio_lista', e.target.value ? Number(e.target.value) : null)}
                placeholder="365000"
              />
            </Field>
            <Field label="Forma de pago">
              <select
                className={inputClass}
                value={texto('payment_method')}
                onChange={(e) => set('payment_method', e.target.value || null)}
              >
                <option value="">— Sin definir —</option>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
                <option value="Mixto">Mixto</option>
              </select>
            </Field>
          </div>

          <Field label="Detalle de entrega de fondos">
            <textarea
              className={inputClass}
              rows={2}
              value={texto('payment_details')}
              onChange={(e) => set('payment_details', e.target.value || null)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plazo de alquiler">
              <input
                className={inputClass}
                value={texto('rental_term')}
                onChange={(e) => set('rental_term', e.target.value || null)}
                placeholder="Ej: 12 meses"
              />
            </Field>
            <Field label="Condiciones al propietario">
              <input
                className={inputClass}
                value={texto('owner_conditions')}
                onChange={(e) => set('owner_conditions', e.target.value || null)}
              />
            </Field>
          </div>

          <Field label="Notas adicionales">
            <textarea
              className={inputClass}
              rows={2}
              value={texto('notas_adicionales')}
              onChange={(e) => set('notas_adicionales', e.target.value || null)}
            />
          </Field>

          <Field label="Título del listado (opcional)">
            <input
              className={inputClass}
              value={texto('titulo_inventario')}
              onChange={(e) => set('titulo_inventario', e.target.value || null)}
              placeholder="Por defecto: Bienes incluidos. Ej: Lo que incluye Golden Lake"
            />
          </Field>

          <div>
            <div className="mb-2 text-xs font-semibold text-slate-600">
              Listado (quien firme podrá desmarcar lo que no corresponda)
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputClass}
                    value={it.item}
                    placeholder="Artículo o punto"
                    onChange={(e) =>
                      setItems(items.map((x, n) => (n === i ? { ...x, item: e.target.value } : x)))
                    }
                  />
                  <input
                    className={cxInput()}
                    value={it.descripcion}
                    placeholder="Descripción / ubicación"
                    onChange={(e) =>
                      setItems(items.map((x, n) => (n === i ? { ...x, descripcion: e.target.value } : x)))
                    }
                  />
                  <input
                    className={cxInput('w-20 shrink-0')}
                    value={it.cantidad}
                    placeholder="Cant."
                    onChange={(e) =>
                      setItems(items.map((x, n) => (n === i ? { ...x, cantidad: e.target.value } : x)))
                    }
                  />
                  <Button variant="outline" onClick={() => setItems(items.filter((_, n) => n !== i))}>
                    <i className="fas fa-trash" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Button
                variant="outline"
                onClick={() => setItems([...items, { item: '', descripcion: '', cantidad: '' }])}
              >
                + Agregar punto
              </Button>
            </div>
          </div>

          {aviso && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{aviso}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={crear.isPending || actualizar.isPending}>
              {editando ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function cxInput(extra?: string) {
  return extra ? inputClass + ' ' + extra : inputClass;
}
