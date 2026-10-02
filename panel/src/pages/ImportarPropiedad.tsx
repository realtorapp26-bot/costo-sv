import { useState } from 'react';
import type { Propiedad } from '../lib/types';
import type { PropiedadCampos } from '../lib/queries';
import { useCreatePropiedad } from '../lib/queries';
import { armarBorradorDesdeTexto, traerHtml, traerSeleccion } from '../lib/importar';
import { Button, Card, inputClass } from '../components/ui';

// "Extraer desde un link" y "Subir selección completa" -- mismos endpoints
// de servidor que ya usa el panel clásico (api/traer-html, api/extraer-datos,
// api/traer-seleccion). El primero arma un borrador y lo pasa al formulario
// de propiedad para que Walter revise antes de guardar; el segundo sube
// todo de una, sin revisión (igual que en el panel clásico).
export function ImportarPropiedad({
  propiedadesExistentes,
  onBorrador,
}: {
  propiedadesExistentes: Propiedad[];
  onBorrador: (campos: Partial<PropiedadCampos>) => void;
}) {
  const crear = useCreatePropiedad();

  const [linkUno, setLinkUno] = useState('');
  const [trayendoUno, setTrayendoUno] = useState(false);

  const [linkSeleccion, setLinkSeleccion] = useState('');
  const [trayendoSeleccion, setTrayendoSeleccion] = useState<string | null>(null);

  async function traerDesdeLink() {
    const url = linkUno.trim();
    if (!url) {
      alert('Pegá primero el link del listado.');
      return;
    }
    setTrayendoUno(true);
    try {
      const html = await traerHtml(url);
      const borrador = await armarBorradorDesdeTexto(html);
      if (!borrador.link_referencia) borrador.link_referencia = url;
      onBorrador(borrador);
      setLinkUno('');
    } catch (ex) {
      alert((ex as Error).message || 'No se pudo traer el listado.');
    } finally {
      setTrayendoUno(false);
    }
  }

  async function subirSeleccionCompleta() {
    const url = linkSeleccion.trim();
    if (!url) {
      alert('Pegá primero el link de la selección.');
      return;
    }
    setTrayendoSeleccion('Trayendo selección...');
    try {
      const traidas = await traerSeleccion(url);
      const existentes = new Set(propiedadesExistentes.map((p) => p.id_externo).filter(Boolean));
      const nuevas = traidas.filter((p) => !existentes.has(p.id_externo));
      const saltadas = traidas.length - nuevas.length;

      let subidas = 0;
      for (let i = 0; i < nuevas.length; i++) {
        const p = nuevas[i];
        setTrayendoSeleccion(`Subiendo ${i + 1} de ${nuevas.length}...`);
        try {
          await crear.mutateAsync({
            orden: null,
            publicada: true,
            titulo: p.titulo,
            precio: p.precio || 'Precio a consultar',
            ubicacion: p.ubicacion,
            categoria: p.categoria,
            tipo_contrato: p.tipo_contrato,
            tipo_propiedad_detalle: p.tipo_propiedad_detalle,
            habitaciones: p.habitaciones,
            banos: p.banos,
            m2: null,
            tamano_lote: p.tamano_lote,
            tamano_construccion: p.tamano_construccion,
            latitud: p.latitud,
            longitud: p.longitud,
            garage: null,
            hoa: null,
            comunidad_cerrada: null,
            propiedad_nueva: null,
            fotos: (p.fotos && p.fotos.length) ? p.fotos : (p.foto ? [p.foto] : []),
            tour_virtual_url: null,
            video_url: null,
            descripcion_original: p.descripcion_original,
            copy_venta: p.copy_venta,
            link_referencia: p.link_referencia,
            id_externo: p.id_externo,
            fecha_publicacion: null,
          });
          subidas++;
        } catch (ex) {
          console.error(`No se pudo subir "${p.titulo}":`, ex);
        }
      }

      setLinkSeleccion('');
      alert(
        `Listo: ${subidas} propiedad${subidas === 1 ? '' : 'es'} nueva${subidas === 1 ? '' : 's'} subida${subidas === 1 ? '' : 's'}.` +
          (saltadas ? ` ${saltadas} ya estaba${saltadas === 1 ? '' : 'n'} publicada${saltadas === 1 ? '' : 's'} (se saltaron).` : ''),
      );
    } catch (ex) {
      alert((ex as Error).message || 'No se pudo subir la selección.');
    } finally {
      setTrayendoSeleccion(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card className="border-2 border-dashed border-gold/50 p-4">
        <h3 className="mb-1 flex items-center gap-2 font-serif font-bold text-navy">
          <i className="fas fa-link" /> Extraer propiedad desde un link
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Pegá el link del listado (share.remax-ccamls.com o remax-centralamerica.com) — lo traemos y extraemos los
          datos con IA para que los revises antes de guardar.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={linkUno}
            onChange={(e) => setLinkUno(e.target.value)}
            placeholder="https://share.remax-ccamls.com/show/..."
            className={inputClass}
          />
          <Button variant="gold" onClick={traerDesdeLink} disabled={trayendoUno} className="shrink-0">
            {trayendoUno ? 'Trayendo...' : (
              <>
                <i className="fas fa-link" /> Traer datos
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="border-2 border-dashed border-gold/50 p-4">
        <h3 className="mb-1 flex items-center gap-2 font-serif font-bold text-navy">
          <i className="fas fa-box-archive" /> Subir una selección completa
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Pegá el link de una selección de RE/MAX Connect (share.remax-ccamls.com/s/...) — trae y sube todas las
          propiedades de esa selección de una sola vez, sin revisión previa.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={linkSeleccion}
            onChange={(e) => setLinkSeleccion(e.target.value)}
            placeholder="https://share.remax-ccamls.com/s/..."
            className={inputClass}
          />
          <Button variant="gold" onClick={subirSeleccionCompleta} disabled={!!trayendoSeleccion} className="shrink-0">
            {trayendoSeleccion || (
              <>
                <i className="fas fa-box-archive" /> Subir selección
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
