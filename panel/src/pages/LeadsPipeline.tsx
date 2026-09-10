import { useState } from 'react';
import type { Estado, LeadConContacto } from '../lib/types';
import { ESTADOS, ESTADO_LABEL, INTERES_LABEL } from '../lib/enums';
import { formatearFecha } from '../lib/format';
import { Badge, cx } from '../components/ui';

interface Props {
  leads: LeadConContacto[];
  onMover: (id: string, estado: Estado) => void;
  onNota: (lead: LeadConContacto) => void;
  onEliminar: (lead: LeadConContacto) => void;
  onDescargarOferta: (path: string) => void;
}

export function LeadsPipeline({ leads, onMover, onNota, onEliminar, onDescargarOferta }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {ESTADOS.map((estado) => {
        const items = leads.filter((l) => l.estado === estado);
        return (
          <div key={estado} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-slate-700">{ESTADO_LABEL[estado]}</span>
              <Badge>{items.length}</Badge>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-100 p-2">
              {items.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">Sin leads</div>
              )}
              {items.map((l) => (
                <PipelineCard
                  key={l.id}
                  lead={l}
                  onMover={onMover}
                  onNota={onNota}
                  onEliminar={onEliminar}
                  onDescargarOferta={onDescargarOferta}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({
  lead,
  onMover,
  onNota,
  onEliminar,
  onDescargarOferta,
}: {
  lead: LeadConContacto;
  onMover: (id: string, estado: Estado) => void;
  onNota: (lead: LeadConContacto) => void;
  onEliminar: (lead: LeadConContacto) => void;
  onDescargarOferta: (path: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const c = lead.contactos;

  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-slate-800">{c?.nombre ?? 'Sin nombre'}</div>
      {c?.telefono && <div className="text-xs text-slate-500">{c.telefono}</div>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Badge>{INTERES_LABEL[lead.interes]}</Badge>
        {lead.oferta_pdf_path && (
          <button
            onClick={() => onDescargarOferta(lead.oferta_pdf_path!)}
            className="text-xs font-medium text-navy underline"
          >
            Oferta PDF
          </button>
        )}
      </div>
      {lead.propiedad_referencia && (
        <div className="mt-1 line-clamp-2 text-xs text-slate-500">{lead.propiedad_referencia}</div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[0.7rem] text-slate-400">{formatearFecha(lead.created_at)}</span>
        <button
          onClick={() => setMenu((v) => !v)}
          className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          ⋯
        </button>
      </div>

      {menu && (
        <div
          className="absolute right-2 top-9 z-10 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          onMouseLeave={() => setMenu(false)}
        >
          <div className="px-2 py-1 text-[0.65rem] font-bold uppercase text-slate-400">Mover a</div>
          {ESTADOS.filter((e) => e !== lead.estado).map((e) => (
            <button
              key={e}
              onClick={() => {
                onMover(lead.id, e);
                setMenu(false);
              }}
              className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              onNota(lead);
              setMenu(false);
            }}
            className={cx('block w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100')}
          >
            Agregar nota
          </button>
          <button
            onClick={() => {
              onEliminar(lead);
              setMenu(false);
            }}
            className="block w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
