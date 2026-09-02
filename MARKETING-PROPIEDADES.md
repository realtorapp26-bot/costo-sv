# Marketing por propiedad — estado y decisiones

> Handoff para quien siga trabajando el sitio (humano o IA).
> Fecha: 2026-09-02. Rama: `main`. Sitio: https://guerrero-properties.com
> Commits relevantes: `8fb1386`, `8c978cf`, `1d73998`, `9ee4a1c`.

## TL;DR

El problema "no se puede pautar hacia una propiedad concreta" **ya está resuelto**.
Cada inmueble tiene ahora una **página propia renderizada en el servidor**
(`/propiedad/<slug>`) con preview propio, evento de Pixel por inmueble y CTA de
WhatsApp específico. Además el catálogo (`propiedades.html`) acepta **anclas
`#<slug>`** como complemento para compartir dentro del listado.

**Si vas a mandar tráfico pagado a un inmueble, el destino es `/propiedad/<slug>`.**
No hace falta construir nada más para eso.

---

## Qué se implementó (4 piezas)

### 1. Meta Pixel en todo el sitio — `8fb1386`
- Pixel ID `1592044346046889` en el `<head>` de las **11 páginas públicas**
  (index, vender, comprar, invertir, propiedades, centro-historico, menajes,
  costo-vida, sobre-mi, contacto, 404).
- **Excluidas** a propósito: `panel.html`, `propiedades-admin.html`,
  `restablecer-password.html` (páginas internas, sin tracking de marketing).
- Snippet estándar `fbq('init'…)` + `fbq('track','PageView')`. Idempotente.

### 2. Evento `ViewContent` por propiedad — `8c978cf`
- En `app.js`, función `abrirLightboxImg`: al abrir la ficha de un inmueble
  (clic en tarjeta del grid, o llegada por `?propiedad=<id>`) dispara:
  ```js
  fbq('track', 'ViewContent', {
    content_type: 'home_listing',
    content_ids: ['<id supabase de la propiedad>'],
    content_name: '<título>',
    value: <precio numérico>, currency: 'USD'   // si hay precio
  })
  ```
- Las tarjetas llevan `data-share-precio` (además de `data-share-titulo` /
  `data-share-id` / `data-share-slug`) en `propiedades.html` e `index.html`.
- Best-effort: si el Pixel no cargó, no rompe nada (`typeof window.fbq === 'function'`).
- Habilita: optimizar campañas por "vio ESTE inmueble" y armar públicos de
  retargeting por listing (regla sobre `content_ids` / `content_name`).

### 3. Página propia por propiedad — `1d73998`
- **`api/propiedad.js`**: función serverless (ESM, `export default handler`,
  mismo estilo que `api/generar-copy.js`). Lee la propiedad de Supabase por
  `slug` (y cae a `id` si el slug no matchea o la columna aún no existe) y
  devuelve **HTML completo** con:
  - `<title>`, `meta description` (recorte del `copy_venta`/`descripcion_original`),
    `canonical`, **`og:` y `twitter:` propias** (foto real, título, precio, ubicación).
  - **JSON-LD**: `@graph` con `Product`+`Residence` (con `Offer` si hay precio) y
    `BreadcrumbList`.
  - **Meta Pixel** con `PageView` + `ViewContent` (`content_type: home_listing`).
  - Layout de ficha: galería (hero + miniaturas, abre el lightbox de `app.js`),
    chips (hab/baños/m²/lote/construcción), características, descripción, enlaces
    (mapa por lat/long, tour virtual, video), **CTA de WhatsApp con mensaje que
    incluye el título, el precio y la URL de esa propiedad**.
  - Reusa `styles.css`, fuentes y `app.js` del sitio (navbar, WhatsApp, lightbox,
    métricas propias).
- **`vercel.json`**:
  - `rewrites`: `/propiedad/:slug` → `/api/propiedad?slug=:slug`
  - `redirects`: `/propiedad` (sin slug) → `/propiedades.html`
