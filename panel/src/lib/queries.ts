import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Estado, Interes, LeadConContacto, Origen } from './types';

const LEAD_COLS_BASE =
  'id,origen,interes,propiedad_referencia,estado,notas,created_at,contactos(nombre,telefono,correo)';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async (): Promise<LeadConContacto[]> => {
      // Intenta con oferta_pdf_path; si la migración no se aplicó, PostgREST da 400 -> reintenta sin ella.
      const withOferta = await supabase
        .from('leads')
        .select(`${LEAD_COLS_BASE},oferta_pdf_path`)
        .order('created_at', { ascending: false });
      if (!withOferta.error) return (withOferta.data ?? []) as unknown as LeadConContacto[];

      const base = await supabase
        .from('leads')
        .select(LEAD_COLS_BASE)
        .order('created_at', { ascending: false });
      if (base.error) throw base.error;
      return (base.data ?? []).map((l) => ({ ...l, oferta_pdf_path: null })) as unknown as LeadConContacto[];
    },
    staleTime: 15_000,
  });
}

export function useUpdateLeadEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Estado }) => {
      const { error } = await supabase
        .from('leads')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useAddNota() {
  return useMutation({
    mutationFn: async ({ leadId, detalle }: { leadId: string; detalle: string }) => {
      const { error } = await supabase
        .from('actividades')
        .insert({ lead_id: leadId, tipo: 'nota', detalle });
      if (error) throw error;
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export interface NuevoLead {
  nombre: string;
  telefono: string;
  origen: Origen;
  interes: Interes;
  referencia: string;
}

export function useAddLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: NuevoLead) => {
      const contactoId =
        window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const c = await supabase
        .from('contactos')
        .insert({ id: contactoId, nombre: v.nombre, telefono: v.telefono || null });
      if (c.error) throw c.error;
      const l = await supabase.from('leads').insert({
        contacto_id: contactoId,
        origen: v.origen,
        interes: v.interes,
        propiedad_referencia: v.referencia || null,
      });
      if (l.error) throw l.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export async function ofertaSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('ofertas')
    .createSignedUrl(path, 120, { download: 'carta.pdf' });
  if (error || !data) throw error ?? new Error('No se pudo generar el enlace');
  return data.signedUrl;
}
