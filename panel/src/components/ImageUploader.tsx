import { useRef, useState } from 'react';
import { subirFotos } from '../lib/storage';
import { Button, cx, inputClass } from './ui';

// Subidor de fotos genérico (no específico de Propiedades) -- la primera
// foto de la lista es la portada, igual que en el panel clásico. Pensado
// para reusarse más adelante en Proyectos/amenidades/plantas.
export function ImageUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [urlManual, setUrlManual] = useState('');
  const [mostrarUrlManual, setMostrarUrlManual] = useState(false);

  async function manejarArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    if (!archivos.length) return;
    const { urls, fallidas } = await subirFotos(archivos, (actual, total) =>
      setProgreso(`Subiendo ${actual} de ${total}...`),
    );
    if (urls.length) onChange([...value, ...urls]);
    setProgreso(null);
    if (inputRef.current) inputRef.current.value = '';
    if (fallidas.length) {
      alert(
        `No se pudieron subir ${fallidas.length} de ${archivos.length} foto(s):\n${fallidas.join('\n')}\n\nProbá subirlas de nuevo (de a pocas si el problema sigue).`,
      );
    }
  }

  function quitar(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function hacerPortada(idx: number) {
    const copia = [...value];
    const [foto] = copia.splice(idx, 1);
    onChange([foto, ...copia]);
  }

  function agregarUrlManual() {
    const url = urlManual.trim();
    if (!url) return;
    onChange([...value, url]);
    setUrlManual('');
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <i className="fas fa-upload" /> Subir fotos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={manejarArchivos}
        />
        {progreso && <span className="text-xs text-slate-500">{progreso}</span>}
        <button
          type="button"
          onClick={() => setMostrarUrlManual((v) => !v)}
          className="ml-auto text-xs font-medium text-navy hover:underline"
        >
          {mostrarUrlManual ? 'Cancelar' : '+ Pegar una URL'}
        </button>
      </div>

      {mostrarUrlManual && (
        <div className="mt-2 flex gap-2">
          <input
            value={urlManual}
            onChange={(e) => setUrlManual(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          <Button type="button" variant="outline" onClick={agregarUrlManual}>
            Agregar
          </Button>
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, idx) => (
            <div key={url + idx} className="relative overflow-hidden rounded-lg border border-slate-200">
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[0.6rem] font-bold text-navy">
                  Portada
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => hacerPortada(idx)}
                    title="Hacer portada"
                    className={cx('rounded bg-white/90 p-1 text-navy hover:bg-white')}
                  >
                    <i className="fas fa-star text-xs" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quitar(idx)}
                  title="Quitar"
                  className="rounded bg-white/90 p-1 text-red-600 hover:bg-white"
                >
                  <i className="fas fa-trash text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