- Respuesta: `200` con `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`;
  `404` con página "propiedad no disponible" si no existe o no está `publicada`;
  `301` de `/propiedad/<id>` → `/propiedad/<slug>` cuando ya hay slug (URL canónica).
- **Migración `supabase/migrations/20260902000000_propiedades_slug.sql`**: agrega
  `propiedades.slug` + trigger `propiedades_set_slug` que lo genera desde el
  título **solo al insertar** (no lo regenera si después se edita el título → las
  URLs publicadas quedan estables; para forzar, poné `slug = NULL` y guardá).

### 3b. Video de YouTube por propiedad

- Campo `propiedades.video_url` (ya existía, editable en el panel: "Video de
  YouTube (URL)"). Acepta cualquier formato: `watch?v=`, `youtu.be/`, `shorts/`,
  `embed/`, `live/`. Si la URL no es un video (p. ej. link a un canal) se deja
  como enlace de texto, no rompe.
- En `api/propiedad.js`: `youtubeId()` saca el ID; se muestra un reproductor
  **con fachada** (miniatura de YouTube + botón play) que **solo carga el iframe
  al hacer clic** (`youtube-nocookie.com`, sin cookies de terceros hasta que el
  visitante decide ver). Sección "Video de la propiedad" debajo de la descripción.
- Al darle play dispara `fbq('trackCustom', 'PlayPropertyVideo', {content_ids})`
  → sirve para audiencias de engagement / retargeting de "vio el video".
- En el grid (`propiedades.html` e `index.html`): badge **"▶ Video"** en las
  tarjetas que tienen `video_url` (clase `.prop-badge-video` en `styles.css`).
- `render` y `youtubeId` se exportan desde `api/propiedad.js` para poder testear.

### 4. Anclas `#<slug>` en el catálogo — `9ee4a1c`
- En `propiedades.html`: cada `.prop-card` del grid lleva `id="<slug>"`.
- `propiedades.html#<slug>` → scrollea a la tarjeta y la **resalta** ~2.5 s
  (`.prop-card--destacada`, borde dorado que se desvanece).
- `scroll-margin-top: 104px` en `.prop-card` para compensar el navbar sticky.
- Si el filtro de categoría tenía la tarjeta oculta, se **resetea a "Todas"**
  antes de scrollear.
- Función `enfocarPropiedadDesdeUrl()` (reemplazó a `abrirDesdeQueryString`):
  maneja `?propiedad=<id>` (abre el visor — links viejos) **y** `#<slug>`.
  También escucha `hashchange`.
- La ficha `/propiedad/<slug>` vuelve al catálogo con
  `"Volver al inventario" → /propiedades.html#<slug>`.

---

## Sobre la propuesta de "anclas (deep links) por propiedad"

Esa propuesta describía un problema **que ya estaba resuelto** por la pieza 3.
Para el caso de uso que plantea (mandar pauta a un inmueble concreto), una
ancla en `propiedades.html` sería **peor** que la página propia:

| Necesidad para un anuncio a una propiedad | Ancla `propiedades.html#slug` | Página `/propiedad/<slug>` |
|---|---|---|
| Scroll a la tarjeta | ✅ | — (es toda la página) |
| No distraerse con el resto del inventario | ❌ el grid sigue visible | ✅ página aislada |
| Preview propio en el anuncio / al compartir | ❌ og genérico de la página | ✅ foto + precio del inmueble |
| Evento `ViewContent` por inmueble | ❌ | ✅ |
| CTA de WhatsApp de esa propiedad | ❌ genérico | ✅ |

**Decisión:** las anclas se implementaron igual (pieza 4) pero **como
complemento**, no como destino de pauta. Su rol:
- Compartir "mirá esta del catálogo" por WhatsApp sin sacar a la persona del listado.
- Volver desde la ficha al lugar exacto del grid.

**No rehagas la propuesta de anclas como solución de marketing.** Ya está, y el
destino de pauta es `/propiedad/<slug>`.

---

## Qué URL usar para cada cosa

| Uso | URL |
|---|---|
| Anuncios (Meta/Google), retargeting, primer contacto WhatsApp | `https://guerrero-properties.com/propiedad/<slug>` |
| "Mirá esta del catálogo" sin sacar del listado | `https://guerrero-properties.com/propiedades.html#<slug>` |
| Links viejos ya compartidos (compatibilidad) | `propiedades.html?propiedad=<id>` sigue funcionando |

Para campañas, agregar UTM al destino:
`…/propiedad/<slug>?utm_source=meta&utm_campaign=<nombre>` y optimizar el ad set
por **ViewContent**.

---

## Modelo de datos

Tabla `propiedades` (Supabase, proyecto `iseoyfiteeobzvtfjhoe`). **No está en las
migraciones** — se creó a mano en el dashboard; las migraciones solo le hacen
`ALTER`. Campos usados por la ficha: `titulo`, `precio` (texto, ej. `"$129,900"`),
`ubicacion`, `categoria`, `tipo_contrato`, `habitaciones`, `banos`, `m2`,
`tamano_lote`, `tamano_construccion`, `latitud`, `longitud`, `garage`, `hoa`,
`comunidad_cerrada`, `propiedad_nueva`, `tipo_propiedad_detalle`,
`tour_virtual_url`, `video_url` (URL de YouTube — se embebe en la ficha),
`copy_venta`, `descripcion_original`, `fotos` (array de URLs), `publicada` (bool),
**`slug`** (nuevo), `created_at`.

`slug`: `[a-z0-9-]`, único (índice parcial `where slug is not null`). Lo genera
el trigger; se puede sobreescribir con un `UPDATE` manual (el trigger respeta un
slug no vacío).

---

## Pendiente

1. **Correr la migración `20260902000000_propiedades_slug.sql` en el SQL Editor
   de Supabase** (no hay CLI ni service key en el repo). Sin esto, las páginas
   funcionan igual pero las URLs usan el UUID en vez del slug legible.
   > Estado a 2026-09-02: el usuario lo estaba corriendo. Verificar que
   > `select slug, titulo from propiedades` devuelva un slug por fila.
2. Opcional: acortar a mano los slugs de las propiedades actuales (el trigger
   genera slugs largos con el título completo). Seguro de hacer ahora porque
   todavía no hay campañas con esas URLs.
3. `"Propiedad sin título"`: ponerle un título real en el panel; si se deja el
   `slug` en NULL, el trigger lo regenera.
4. Opcional a futuro: sitemap de propiedades, y catálogo de Meta para
   dynamic ads de inmuebles (la base ya sirve para armar el feed:
   `id`, `content_type: home_listing`, precio, foto).

## Qué NO tocar por esto

- `build-seo.mjs` — inyecta og/canonical/JSON-LD en las **páginas .html
  estáticas**. La ficha `/propiedad/<slug>` arma su propio SEO en la función; no
  pasa por ese script. Es idempotente y no afecta lo de marketing.
- El deep-link `?propiedad=<id>` — mantenerlo, hay links viejos circulando.

## Cómo probar

```bash
# Página de propiedad (por slug o por id)
curl -sI https://guerrero-properties.com/propiedad/terreno-golden-lake-costa-del-sol
curl -sI https://guerrero-properties.com/propiedad/<uuid>      # -> 301 al slug

# og propias
curl -s https://guerrero-properties.com/propiedad/<slug> | grep 'og:image\|og:title'

# Pixel + ViewContent en la ficha
curl -s https://guerrero-properties.com/propiedad/<slug> | grep "fbq('track', 'ViewContent'"

# Ancla en el catálogo: abrir en navegador
#   https://guerrero-properties.com/propiedades.html#<slug>   -> scroll + highlight
```

Local (una propiedad concreta, sin levantar Vercel):
```bash
node -e "import('./api/propiedad.js').then(async m=>{const r={setHeader(){}, status(c){this.c=c;return this}, send(b){console.log(this.c);console.log(b.slice(0,2000))}, end(){}}; await m.default({query:{slug:'<uuid-o-slug>'}}, r)})"
```
