// Función serverless de Vercel: redacta el copy de venta con Claude.
// La API key vive SOLO como variable de entorno en Vercel (ANTHROPIC_API_KEY),
// nunca en el código ni en el navegador.

// Precios aproximados de Claude Haiku (USD por token) — ajustar si Anthropic los cambia.
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

    const {
        tipo, titulo, precio, ubicacion, categoria, habitaciones, banos, m2, descripcion_original,
        nombre, aliado, inversion_total, cuota_franquicia, regalias, retorno_estimado,
        espacio_requerido, unidades_actuales, anos_en_mercado, territorios_disponibles,
    } = req.body || {};

    const esFranquicia = tipo === 'franquicia';
    if (esFranquicia ? !nombre : !titulo) {
        res.status(400).json({ error: esFranquicia ? 'Falta el nombre de la franquicia' : 'Falta el título de la propiedad' });
        return;
    }

    const datos = esFranquicia
        ? [
            `Nombre de la franquicia: ${nombre}`,
            aliado ? `Aliado/representante: ${aliado}` : '',
            categoria ? `Rubro: ${categoria}` : '',
            inversion_total ? `Inversión total: ${inversion_total}` : '',
            cuota_franquicia ? `Cuota de franquicia: ${cuota_franquicia}` : '',
            regalias ? `Regalías: ${regalias}` : '',
            retorno_estimado ? `Retorno estimado: ${retorno_estimado}` : '',
            espacio_requerido ? `Espacio requerido: ${espacio_requerido}` : '',
            unidades_actuales ? `Unidades actuales en operación: ${unidades_actuales}` : '',
            anos_en_mercado ? `Años en el mercado: ${anos_en_mercado}` : '',
            territorios_disponibles ? `Territorios disponibles: ${territorios_disponibles}` : '',
            descripcion_original ? `Descripción original: ${descripcion_original}` : '',
        ].filter(Boolean).join('\n')
        : [
            `Título: ${titulo}`,
            precio ? `Precio: ${precio}` : '',
            ubicacion ? `Ubicación: ${ubicacion}` : '',
            categoria ? `Categoría: ${categoria}` : '',
            habitaciones ? `Habitaciones: ${habitaciones}` : '',
            banos ? `Baños: ${banos}` : '',
            m2 ? `Metros cuadrados: ${m2}` : '',
            descripcion_original ? `Descripción original del listado: ${descripcion_original}` : '',
        ].filter(Boolean).join('\n');

    const systemPropiedad = 'Sos un redactor inmobiliario en El Salvador para RE/MAX. Escribís copy de venta persuasivo, profesional y breve (3-5 oraciones) en español, con intención de venta clara y una llamada a la acción al final. ' +
        'Respetá siempre los datos de referencia que te dan (precio, ubicación, características) — nunca inventes ni cambies un dato. ' +
        'Sí podés (y debés) variar la redacción, el orden y el enfoque respecto al texto original para que se lea mejor y más persuasivo, en vez de copiarlo literal. ' +
        'Texto plano únicamente: sin emojis, sin markdown (nada de #, **, guiones de lista ni encabezados) — va a pegarse tal cual en Marketplace y en el sitio web.';

    const systemFranquicia = 'Sos un redactor especializado en oportunidades de franquicia en El Salvador. Escribís copy de venta persuasivo, profesional y breve (3-5 oraciones) en español, dirigido a un inversionista que evalúa abrir una franquicia. ' +
        'Destacá el respaldo de marca, la rentabilidad y el soporte que recibe el franquiciado, con una llamada a la acción clara al final. ' +
        'Respetá siempre los datos de referencia que te dan (inversión, regalías, retorno, unidades existentes) — nunca inventes ni cambies un dato. ' +
        'Texto plano únicamente: sin emojis, sin markdown (nada de #, **, guiones de lista ni encabezados) — va a pegarse tal cual en el sitio web.';

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
                max_tokens: 300,
                system: esFranquicia ? systemFranquicia : systemPropiedad,
                messages: [{ role: 'user', content: `Redactá el copy de venta para ${esFranquicia ? 'esta franquicia' : 'esta propiedad'}:\n\n${datos}` }],
            }),
        });

        if (!resp.ok) {
            const errBody = await resp.text();
            res.status(502).json({ error: 'Error de la API de Claude: ' + errBody });
            return;
        }

        const data = await resp.json();
        const copy = data.content?.[0]?.text || '';

        if (data.usage) {
            await registrarUso(data.usage.input_tokens || 0, data.usage.output_tokens || 0);
        }

        res.status(200).json({ copy });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
