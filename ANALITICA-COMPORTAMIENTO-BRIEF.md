# Analítica de comportamiento en el panel — brief de investigación

> Documento para arrancar la investigación (Fase 0) y, después, el proyecto.
> Autor: ingeniería. Fecha: 2026-09-02. Proyecto: Costo SV / guerrero-properties.com.
> Relacionado: `MARKETING-PROPIEDADES.md`.

---

## 1. Qué se quiere y por qué

Walter quiere una sección en el **panel de administración** (`panel.html`) para
**entender qué hacen los visitantes** en el sitio: qué miran, dónde hacen clic,
hasta dónde bajan, en qué punto se van, qué recorrido hacen los que terminan
escribiendo por WhatsApp o dejando un lead. El fin es **mejorar el sitio con
datos** (no a ojo) y **entender la necesidad real del cliente** (qué tipo de
propiedad, qué información falta, qué fricción hay).

Hoy no hay eso: hay conteos agregados, pero no comportamiento.

## 2. Qué ya existe (punto de partida — NO reinventar)

| Pieza | Qué hace | Dónde |
|---|---|---|
| Tabla `eventos` | Registra `tipo` (pageview, whatsapp_click, lead_submit, ficha_view, dossier_download), `pagina`, `detalle`, `created_at`. **Sin datos personales.** | Supabase, migración `20260825000000_eventos_metricas.sql` |
| RPC `registrar_evento_publico(tipo, pagina, detalle)` | Único camino de escritura para el sitio público (anon). `security definer`. | Supabase |
| `window.CostoSVMetricas.registrarEvento(tipo, detalle)` | Helper JS best-effort (fetch sin await, nunca rompe la UI). | `app.js` |
| Panel → pestaña "📊 Métricas" | Lee `eventos` de los últimos 30 días (máx. 10k filas), agrupa por página, muestra visitas 7d/30d, clics de WhatsApp, leads, fichas vistas, dossiers. | `panel.html` (`cargarMetricas`) |
| Meta Pixel `1592044346046889` | `PageView` en todas las páginas; `ViewContent` y `PlayPropertyVideo` en las fichas. Datos viven en Meta, orientados a pauta. | `<head>` de todo el sitio |
| CRM | Tablas `contactos` / `leads` / `actividades`. Los leads guardan `origen`, `interes`, `propiedad_referencia`. | Supabase |

**Stack:** sitio estático HTML/CSS/JS sin build (salvo `build-seo.mjs` y funciones
`api/*` serverless en Vercel). Backend: Supabase (Postgres + PostgREST + RLS).
Hosting: Vercel.

**Arquitectura (ver skill `gold-core-architecture`):** la analítica de
comportamiento es **infraestructura del NÚCLEO compartido** (la usarían tanto
Costo SV como Cavaler OS), no un módulo de un producto. Diseñar la tabla y el
pipeline con nombres neutros y `empresa_id` / `producto` si aplica.

## 3. Preguntas de negocio que la solución debe poder responder

1. ¿Qué propiedades y páginas concentran la atención y cuáles se ignoran?
2. ¿En qué paso del embudo se cae la gente? (portada → /propiedades → ficha → WhatsApp/formulario)
3. ¿El formulario de contacto/lead pierde gente? ¿en qué campo la pierde?
4. ¿Se ven los videos de YouTube embebidos? ¿cuánto?
5. ¿Hasta dónde hacen scroll en las fichas y en las landing (vender / comprar / invertir)?
6. ¿Qué CTAs se tocan y cuáles no? (WhatsApp flotante vs. botón del hero vs. "Ver ficha completa" vs. tarjeta)
7. ¿La gente que llega de un anuncio (UTM) se comporta y convierte distinto que la orgánica?
8. ¿Desde qué dispositivo/tamaño de pantalla entran? ¿algo se rompe en móvil?
9. ¿La herramienta "Costo de Vida" genera leads o solo tráfico de paso?
10. ¿Los que llegan del canal de YouTube (`@WalterGuerreroSV`) se comportan distinto?
11. De los que **sí** dejaron un lead: ¿qué recorrido hicieron antes? (correlación evento → CRM)

## 4. Alcance de la INVESTIGACIÓN (Fase 0)

Decidir **construir vs. integrar vs. híbrido**, con una recomendación fundamentada.

### 4.1 Herramientas a evaluar

- **Microsoft Clarity** — gratis e ilimitado; heatmaps, grabaciones de sesión,
  rage/dead clicks, scroll. Script liviano. Datos alojados por Microsoft.
- **PostHog** — open-source; product analytics + embudos + heatmaps + session
  replay + flags + A/B. Cloud (UE/EEUU) o self-host. Free tier amplio. Script
  más pesado.
- **Matomo** — self-host (PHP/MySQL) o cloud; privacy-first, configurable
  cookieless / exento de consentimiento. Heatmaps y grabaciones son add-on pago.
