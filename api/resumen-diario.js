// ============================================================
//  Costo SV — Cierre del día por Telegram
//
//  Disparado por Vercel Cron (ver vercel.json) a las 7:00 PM de El Salvador.
//  El resumen en sí vive en lib/resumenDiario.js, compartido con el mensaje
//  de la mañana que manda api/chequear-disponibilidad.js: el plan Hobby solo
//  permite dos tareas programadas y las dos ya estaban usadas.
//
//  ?momento=manana|noche  — cuál de los dos mensajes mandar (por defecto el
//                           cierre del día, que es lo que dispara este cron).
//  ?probar=1              — junta todo y lo devuelve SIN mandarle un mensaje
//                           a Walter ni gastar una llamada al modelo.
// ============================================================

import { enviarResumen } from '../lib/resumenDiario.js';

export default async function handler(req, res) {
    // Vercel manda esta cabecera con el secreto configurado en el proyecto
    // cuando dispara el cron — también sirve para probar el endpoint a mano
    // con el mismo secreto. Si no hay CRON_SECRET configurado, queda abierto.
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }

    const momento = req.query?.momento === 'manana' ? 'manana' : 'noche';

    try {
        res.status(200).json(await enviarResumen({ momento, soloProbar: req.query?.probar === '1' }));
    } catch (err) {
        console.error('api/resumen-diario:', err);
        const falta = err.message.startsWith('Faltan variables');
        res.status(falta ? 500 : 502).json({ error: err.message });
    }
}
