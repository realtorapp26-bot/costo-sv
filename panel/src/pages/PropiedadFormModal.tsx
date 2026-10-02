import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Categoria, Propiedad, TipoContrato } from '../lib/types';
import { CATEGORIAS, TIPO_CONTRATO_LABEL } from '../lib/enums';
import type { PropiedadCampos } from '../lib/queries';
import { useCreatePropiedad, useUpdatePropiedad } from '../lib/queries';
import { Button, Field, Modal, inputClass } from '../components/ui';
import { ImageUploader } from '../components/ImageUploader';

const VACIO: PropiedadCampos = {
  orden: null,
  publicada: true,
  titulo: '',
  precio: '',
  ubicacion: '',
  categoria: 'Vivienda Residencial',
  tipo_contrato: 'venta',
  tipo_propiedad_detalle: '',
  habitaciones: '',
  banos: '',
  m2: '',
  tamano_lote: '',
  tamano_construccion: '',
  latitud: null,
  longitud: null,
  garage: false,
  hoa: false,
  comunidad_cerrada: false,
  propiedad_nueva: false,
  fotos: [],
  tour_virtual_url: '',
  video_url: '',
  descripcion_original: '',
  copy_venta: '',
  link_referencia: null,
  id_externo: null,
  fecha_publicacion: null,
};

function camposDesde(p: Propiedad | null): PropiedadCampos {
  if (!p) return { ...VACIO };
  const { id: _id, slug: _slug, created_at: _creado, updated_at: _actualizado, ...resto } = p;
  return resto;
}

const checkboxClass = 'h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30';

export function PropiedadFormModal({
  propiedad,
  open,
  onClose,
}: {
  propiedad: Propiedad | null;
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PropiedadCampos>(() => camposDesde(propiedad));
  const crear = useCreatePropiedad();
  const actualizar = useUpdatePropiedad();
  const guardando = crear.isPending || actualizar.isPending;
  const esEdicion = !!propiedad;

  useEffect(() => {
    if (open) setForm(camposDesde(propiedad));
  }, [open, propiedad]);

  function set<K extends keyof PropiedadCampos>(campo: K, valor: PropiedadCampos[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function guardar() {
    if (!form.titulo.trim()) return;
    if (esEdicion && propiedad) {
      await actualizar.mutateAsync({ id: propiedad.id, campos: form });
    } else {
      await crear.mutateAsync(form);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={esEdicion ? `Editar — ${propiedad?.titulo}` : 'Nueva propiedad'}
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <Seccion titulo="Básico">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Título">
              <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} className={inputClass} autoFocus />
            </Field>
            <Field label="Precio">
              <input value={form.precio} onChange={(e) => set('precio', e.target.value)} placeholder="$150,000" className={inputClass} />
            </Field>
            <Field label="Ubicación">
              <input value={form.ubicacion ?? ''} onChange={(e) => set('ubicacion', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Categoría">
              <select
                value={form.categoria}
                onChange={(e) => set('categoria', e.target.value as Categoria)}
                className={inputClass}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de contrato">
              <select
                value={form.tipo_contrato}
                onChange={(e) => set('tipo_contrato', e.target.value as TipoContrato)}
                className={inputClass}
              >
                {Object.entries(TIPO_CONTRATO_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de propiedad">
              <input
                value={form.tipo_propiedad_detalle ?? ''}
                onChange={(e) => set('tipo_propiedad_detalle', e.target.value)}
                placeholder="Casa, Lote/Terreno, Apartamento..."
                className={inputClass}
              />
            </Field>
          </div>
        </Seccion>

        <Seccion titulo="Características">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Habitaciones">
              <input value={form.habitaciones ?? ''} onChange={(e) => set('habitaciones', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Baños">
              <input value={form.banos ?? ''} onChange={(e) => set('banos', e.target.value)} className={inputClass} />
            </Field>
            <Field label="m²">
              <input value={form.m2 ?? ''} onChange={(e) => set('m2', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tamaño de lote">
              <input value={form.tamano_lote ?? ''} onChange={(e) => set('tamano_lote', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tamaño construcción">
              <input
                value={form.tamano_construccion ?? ''}
                onChange={(e) => set('tamano_construccion', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {(
              [
                ['garage', 'Garage'],
                ['hoa', 'HOA'],
                ['comunidad_cerrada', 'Comunidad cerrada'],
                ['propiedad_nueva', 'Propiedad nueva'],
              ] as const
            ).map(([campo, label]) => (
              <label key={campo} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!form[campo]}
                  onChange={(e) => set(campo, e.target.checked)}
                  className={checkboxClass}
                />
                {label}
              </label>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Contenido">
          <Field label="Descripción original">
            <textarea
              value={form.descripcion_original ?? ''}
              onChange={(e) => set('descripcion_original', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>
          <div className="mt-3">
            <Field label="Copy de venta (el que se muestra en el sitio)">
              <textarea
                value={form.copy_venta ?? ''}
                onChange={(e) => set('copy_venta', e.target.value)}
                rows={4}
                className={inputClass}
              />
            </Field>
          </div>
        </Seccion>

        <Seccion titulo="Multimedia">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tour virtual (URL)">
              <input value={form.tour_virtual_url ?? ''} onChange={(e) => set('tour_virtual_url', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Video (URL de YouTube)">
              <input value={form.video_url ?? ''} onChange={(e) => set('video_url', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-3">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Fotos</span>
            <ImageUploader value={form.fotos ?? []} onChange={(fotos) => set('fotos', fotos)} />
          </div>
        </Seccion>

        {(form.link_referencia || form.id_externo) && (
          <Seccion titulo="Origen RE/MAX (solo lectura)">
            <div className="space-y-1 text-xs text-slate-500">
              {form.link_referencia && (
                <div>
                  Link:{' '}
                  <a href={form.link_referencia} target="_blank" rel="noopener noreferrer" className="text-navy underline">
                    {form.link_referencia}
                  </a>
                </div>
              )}
              {form.id_externo && <div>ID externo: {form.id_externo}</div>}
              {form.fecha_publicacion && <div>Fecha de publicación: {form.fecha_publicacion}</div>}
            </div>
          </Seccion>
        )}

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.publicada}
            onChange={(e) => set('publicada', e.target.checked)}
            className={checkboxClass}
          />
          Publicada (visible en el sitio web)
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!form.titulo.trim() || guardando} onClick={guardar}>
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear propiedad'}
        </Button>
      </div>
    </Modal>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{titulo}</h4>
      {children}
    </div>
  );
}
