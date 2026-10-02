import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Categoria, Propiedad, TipoContrato } from '../lib/types';
import { CATEGORIAS, PUBLICADA_CLASE, TIPO_CONTRATO_LABEL } from '../lib/enums';
import { normalizar } from '../lib/format';
import { useDeletePropiedad, usePropiedades, useTogglePublicada } from '../lib/queries';
import type { PropiedadCampos } from '../lib/queries';
import { Badge, Button, Card, ChipRow, EmptyState, StatCard, cx, inputClass } from '../components/ui';
import { PropiedadFormModal } from './PropiedadFormModal';
import { ImportarPropiedad } from './ImportarPropiedad';

type FiltroPublicada = 'si' | 'no';

export function PropiedadesPage() {
  const { data: propiedades = [], isLoading, error } = usePropiedades();
  const togglePublicada = useTogglePublicada();
  const eliminarMutacion = useDeletePropiedad();

  const [params, setParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [fCategoria, setFCategoria] = useState<Categoria | null>(null);
  const [fContrato, setFContrato] = useState<TipoContrato | null>(null);
  const [fPublicada, setFPublicada] = useState<FiltroPublicada | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Propiedad | null>(null);
  const [borrador, setBorrador] = useState<Partial<PropiedadCampos> | null>(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [procesandoLote, setProcesandoLote] = useState(false);

  // Deep link ?editar=<id> -- abre directo en edición (mismo uso que el
  // enlace "Editar" de las mini-tarjetas del panel clásico).
  useEffect(() => {
    const id = params.get('editar');
    if (!id || !propiedades.length) return;
    const p = propiedades.find((x) => x.id === id);
    if (p) {
      setEditando(p);
      setFormAbierto(true);
    }
    params.delete('editar');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propiedades]);

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda);
    return propiedades.filter((p) => {
      if (fCategoria && p.categoria !== fCategoria) return false;
      if (fContrato && p.tipo_contrato !== fContrato) return false;
      if (fPublicada === 'si' && !p.publicada) return false;
      if (fPublicada === 'no' && p.publicada) return false;
      if (q) {
        const texto = normalizar(`${p.titulo} ${p.ubicacion ?? ''} ${p.categoria}`);
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [propiedades, fCategoria, fContrato, fPublicada, busqueda]);

  const kpis = useMemo(
    () => ({
      publicadas: propiedades.filter((p) => p.publicada).length,
      ocultas: propiedades.filter((p) => !p.publicada).length,
      total: propiedades.length,
      mostradas: filtradas.length,
    }),
    [propiedades, filtradas],
  );

  function nueva() {
    setEditando(null);
    setBorrador(null);
    setFormAbierto(true);
  }

  function editar(p: Propiedad) {
    setEditando(p);
    setFormAbierto(true);
  }

  function eliminar(p: Propiedad) {
    if (!confirm(`¿Eliminar "${p.titulo}"? No se puede deshacer.`)) return;
    eliminarMutacion.mutate(p.id);
  }

  function toggleSeleccion(id: string, marcada: boolean) {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      if (marcada) copia.add(id);
      else copia.delete(id);
      return copia;
    });
  }

  function toggleSeleccionarTodasVisibles(marcarTodas: boolean) {
    setSeleccionadas((prev) => {
      const copia = new Set(prev);
      filtradas.forEach((p) => (marcarTodas ? copia.add(p.id) : copia.delete(p.id)));
      return copia;
    });
  }

  const todasVisiblesSeleccionadas = filtradas.length > 0 && filtradas.every((p) => seleccionadas.has(p.id));

  async function publicarOcultarSeleccionadas(publicada: boolean) {
    setProcesandoLote(true);
    try {
      for (const id of seleccionadas) {
        await togglePublicada.mutateAsync({ id, publicada });
      }
      setSeleccionadas(new Set());
    } finally {
      setProcesandoLote(false);
    }
  }

  async function eliminarSeleccionadas() {
    const n = seleccionadas.size;
    if (!confirm(`¿Eliminar ${n} propiedad${n === 1 ? '' : 'es'} seleccionada${n === 1 ? '' : 's'}? No se puede deshacer.`)) return;
    setProcesandoLote(true);
    try {
      for (const id of seleccionadas) {
        await eliminarMutacion.mutateAsync(id);
      }
      setSeleccionadas(new Set());
    } finally {
      setProcesandoLote(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-xl font-bold text-navy">Propiedades</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportarAbierto((v) => !v)}>
            <i className="fas fa-cloud-arrow-down" />
            <span className="hidden sm:inline">Importar de RE/MAX</span>
          </Button>
          <Button variant="gold" onClick={nueva}>
            <i className="fas fa-plus" />
            <span className="hidden sm:inline">Nueva propiedad</span>
          </Button>
        </div>
      </div>

      {importarAbierto && (
        <ImportarPropiedad
          propiedadesExistentes={propiedades}
          onBorrador={(campos) => {
            setEditando(null);
            setBorrador(campos);
            setFormAbierto(true);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Publicadas" value={kpis.publicadas} icon="fas fa-eye" tono="emerald" />
        <StatCard label="Ocultas" value={kpis.ocultas} icon="fas fa-eye-slash" tono="amber" />
        <StatCard label="Total" value={kpis.total} icon="fas fa-house" tono="navy" />
        <StatCard label="Mostradas" value={kpis.mostradas} icon="fas fa-filter" tono="blue" />
      </div>

      <Card className="space-y-2.5 p-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o ubicación..."
          className={inputClass}
        />
        <ChipRow label="Categoría" valores={CATEGORIAS} labelFn={(c) => c} activo={fCategoria} onChange={setFCategoria} />
        <ChipRow
          label="Contrato"
          valores={['venta', 'alquiler'] as TipoContrato[]}
          labelFn={(c) => TIPO_CONTRATO_LABEL[c]}
          activo={fContrato}
          onChange={setFContrato}
        />
        <ChipRow
          label="Estado"
          valores={['si', 'no'] as FiltroPublicada[]}
          labelFn={(v) => (v === 'si' ? 'Publicadas' : 'Ocultas')}
          activo={fPublicada}
          onChange={setFPublicada}
        />
      </Card>

      {seleccionadas.size > 0 && (
        <Card className="flex flex-wrap items-center gap-2 border-navy/20 bg-navy/5 p-3">
          <span className="text-sm font-semibold text-navy">
            {seleccionadas.size} seleccionada{seleccionadas.size === 1 ? '' : 's'}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={procesandoLote} onClick={() => publicarOcultarSeleccionadas(true)}>
              <i className="fas fa-eye" /> Publicar
            </Button>
            <Button variant="outline" disabled={procesandoLote} onClick={() => publicarOcultarSeleccionadas(false)}>
              <i className="fas fa-eye-slash" /> Ocultar
            </Button>
            <Button variant="danger" disabled={procesandoLote} onClick={eliminarSeleccionadas}>
              <i className="fas fa-trash" /> Eliminar
            </Button>
            <Button variant="ghost" disabled={procesandoLote} onClick={() => setSeleccionadas(new Set())}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 text-sm text-red-700">
          No se pudieron cargar las propiedades: {(error as Error).message}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Cargando propiedades…</Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <EmptyState>No hay propiedades con estos filtros.</EmptyState>
        </Card>
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="space-y-2.5 md:hidden">
            {filtradas.map((p) => (
              <PropiedadCard
                key={p.id}
                p={p}
                seleccionada={seleccionadas.has(p.id)}
                onSeleccionar={(marcada) => toggleSeleccion(p.id, marcada)}
                onTogglePublicada={() => togglePublicada.mutate({ id: p.id, publicada: !p.publicada })}
                onEditar={() => editar(p)}
                onEliminar={() => eliminar(p)}
              />
            ))}
          </div>

          {/* Desktop/tablet: tabla */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={todasVisiblesSeleccionadas}
                      onChange={(e) => toggleSeleccionarTodasVisibles(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
                      aria-label="Seleccionar todas las visibles"
                    />
                  </th>
                  <th className="px-4 py-3">Foto</th>
                  <th className="px-4 py-3">Título / Ubicación</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Publicada</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(p.id)}
                        onChange={(e) => toggleSeleccion(p.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
                        aria-label={`Seleccionar ${p.titulo}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-12 w-16 overflow-hidden rounded-md bg-slate-100">
                        {p.fotos?.[0] && <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                    </td>
                    <td className="max-w-[18rem] px-4 py-3">
                      <div className="truncate font-medium text-slate-800">{p.titulo}</div>
                      {p.ubicacion && <div className="truncate text-xs text-slate-500">{p.ubicacion}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.categoria}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{p.precio}</td>
                    <td className="px-4 py-3">{TIPO_CONTRATO_LABEL[p.tipo_contrato]}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublicada.mutate({ id: p.id, publicada: !p.publicada })}
                        className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', PUBLICADA_CLASE[p.publicada ? 'si' : 'no'])}
                      >
                        {p.publicada ? 'Publicada' : 'Oculta'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button onClick={() => editar(p)} title="Editar" className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                        <i className="fas fa-pen" />
                      </button>
                      <button onClick={() => eliminar(p)} title="Eliminar" className="rounded p-1.5 text-red-500 hover:bg-red-50">
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

      <PropiedadFormModal
        propiedad={editando}
        borrador={borrador}
        open={formAbierto}
        onClose={() => setFormAbierto(false)}
      />
    </div>
  );
}

function PropiedadCard({
  p,
  seleccionada,
  onSeleccionar,
  onTogglePublicada,
  onEditar,
  onEliminar,
}: {
  p: Propiedad;
  seleccionada: boolean;
  onSeleccionar: (marcada: boolean) => void;
  onTogglePublicada: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <Card className="flex gap-3 p-3">
      <input
        type="checkbox"
        checked={seleccionada}
        onChange={(e) => onSeleccionar(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-navy focus:ring-navy/30"
        aria-label={`Seleccionar ${p.titulo}`}
      />
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {p.fotos?.[0] && <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-slate-800">{p.titulo}</div>
        {p.ubicacion && <div className="truncate text-xs text-slate-500">{p.ubicacion}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge>{p.categoria}</Badge>
          <Badge className="bg-slate-100 text-slate-600">{TIPO_CONTRATO_LABEL[p.tipo_contrato]}</Badge>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-semibold text-navy">{p.precio}</span>
          <button
            onClick={onTogglePublicada}
            className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', PUBLICADA_CLASE[p.publicada ? 'si' : 'no'])}
          >
            {p.publicada ? 'Publicada' : 'Oculta'}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2">
          <button
            onClick={onEditar}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <i className="fas fa-pen" /> Editar
          </button>
          <button
            onClick={onEliminar}
            className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            aria-label="Eliminar"
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      </div>
    </Card>
  );
}
