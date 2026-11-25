// ============================================================
//  Costo SV — Resumen diario del sitio + pipeline, por Telegram (Claude)
//
//  Disparado por Vercel Cron (ver vercel.json) al final del día, 7:00 PM de
//  El Salvador. Junta las métricas de "eventos" (pageviews, clics WhatsApp,
//  fichas vistas, dossiers descargados, formularios) de las últimas 24h + el
//  estado completo del pipeline de leads, le pide a Claude un resumen breve
//  en español, y lo manda por Telegram al mismo bot de avisos de leads.
//
//  Además cierra el día con el detalle EXACTO de lo que cambió en el sitio:
//    * contenido: lo publicado / ocultado / borrado, leído de la bitácora que
//      llenan los triggers de la base (ver migración bitacora_contenido);
//    * código: los commits desplegados, leídos de la API pública de GitHub
//      (el repo es público, así que no hace falta ningún token).
//  Esa parte va al mensaje tal cual, armada acá y NO por el modelo: es la
//  lista literal de lo que pasó y no puede salir parafraseada ni resumida.
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

// ---- Cambios del sitio -------------------------------------------------
const ETIQUETAS_TABLA = {
    propiedades: 'propiedad',
    franquicias: 'franquicia',
    testimonios: 'testimonio',
    proyectos: 'proyecto',
};

// El orden importa: primero lo que el cliente ve aparecer o desaparecer.
const ACCIONES_EN_ORDEN = [
    ['publicado', '🟢 Se publicó'],
    ['despublicado', '🟡 Se ocultó'],
    ['borrado', '🔴 Se borró'],
    ['creado_oculto', '⚪ Se cargó sin publicar'],
    ['editado', '✏️ Se editó'],
];

const REPO_GITHUB = 'realtorapp26-bot/costo-sv';
const MAX_POR_ACCION = 8;   // Telegram corta a 4096 caracteres
const MAX_COMMITS = 8;

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

// La bitácora puede no existir todavía (la migración la aplica Walter a mano).
// Si falta, el resumen igual se manda: avisa que esa parte no está disponible
// en vez de romper el mensaje completo del día.
async function traerCambiosContenido(headers, desde) {
    try {
        const res = await fetch(
            `${SUPA_URL}/rest/v1/bitacora_contenido?select=tabla,accion,titulo,slug,created_at` +
            `&created_at=gte.${desde}&order=created_at.asc`,
            { headers },
        );
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        return { cambios: await res.json(), aviso: '' };
    } catch (e) {
        console.error('resumen-diario bitacora_contenido:', e);
        return { cambios: [], aviso: 'No se pudo leer la bitácora de contenido (¿falta aplicar la migración bitacora_contenido?).' };
    }
}

// Los commits del día = lo que efectivamente se desplegó al sitio. El repo es
// público, así que esto va sin token y sin mandarle a GitHub ningún dato de
// Walter; solo se pide el historial de un repo que ya es público.
async function traerCommits(desde) {
    try {
        const res = await fetch(
            `https://api.github.com/repos/${REPO_GITHUB}/commits?since=${encodeURIComponent(desde)}&per_page=100`,
            { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'costo-sv-resumen-diario' } },
        );
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const datos = await res.json();
        return (Array.isArray(datos) ? datos : [])
            .map((c) => (c.commit?.message || '').split('\n')[0].trim())
            .filter(Boolean);
    } catch (e) {
        console.error('resumen-diario commits:', e);
        return null;   // null = no se pudo averiguar; distinto de "no hubo"
    }
}

