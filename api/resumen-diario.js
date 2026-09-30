// ============================================================
//  Costo SV — Resumen diario del sitio + pipeline, por Telegram (Claude)
//
//  Disparado por Vercel Cron (ver vercel.json). Junta las métricas de
//  "eventos" (pageviews, clics WhatsApp, fichas vistas, dossiers
//  descargados, formularios) de las últimas 24h + el estado completo
//  del pipeline de leads, le pide a Claude un resumen breve en español,
//  y lo manda por Telegram al mismo bot de avisos de leads.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// Mismos precios aproximados que usa api/generar-copy.js (Claude Haiku).
const PRECIO_INPUT_POR_TOKEN = 1 / 1_000_000;
const PRECIO_OUTPUT_POR_TOKEN = 5 / 1_000_000;

const ETIQUETAS_EVENTO = {
    pageview: 'Visitas a páginas',
    whatsapp_click: 'Clics a WhatsApp',
    ficha_view: 'Fichas de propiedad vistas',
    dossier_download: 'Dossiers descargados',
    lead_submit: 'Formularios enviados',
};

const ETIQUETAS_ESTADO = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    calificado: 'Calificado',
    perdido: 'Perdido',
    cerrado: 'Cerrado',
};

async function registrarUsoIa(serviceKey, inputTokens, outputTokens) {
    const costo = inputTokens * PRECIO_INPUT_POR_TOKEN + outputTokens * PRECIO_OUTPUT_POR_TOKEN;
    try {
        await fetch(`${SUPA_URL}/rest/v1/uso_ia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' },
            body: JSON.stringify({ input_tokens: inputTokens, output_tokens: outputTokens, costo_estimado: costo }),
        });
    } catch (e) {
        console.error('resumen-diario registrarUsoIa:', e);
    }
}

function contarPor(filas, campo) {
    const conteo = {};
    for (const fila of filas) {
        const clave = fila[campo] || 'sin especificar';
        conteo[clave] = (conteo[clave] || 0) + 1;
    }
    return conteo;
}

function formatearConteo(conteo, etiquetas) {
    return Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .map(([clave, cantidad]) => `${(etiquetas && etiquetas[clave]) || clave}: ${cantidad}`)
        .join(', ');
}

export default async function handler(req, res) {
    // Vercel manda esta cabecera con el secreto configurado en el proyecto
    // cuando dispara el cron — también sirve para probar el endpoint a mano
    // con el mismo secreto. Si no hay CRON_SECRET configurado, queda abierto
    // (conveniente mientras se prueba, no crítico: solo manda un resumen).
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChat = process.env.TELEGRAM_CHAT_ID;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!serviceKey || !telegramToken || !telegramChat || !anthropicKey) {
        res.status(500).json({ error: 'Faltan variables de entorno (SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID o ANTHROPIC_API_KEY)' });
        return;
    }

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
        const [eventosRes, leadsNuevosRes, leadsTodosRes] = await Promise.all([
            fetch(`${SUPA_URL}/rest/v1/eventos?select=tipo,pagina&created_at=gte.${desde}`, { headers }),
            fetch(`${SUPA_URL}/rest/v1/leads?select=id,origen&created_at=gte.${desde}`, { headers }),
            fetch(`${SUPA_URL}/rest/v1/leads?select=estado`, { headers }),
        ]);
        if (!eventosRes.ok) throw new Error('eventos: ' + (await eventosRes.text()));
        if (!leadsNuevosRes.ok) throw new Error('leads nuevos: ' + (await leadsNuevosRes.text()));
        if (!leadsTodosRes.ok) throw new Error('leads pipeline: ' + (await leadsTodosRes.text()));

        const eventos = await eventosRes.json();
        const leadsNuevos = await leadsNuevosRes.json();
        const leadsTodos = await leadsTodosRes.json();

        const conteoEventos = contarPor(eventos, 'tipo');
        const fichasVistas = eventos.filter((e) => e.tipo === 'ficha_view' && e.pagina);
        const conteoFichas = contarPor(fichasVistas, 'pagina');
        const conteoOrigenLeads = contarPor(leadsNuevos, 'origen');
        const conteoEstadoPipeline = contarPor(leadsTodos, 'estado');

        const lineas = [
            `Actividad del sitio en las últimas 24 horas: ${formatearConteo(conteoEventos, ETIQUETAS_EVENTO) || 'sin actividad registrada'}.`,
            Object.keys(conteoFichas).length ? `Propiedades más vistas: ${formatearConteo(conteoFichas)}.` : '',
            `Leads nuevos en las últimas 24 horas: ${leadsNuevos.length}${leadsNuevos.length ? ` (por origen: ${formatearConteo(conteoOrigenLeads)})` : ''}.`,
            `Estado actual de todo el pipeline de leads: ${formatearConteo(conteoEstadoPipeline, ETIQUETAS_ESTADO) || 'sin leads todavía'}.`,
        ].filter(Boolean).join('\n');

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: 'Sos un asistente que ayuda a Walter Guerrero, agente inmobiliario de RE/MAX Elite en El Salvador, a entender rápido cómo viene su sitio web y su pipeline de leads cada día. ' +
                    'Te paso los números reales de las últimas 24 horas y el estado actual de todo el pipeline. Escribí un resumen breve en español (máximo 100 palabras), tono directo y cercano, sin rodeos: ' +
                    'destacá qué está funcionando, qué necesita atención (por ejemplo leads que no avanzan, o poca actividad) y algún patrón que valga la pena notar. ' +
                    'Texto plano, sin markdown. Nunca inventes ni cambies un número que no te di — si algo está en cero, decilo tal cual.',
                messages: [{ role: 'user', content: lineas }],
            }),
        });
        if (!claudeRes.ok) throw new Error('Claude: ' + (await claudeRes.text()));
        const claudeData = await claudeRes.json();
        const resumen = claudeData.content?.[0]?.text || 'No se pudo generar el resumen de hoy.';
        if (claudeData.usage) {
            await registrarUsoIa(serviceKey, claudeData.usage.input_tokens || 0, claudeData.usage.output_tokens || 0);
        }

        const mensaje = `📊 Resumen diario — Costo SV\n\n${resumen}`;
        const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
        });
        if (!tgRes.ok) throw new Error('telegram: ' + (await tgRes.text()));

        res.status(200).json({ ok: true, resumen });
    } catch (err) {
        console.error('api/resumen-diario:', err);
        res.status(502).json({ error: err.message });
    }
}