- **Plausible / Umami** — livianos, sin cookies, sin banner; open-source y
  self-hostables. **No** dan heatmaps ni grabaciones (Umami tiene algo de
  eventos). Buenos para tráfico, cortos para comportamiento.
- **Vercel Web Analytics** — privacy-friendly, cookieless, barato; básico.
- **Extender el sistema propio `eventos`** — control total del dato, se cruza
  nativo con el panel y el CRM (clic → lead → venta), cookieless posible con
  `session_id` anónimo. Construir heatmaps/grabaciones desde cero es caro
  (grabaciones ≈ librería `rrweb`).

### 4.2 Criterios de comparación

Costo total · privacidad y necesidad de banner de consentimiento · propiedad y
portabilidad del dato · esfuerzo de integración y de mantenimiento · peso del
script y efecto en Core Web Vitals / SEO · encaje con el panel actual · capacidad
de **cruzar comportamiento con leads del CRM** · calidad con **tráfico bajo**
(el canal tiene ~49 suscriptores; el sitio hoy tiene poco volumen → los heatmaps
tardan en ser significativos; las **grabaciones de sesión** y un **embudo simple**
rinden antes).

### 4.3 Privacidad y marco legal (obligatorio en la investigación)

- **El Salvador — Ley para la Protección de Datos Personales (Decreto 144,
  vigente desde 24-nov-2024).** Exige consentimiento **previo, libre, informado y
  expreso**; **sin casillas premarcadas**; define "cookie". Autoridad: Agencia de
  Ciberseguridad del Estado (ACE). Verificar reglamento y estado de aplicación al
  momento de implementar.
  Fuentes: [Refworld / Decreto 144](https://www.refworld.org/es/leg/legis/pleg/2024/es/149336) ·
  [Informática Jurídica](https://www.informatica-juridica.com/ley/decreto-no-144-ley-para-la-proteccion-de-datos-personales-de-12-de-noviembre-de-2024/) ·
  [Central Law — claves de cumplimiento](https://central-law.com/el-salvador-nueva-ley-de-proteccion-de-datos-personales-claves-para-su-cumplimiento-y-aplicacion/)
- **Diáspora en EE.UU./UE**: el sitio apunta a salvadoreños en el exterior →
  considerar **GDPR** (UE) y **CCPA/CPRA** (California). Grabaciones de sesión y
  cookies de terceros son datos personales bajo GDPR.
- Requisitos técnicos derivados: **banner de consentimiento** (las herramientas
  de terceros y las grabaciones cargan **solo tras opt-in**); **enmascarar
  inputs** en grabaciones (nunca capturar lo tecleado en formularios);
  anonimizar IP; **DPA** firmado con el proveedor; **actualizar la política de
  privacidad**. La analítica propia **cookieless y anónima** puede correr antes
  del consentimiento si no identifica a la persona (validar con criterio legal).

## 5. Hipótesis de arquitectura (a validar, no es la decisión)

**Híbrido:**

- **Cualitativo** (heatmaps, grabaciones, rage/dead clicks): Microsoft Clarity
  como primer paso (gratis, rápido) **o** PostHog si se quiere todo-en-uno y
  self-host por soberanía del dato. Cargado tras consentimiento.
- **Cuantitativo de negocio** (embudo, ranking de propiedades, UTM, móvil,
  correlación con leads): **extender el pipeline propio `eventos` + panel**.
  Esto es lo que ningún tercero puede dar, porque el CRM es privado y la unión
  evento ↔ lead ↔ venta vive en la misma base.
- **Consentimiento**: banner liviano propio (o CMP open-source) que gobierne qué
  carga.

### 5.1 Extensión del modelo propio (boceto)

`eventos` (o tabla nueva `eventos_web` en el núcleo) añadiría:

- `session_id uuid` — anónimo, en `sessionStorage`, sin PII.
- `visitor_id text` — opcional, `localStorage`, hasheado; solo con consentimiento.
- `path text` — ruta completa (con querystring saneado).
- `referrer text`, `utm_source/medium/campaign text`.
- `device text` (`mobile|tablet|desktop`), `viewport_w int`.
- `props jsonb` — `{ element, href, x, y, scroll_pct, video_pct, form_field, ... }`.
- Índices por `session_id`, `created_at`, `tipo`, y GIN en `props`.

Nuevos `tipo`: `click`, `scroll_depth`, `form_field_focus`, `form_abandon`,
`video_progress`, `outbound_click`.

Operación: RPC ampliado (o uno nuevo) para el insert anónimo; **job de retención**
(`pg_cron`) que borra eventos > N meses; **exclusión** de tráfico interno
(por IP o por una marca `?admin=1` guardada en `localStorage`). Posible
tabla/vista `sesiones` para alimentar el panel sin escanear millones de filas.

### 5.2 Entregables nuevos en el panel

- **Embudo** con % de caída por paso.
- **Ranking de propiedades** por vistas / clics a WhatsApp / conversión.
- **Scroll depth** y **mapa de clics** por página (heatmap propio simple en canvas
  o Clarity embebido).
- **Rendimiento por fuente/UTM** (incluye YouTube).
- **Móvil vs. escritorio**.
- **Recorrido de los que convirtieron** (unión `eventos.session_id` ↔ `leads`).
- **Reproducciones de video** por propiedad.

## 6. Plan por fases

| Fase | Qué | Estimación |
|---|---|---|
| **0 — Investigación** | Este documento → informe de recomendación (herramienta, arquitectura, presupuesto, plan legal). | ~1 semana |
| **1 — Quick win** | Banner de consentimiento + Microsoft Clarity (o PostHog). Heatmaps y grabaciones andando. | 1–2 días |
| **2 — Pipeline propio** | Enriquecer `eventos` (session_id, click/scroll/form/video), RPC, retención, exclusión de tráfico interno. | 3–5 días |
| **3 — Panel** | Widgets: embudo, ranking de propiedades, UTM, móvil. | ~1 semana |
| **4 — Correlación CRM** (opcional) | Unir recorrido ↔ lead; informe mensual automático. | ~1 semana |

## 7. Riesgos

- **Legal**: LPDP + GDPR/CCPA. Sin consentimiento bien hecho hay exposición.
  Mitigar con gating de consentimiento, enmascarado de inputs, DPA y política de
  privacidad actualizada.
- **Rendimiento/SEO**: scripts de terceros pesan → vigilar Core Web Vitals.
- **Datos sucios**: bots y tráfico propio. Excluir desde el día 1.
- **Volumen bajo**: heatmaps poco significativos al principio → priorizar
  grabaciones + embudo simple.
- **Mantenimiento**: el sistema propio hay que sostenerlo; no sobre-construir.

---

## 8. Prompt para la investigación (copiar y pasar a la IA / ingeniero)

```
Actuá como ingeniero de software senior especializado en analítica de producto y
privacidad. Tu tarea es la FASE 0 (investigación) del proyecto "Analítica de
comportamiento en el panel de Costo SV". NO escribas código todavía: entregá un
informe de recomendación.

CONTEXTO
- Sitio: guerrero-properties.com (Walter Guerrero, agente RE/MAX Elite,
  El Salvador). Sitio estático HTML/CSS/JS sin build; funciones serverless en
  Vercel; backend Supabase (Postgres + PostgREST + RLS).
- Ya existe: tabla `eventos` (pageview/whatsapp_click/lead_submit/ficha_view/
  dossier_download) escrita vía RPC `registrar_evento_publico`, un panel con
  pestaña "Métricas" que la agrega, Meta Pixel para pauta, y un CRM privado
  (contactos/leads/actividades) en la misma base.
- La analítica es infraestructura de NÚCLEO compartido (Costo SV + Cavaler OS),
  no un módulo de un producto.
- Tráfico actual bajo. Audiencia incluye diáspora salvadoreña en EE.UU. y UE.
- Marco legal: El Salvador, Ley de Protección de Datos Personales (Decreto 144,
  vigente 24-nov-2024): consentimiento previo, expreso, sin casillas premarcadas.
  Verificar también GDPR (UE) y CCPA (California).

OBJETIVO DE NEGOCIO
Entender el comportamiento de los visitantes (qué miran, dónde hacen clic, hasta
dónde bajan, dónde abandonan, qué recorrido hacen los que convierten) para
mejorar el sitio con datos y entender la necesidad del cliente. Ver la lista de
11 preguntas de negocio del brief.

LO QUE TENÉS QUE ENTREGAR
1. Comparativa de opciones (Microsoft Clarity, PostHog, Matomo, Plausible/Umami,
   Vercel Analytics, y "extender el sistema propio") contra estos criterios:
   costo total, privacidad y necesidad de banner, propiedad/portabilidad del
   dato, esfuerzo de integración y mantenimiento, peso del script y efecto en
   Core Web Vitals/SEO, encaje con el panel actual, capacidad de cruzar
   comportamiento con leads del CRM, y utilidad con tráfico bajo.
2. Recomendación concreta (probablemente un híbrido) con justificación.
3. Plan de cumplimiento legal: qué consentimiento hace falta, qué carga antes y
   después del opt-in, enmascarado de inputs en grabaciones, DPA, cambios a la
   política de privacidad.
4. Diseño de datos para la parte propia: cambios a `eventos` (o tabla nueva del
   núcleo), nuevos tipos de evento, índices, RPC, retención (pg_cron), exclusión
   de tráfico interno.
5. Lista de widgets nuevos para el panel y de dónde sale cada dato.
6. Plan por fases con estimaciones y un "primer PR" acotado.
7. Riesgos y cómo mitigarlos.

FORMATO
Markdown, en español, con tablas donde ayude. Señalá los supuestos que estás
haciendo y qué habría que verificar con un abogado local antes de implementar.
```
