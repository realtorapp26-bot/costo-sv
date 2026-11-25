// ============================================================
//  Costo SV — El resumen que llega por Telegram, dos veces al día
//
//  Walter quiere dos mensajes: uno en la mañana para arrancar el día y otro
//  al cerrarlo, este último con el detalle de qué cambió en el sitio.
//
//  El plan Hobby de Vercel solo permite DOS tareas programadas y las dos ya
//  estaban usadas (el resumen y el chequeo de disponibilidad), así que no se
//  podía agregar una tercera. Por eso el resumen vive acá, en un módulo
//  compartido, y lo llaman las dos funciones que ya tenían cron:
//    * api/chequear-disponibilidad.js  → 9:00 AM  → momento 'manana'
//    * api/resumen-diario.js           → 7:00 PM  → momento 'noche'
//  Mismo criterio que usamos para no pasarnos de 12 funciones serverless:
//  fusionar en lo que ya existe en vez de crear un archivo nuevo.
//
//  El cierre del día suma el detalle EXACTO de lo que cambió en el sitio:
//    * contenido: lo publicado / ocultado / borrado, leído de la bitácora que
//      llenan los triggers de la base (ver migración bitacora_contenido);
//    * código: los commits desplegados, leídos de la API pública de GitHub
//      (el repo es público, así que no hace falta ningún token).
//  Esa parte se arma acá y NO la escribe el modelo: es la lista literal de lo
//  que pasó y no puede salir parafraseada ni resumida.
// ============================================================

const SUPA_URL = 'https://iseoyfiteeobzvtfjhoe.supabase.co';

// Mismos precios aproximados que usa api/generar-copy.js (Claude Haiku).
const PRECIO_INPUT_POR_TOKEN = 1 / 1_000_000;
const PRECIO_OUTPUT_POR_TOKEN = 5 / 1_000_000;

// El Salvador es UTC-6 todo el año (no mueve el reloj), así que alcanza con
// una constante; no hace falta una librería de zonas horarias.
const HORAS_DETRAS_DE_UTC = 6;

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

// Cada momento del día tiene su encabezado y su encargo para el modelo.
const MOMENTOS = {
    manana: {
        titulo: '☀️ Buen día — Costo SV',
        conCambiosDelSitio: false,
        encargo: 'Es el mensaje de la mañana: Walter lo lee para decidir qué atender hoy. Arrancá por lo que necesita acción de su parte.',
    },
    noche: {
        titulo: '📊 Cierre del día — Costo SV',
        conCambiosDelSitio: true,
        encargo: 'Es el mensaje con que cierra el día: Walter lo lee para saber cómo terminó la jornada. Destacá qué se movió hoy y qué queda pendiente para mañana.',
    },
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
        console.error('resumen registrarUsoIa:', e);
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

// Medianoche de HOY en El Salvador, en UTC. El mensaje de la noche dice "hoy",
// así que tiene que contar desde que empezó el día de Walter y no 24 horas
// hacia atrás, que se comería un pedazo de ayer.
function desdeMedianocheLocal() {
    const local = new Date(Date.now() - HORAS_DETRAS_DE_UTC * 3600 * 1000);
    const medianoche = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    return new Date(medianoche + HORAS_DETRAS_DE_UTC * 3600 * 1000).toISOString();
}

// La bitácora puede no existir todavía (la migración se aplica a mano). Si
// falta, el resumen igual se manda: avisa que esa parte no está disponible en
// vez de romper el mensaje completo del día.
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
        console.error('resumen bitacora_contenido:', e);
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
        console.error('resumen commits:', e);
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
    return `Cambios en el sitio hoy — ${contenido}; ${codigo}.`;
}

/**
 * Junta los números del día, le pide a Claude el párrafo y lo manda por
 * Telegram.
 *
 * @param {'manana'|'noche'} momento  cuál de los dos mensajes es
 * @param {boolean} soloProbar        junta todo y lo devuelve SIN enviar nada
 *                                    ni gastar una llamada al modelo
 */
export async function enviarResumen({ momento = 'noche', soloProbar = false } = {}) {
    const perfil = MOMENTOS[momento] || MOMENTOS.noche;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChat = process.env.TELEGRAM_CHAT_ID;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!serviceKey || !telegramToken || !telegramChat || !anthropicKey) {
        throw new Error('Faltan variables de entorno (SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID o ANTHROPIC_API_KEY)');
    }

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

    // Solo el cierre del día detalla los cambios del sitio, y los cuenta desde
    // la medianoche de hoy para que "hoy" sea literalmente hoy.
    let cambios = [], aviso = '', commits = null;
    if (perfil.conCambiosDelSitio) {
        const desdeHoy = desdeMedianocheLocal();
        [{ cambios, aviso }, commits] = await Promise.all([
            traerCambiosContenido(headers, desdeHoy),
            traerCommits(desdeHoy),
        ]);
    }

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
        perfil.conCambiosDelSitio ? resumirCambiosParaIa(cambios, commits) : '',
    ].filter(Boolean).join('\n');

    const bloque = perfil.conCambiosDelSitio ? bloqueCambiosSitio(cambios, aviso, commits) : '';

    if (soloProbar) {
        return {
            ok: true, prueba: true, momento,
            bitacora_legible: perfil.conCambiosDelSitio ? !aviso : null,
            aviso: aviso || null,
            cambios_contenido: cambios.length,
            commits: commits === null ? null : commits.length,
            datos_para_el_modelo: lineas,
            bloque_literal: bloque,
        };
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
            system: 'Sos un asistente que ayuda a Walter Guerrero, agente inmobiliario de RE/MAX Elite en El Salvador, a entender rápido cómo viene su sitio web y su pipeline de leads. ' +
                'Te paso los números reales de las últimas 24 horas y el estado actual de todo el pipeline. Escribí un resumen breve en español (máximo 100 palabras), tono directo y cercano, sin rodeos: ' +
                'destacá qué está funcionando, qué necesita atención (por ejemplo leads que no avanzan, o poca actividad) y algún patrón que valga la pena notar. ' +
                perfil.encargo + ' ' +
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

    const mensaje = `${perfil.titulo}\n\n${resumen}${bloque ? '\n' + bloque : ''}`;
    const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChat, text: mensaje }),
    });
    if (!tgRes.ok) throw new Error('telegram: ' + (await tgRes.text()));

    return {
        ok: true, momento, resumen,
        cambios_contenido: cambios.length,
        commits: commits === null ? null : commits.length,
    };
}
