// ============================================================
//  Costo SV — Lectura de las respuestas de un formulario de Meta Lead Ads
//
//  Meta manda las respuestas en field_data, con una clave por pregunta que
//  arma a partir del texto de la pregunta (minúsculas, sin acentos, con
//  guiones bajos, y a veces recortada). Esa clave NO es estable: si Walter
//  edita la redacción de una pregunta, cambia. Por eso acá no se buscan
//  nombres exactos sino PALABRAS CLAVE dentro de la clave normalizada, y
//  siempre se guarda field_data completo en respuestas_raw: si un mapeo
//  falla, el dato no se perdió y se puede recuperar mirando el crudo.
// ============================================================

// NFKC convierte las letras decorativas Unicode (𝗠𝗔𝗨𝗥𝗜𝗖𝗜𝗢, 𝓜𝓪𝓻𝓲𝓪) en
// letras normales. Sin esto el nombre se ve raro en el panel y es
// imposible de buscar.
export function normalizarNombre(s) {
  return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

// Para COMPARAR: además saca acentos y signos, y pasa a minúsculas.
function clave(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CAMPOS_NOMBRE = ['full_name', 'first_name'];
const CAMPOS_TELEFONO = ['phone_number'];
const CAMPOS_CORREO = ['email'];

// Cada pregunta se reconoce si la clave contiene ALGUNO de estos grupos
// (un grupo acierta cuando todas sus palabras están presentes).
const PREGUNTAS = {
  proposito: [['proposito'], ['para', 'que', 'busca'], ['para', 'que', 'buscas'], ['uso']],
  presupuesto: [['presupuesto'], ['cuanto', 'invertir'], ['rango', 'precio']],
  plazo: [['plazo'], ['cuanto', 'tiempo'], ['cuando', 'compra'], ['cuando', 'piensa']],
};

function coincide(claveCampo, grupos) {
  return grupos.some((grupo) => grupo.every((palabra) => claveCampo.includes(palabra)));
}

export function valorDe(fieldData, nombres) {
  for (const f of fieldData || []) {
    if (nombres.includes(f.name) && f.values && f.values[0]) return f.values[0];
  }
  return '';
}

// Un lead de prueba de Meta trae literalmente "<test lead: ...>" en los valores.
export function esLeadDePrueba(fieldData) {
  return (fieldData || []).some((f) =>
    (f.values || []).some((v) => /^<test lead/i.test(String(v || '').trim())),
  );
}

export function mapearRespuestas(fieldData) {
  const datos = fieldData || [];
  const usados = new Set([...CAMPOS_NOMBRE, 'last_name', ...CAMPOS_TELEFONO, ...CAMPOS_CORREO]);
  const salida = { proposito: null, presupuesto: null, plazo: null, otras: [] };

  for (const f of datos) {
    if (usados.has(f.name)) continue;
    const valor = (f.values && f.values[0]) || '';
    if (!valor) continue;
    const k = clave(f.name);

    let asignada = null;
    for (const campo of Object.keys(PREGUNTAS)) {
      if (!salida[campo] && coincide(k, PREGUNTAS[campo])) { asignada = campo; break; }
    }
    if (asignada) salida[asignada] = valor;
    else salida.otras.push(`${f.name.replace(/_/g, ' ')}: ${valor}`);
  }
  return salida;
}

// Caliente = el presupuesto más alto (habla de 130 mil para arriba).
// Tibio    = cualquier otro presupuesto, pero con plazo corto (1-3 o 3-6 meses).
// Frío     = solo está explorando.
// Sin datos suficientes devuelve null, y el panel no muestra etiqueta.
export function calcularPrioridad({ presupuesto, plazo }) {
  const p = clave(presupuesto);
  const t = clave(plazo);

  if (t.includes('explorando') || t.includes('solo mirando')) return 'frio';
  if (p && /\b130\b/.test(p) && (p.includes('mas de') || p.includes('o mas'))) return 'caliente';
  if (t && (/\b1 a 3\b/.test(t) || /\b3 a 6\b/.test(t) || t.includes('inmediat'))) return 'tibio';
  if (p || t) return 'frio';
  return null;
}

export const PRIORIDAD_EMOJI = { caliente: '🔥', tibio: '🟡', frio: '⚪' };
export const PRIORIDAD_LABEL = { caliente: 'Caliente', tibio: 'Tibio', frio: 'Frío' };