// Texto literal para el mensaje. Nunca pasa por el modelo.
function bloqueCambiosSitio(cambios, aviso, commits) {
    const lineas = ['', '🌐 Qué cambió en el sitio hoy'];

    if (aviso) {
        lineas.push(aviso);
    } else if (!cambios.length) {
        lineas.push('Contenido: no se publicó, ocultó ni borró nada.');
    } else {
        for (const [accion, etiqueta] of ACCIONES_EN_ORDEN) {
            const lista = cambios.filter((c) => c.accion === accion);
            if (!lista.length) continue;
            lineas.push(`${etiqueta} (${lista.length}):`);
            for (const c of lista.slice(0, MAX_POR_ACCION)) {
                const tipo = ETIQUETAS_TABLA[c.tabla] || c.tabla;
                lineas.push(`  • ${c.titulo || 'sin título'} — ${tipo}`);
            }
            if (lista.length > MAX_POR_ACCION) {
                lineas.push(`  • …y ${lista.length - MAX_POR_ACCION} más`);
            }
        }
    }

    if (commits === null) {
        lineas.push('', 'No se pudo consultar qué cambios de código se desplegaron.');
    } else if (!commits.length) {
        lineas.push('', 'Páginas del sitio: sin cambios desplegados hoy.');
    } else {
        lineas.push('', `🛠 Cambios desplegados a las páginas (${commits.length}):`);
        for (const m of commits.slice(0, MAX_COMMITS)) lineas.push(`  • ${m}`);
        if (commits.length > MAX_COMMITS) lineas.push(`  • …y ${commits.length - MAX_COMMITS} más`);
    }

    return lineas.join('\n');
}

// Resumen en una línea de los cambios, para que el modelo pueda comentarlos
// en su párrafo sin tener que inventarlos.
function resumirCambiosParaIa(cambios, commits) {
    const partes = [];
    for (const [accion, etiqueta] of ACCIONES_EN_ORDEN) {
        const n = cambios.filter((c) => c.accion === accion).length;
        if (n) partes.push(`${etiqueta.replace(/^\S+\s/, '')}: ${n}`);
    }
    const contenido = partes.length ? partes.join(', ') : 'ningún cambio de contenido';
    const codigo = commits === null ? 'cambios de código: no se pudo consultar'
        : `cambios de código desplegados: ${commits.length}`;
    return `Cambios en el sitio en las últimas 24 horas — ${contenido}; ${codigo}.`;
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

        // Van en paralelo y con su propio manejo de error: si una de las dos
        // falla, el resumen del día se manda igual.
        const [{ cambios, aviso }, commits] = await Promise.all([
            traerCambiosContenido(headers, desde),
            traerCommits(desde),
        ]);

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
            resumirCambiosParaIa(cambios, commits),
        ].filter(Boolean).join('\n');

        // Modo prueba (?probar=1): devuelve lo que se juntó sin gastar una
        // llamada al modelo y sin mandarle un mensaje a Walter. Sirve para
        // verificar en producción que la bitácora y GitHub se leen bien.
        if (req.query?.probar === '1') {
            res.status(200).json({
                ok: true,
                prueba: true,
                bitacora_legible: !aviso,
                aviso: aviso || null,
                cambios_contenido: cambios.length,
                commits: commits === null ? null : commits.length,
                datos_para_el_modelo: lineas,
                bloque_literal: bloqueCambiosSitio(cambios, aviso, commits),
            });
            return;
        }

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
                    'Te paso los números reales de las últimas 24 horas, el estado actual de todo el pipeline y cuántos cambios tuvo el sitio. Escribí un resumen breve en español (máximo 100 palabras), tono directo y cercano, sin rodeos: ' +
                    'destacá qué está funcionando, qué necesita atención (por ejemplo leads que no avanzan, o poca actividad) y algún patrón que valga la pena notar. ' +
                    'Texto plano, sin markdown. Nunca inventes ni cambies un número que no te di — si algo está en cero, decilo tal cual. ' +
                    'El detalle de qué se publicó, ocultó o borró va aparte, listado al final del mismo mensaje: no lo enumeres vos, a lo sumo mencionalo en una frase si vale la pena.',
                messages: [{ role: 'user', content: lineas }],
            }),
        });
        if (!claudeRes.ok) throw new Error('Claude: ' + (await claudeRes.text()));
        const claudeData = await claudeRes.json();
        const resumen = claudeData.content?.[0]?.text || 'No se pudo generar el resumen de hoy.';
        if (claudeData.usage) {
            await registrarUsoIa(serviceKey, claudeData.usage.input_tokens || 0, claudeData.usage.output_tokens || 0);
        }

        const mensaje = `📊 Cierre del día — Costo SV\n\n${resumen}\n${bloqueCambiosSitio(cambios, aviso, commits)}`;
        const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
        });
        if (!tgRes.ok) throw new Error('telegram: ' + (await tgRes.text()));

        res.status(200).json({ ok: true, resumen, cambios_contenido: cambios.length, commits: commits === null ? null : commits.length });
    } catch (err) {
        console.error('api/resumen-diario:', err);
        res.status(502).json({ error: err.message });
    }
}
