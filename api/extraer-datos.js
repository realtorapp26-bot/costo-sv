// Función serverless: recibe texto que el usuario YA copió a mano de una página
// (Ctrl+A / Ctrl+C hecho por él, no un fetch nuestro) y usa Claude para extraer
// los campos estructurados de la propiedad. Misma clave secreta que generar-copy.js.

const PRECIO_INPUT_POR_TOKEN = 1 / 1_000_000;
const PRECIO_OUTPUT_POR_TOKEN = 5 / 1_000_000;

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';
const SUPA_KEY = 'sb_publishable_EWNNEWfk4DjuIGwkrbtx4g_PFMtzhSv';

async function registrarUso(inputTokens, outputTokens) {
    const costo = inputTokens * PRECIO_INPUT_POR_TOKEN + outputTokens * PRECIO_OUTPUT_POR_TOKEN;
    try {
        await fetch(`${SUPA_URL}/rest/v1/uso_ia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' },
            body: JSON.stringify({ input_tokens: inputTokens, output_tokens: outputTokens, costo_estimado: costo }),
        });
    } catch (e) {
        console.error('No se pudo registrar el uso de IA:', e);
    }
}

const CATEGORIAS_VALIDAS = ['Vivienda Residencial', 'RE/MAX Exclusive (Lujo)', 'Comercial / Industrial', 'Proyectos y Desarrollos'];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en Vercel' });
        return;
    }

    const { texto } = req.body || {};
    if (!texto || texto.trim().length < 20) {
        res.status(400).json({ error: 'Pegá el texto completo del listado primero.' });
        return;
    }

    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 500,
                system: `Extraés datos de un listado inmobiliario a partir de texto pegado por el usuario (copiado por él de una página web). ` +
                    `Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con estas claves exactas: ` +
                    `titulo (string), precio (string, con símbolo $ si corresponde), ubicacion (string), categoria (una de: ${CATEGORIAS_VALIDAS.join(' | ')}), ` +
                    `habitaciones (string o null), banos (string o null), m2 (string o null), descripcion (string, resumen breve de 1-2 oraciones), ` +
                    `tipo_contrato ("venta" o "alquiler", default "venta"), tipo_propiedad_detalle (string o null, ej "Casa", "Apartamento", "Lote/Terreno"), ` +
                    `id_externo (string o null, el código/ID interno del listado si aparece), tamano_lote (string o null), tamano_construccion (string o null), ` +
                    `latitud (número o null), longitud (número o null), tour_virtual_url (string o null), video_url (string o null), ` +
                    `garage (boolean), hoa (boolean, si tiene cuota de mantenimiento/asociación), comunidad_cerrada (boolean), propiedad_nueva (boolean). ` +
                    `IMPORTANTE: nunca incluyas nombre de agente, oficina, email o teléfono del agente aunque aparezcan en el texto — no son relevantes para esta extracción. ` +
                    `Si un dato no aparece en el texto, usá null o false según corresponda. No inventes datos.`,
                messages: [{ role: 'user', content: texto.slice(0, 8000) }],
            }),
        });

        if (!resp.ok) {
            const errBody = await resp.text();
            res.status(502).json({ error: 'Error de la API de Claude: ' + errBody });
            return;
        }

        const data = await resp.json();
        const textoRespuesta = (data.content?.[0]?.text || '').trim();
        const jsonLimpio = textoRespuesta.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

        let extraido;
        try {
            extraido = JSON.parse(jsonLimpio);
        } catch (e) {
            res.status(502).json({ error: 'La IA no devolvió un formato entendible, probá de nuevo.' });
            return;
        }

        if (data.usage) {
            await registrarUso(data.usage.input_tokens || 0, data.usage.output_tokens || 0);
        }

        res.status(200).json({ datos: extraido });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
