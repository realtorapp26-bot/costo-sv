import { useMemo, useState } from 'react';
import type { Carta, CartaTipo } from '../lib/types';
import { CARTA_TIPOS, CARTA_TIPO_CLASE, CARTA_TIPO_LABEL } from '../lib/enums';
import { formatearFecha } from '../lib/format';
import { ofertaSignedUrl, useCartas, useDeleteCarta } from '../lib/queries';
import { Badge, Button, Card, ChipRow, EmptyState, Modal, cx } from '../components/ui';

function money(v: number | null | undefined) {
  if (v == null) return '—';
  return 'US$ ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function abrirPdf(path: string) {
  try {
    const url = await ofertaSignedUrl(path);
    window.open(url, '_blank', 'noopener');
  } catch {
    alert('No se pudo abrir el PDF firmado.');
  }
}

export function CartasPage() {
  const { data: cartas = [], isLoading, error } = useCartas();
  const deleteCarta = useDeleteCarta();

  const [fTipo, setFTipo] = useState<CartaTipo | null>(null);
  const [detalle, setDetalle] = useState<Carta | null>(null);

  const filtradas = useMemo(
    () => cartas.filter((c) => !fTipo || c.tipo === fTipo),
    [cartas, fTipo],
  );

  function eliminar(c: Carta) {
    if (!confirm(`¿Eliminar del archivo la carta ${c.numero}? No se puede deshacer.`)) return;
    deleteCarta.mutate(c.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-navy">Cartas</h1>
        <p className="text-sm text-slate-500">
          Archivo de las cartas generadas y firmadas: ofertas de compradores, aceptaciones y contraofertas
          de propietarios. Cada una guarda sus términos y el PDF firmado.
        </p>
      </div>

      <ChipRow
        label="Tipo"
        valores={CARTA_TIPOS}
        labelFn={(t) => CARTA_TIPO_LABEL[t]}
        activo={fTipo}
        onChange={setFTipo}
      />

      {error ? (
        <EmptyState>No se pudieron cargar las cartas.</EmptyState>
      ) : isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !filtradas.length ? (
        <EmptyState>
          Todavía no hay cartas archivadas. Se guardan solas cada vez que alguien genera una carta de
          oferta o de respuesta.
        </EmptyState>
      ) : (
        <>
          {/* Tabla en escritorio */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="p-3">Número</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Propietario</th>
                  <th className="p-3">Inmueble</th>
                  <th className="p-3 text-right">Monto</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-medium text-navy">{c.numero}</td>
                    <td className="p-3">
                      <Badge className={CARTA_TIPO_CLASE[c.tipo]}>{CARTA_TIPO_LABEL[c.tipo]}</Badge>
                    </td>
                    <td className="p-3">{c.cliente_nombre ?? '—'}</td>
                    <td className="p-3">{c.propietario_nombre ?? '—'}</td>
                    <td className="p-3 text-slate-500">{c.propiedad_direccion ?? '—'}</td>
                    <td className="p-3 text-right tabular-nums">{money(c.monto)}</td>
                    <td className="p-3 text-slate-500">{formatearFecha(c.created_at)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" onClick={() => setDetalle(c)}>
                          Ver
                        </Button>
                        {c.pdf_path && (
                          <Button variant="outline" onClick={() => abrirPdf(c.pdf_path!)}>
                            PDF
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => eliminar(c)}>
                          <i className="fas fa-trash" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Tarjetas en celular */}
          <div className="space-y-3 md:hidden">
            {filtradas.map((c) => (
              <Card key={c.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-navy">{c.numero}</div>
                    <div className="text-xs text-slate-500">{formatearFecha(c.created_at)}</div>
                  </div>
                  <Badge className={CARTA_TIPO_CLASE[c.tipo]}>{CARTA_TIPO_LABEL[c.tipo]}</Badge>
                </div>
                <div className="text-sm">
                  {c.cliente_nombre ?? '—'}
                  {c.propietario_nombre ? ` · ${c.propietario_nombre}` : ''}
                </div>
                <div className="text-sm text-slate-500">{c.propiedad_direccion ?? '—'}</div>
                <div className="font-semibold text-navy tabular-nums">{money(c.monto)}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button variant="outline" onClick={() => setDetalle(c)}>
                    Ver qué se firmó
                  </Button>
                  {c.pdf_path && (
                    <Button variant="outline" onClick={() => abrirPdf(c.pdf_path!)}>
                      PDF
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => eliminar(c)}>
                    <i className="fas fa-trash" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? `${CARTA_TIPO_LABEL[detalle.tipo]} · ${detalle.numero}` : ''}
        size="xl"
      >
        {detalle && <DetalleCarta carta={detalle} />}
      </Modal>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="flex gap-3 border-b border-slate-100 py-2 last:border-0">
      <div className="w-44 shrink-0 text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-700">{valor}</div>
    </div>
  );
}

function DetalleCarta({ carta: c }: { carta: Carta }) {
  const inmueble = [c.propiedad_direccion, c.propiedad_municipio, c.propiedad_departamento]
    .filter(Boolean)
    .join(', ');
  const bienes = Array.isArray(c.bienes) ? c.bienes : [];
  const g = c.gastos_cierre;

  return (
    <div className="space-y-4">
      <div>
        <Fila label="Tipo" valor={CARTA_TIPO_LABEL[c.tipo]} />
        <Fila label="Operación" valor={c.transaccion === 'ALQUILER' ? 'Alquiler' : 'Venta'} />
        <Fila
          label="Idioma del documento"
          valor={c.idioma === 'en' ? 'Inglés + anexo en español' : 'Español'}
        />
        <Fila label="Cliente" valor={c.cliente_nombre} />
        <Fila label="Documento del cliente" valor={c.cliente_documento} />
        <Fila label="Propietario" valor={c.propietario_nombre} />
        <Fila label="Inmueble" valor={inmueble || null} />
        <Fila label="Monto" valor={money(c.monto)} />
        <Fila label="Precio de lista" valor={c.precio_lista != null ? money(c.precio_lista) : null} />
        <Fila label="Forma de pago" valor={c.forma_pago} />
        <Fila label="Detalle de pago" valor={c.detalle_pago} />
        <Fila label="Plazo" valor={c.plazo} />
        <Fila label="Notas" valor={c.notas} />
        <Fila label="Fecha" valor={formatearFecha(c.created_at)} />
      </div>

      {bienes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            Bienes incluidos
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
            {bienes.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {g && (
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            Gastos de cierre estimados
          </h3>
          <div className="rounded-lg border border-slate-200">
            {([
              ['Impuesto de transferencia', g.transferTax, false],
              ['Derechos de registro CNR', g.cnrFee, false],
              ['Total gastos de cierre', g.total, true],
              ['Total a preparar (precio + gastos)', g.grandTotal, true],
            ] as Array<[string, number, boolean]>).map(([label, valor, fuerte]) => (
              <div
                key={label}
                className={cx(
                  'flex justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0',
                  fuerte && 'font-semibold text-navy',
                )}
              >
                <span>{label}</span>
                <span className="tabular-nums">{money(valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.pdf_path && (
        <Button onClick={() => abrirPdf(c.pdf_path!)}>
          <i className="fas fa-file-arrow-down" /> Ver PDF firmado
        </Button>
      )}
    </div>
  );
}
