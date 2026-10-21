# Costo SV / Guerrero Properties — guía para Claude Code

Sitio inmobiliario de Walter Guerrero (agente RE/MAX Elite, El Salvador), con
marca pública "Guerrero Properties", en guerrero-properties.com. **Walter no es
técnico** — necesita pasos literales, paso a paso, para cualquier cosa fuera de
este chat (Supabase SQL Editor, Vercel, Meta Ads Manager). Nunca asumir que ya
sabe dónde queda un botón o menú en esas herramientas externas.

## Arquitectura

- **Sitio público**: HTML/CSS/JS estático servido tal cual (sin build), en la
  raíz del repo. `app.js` = lógica compartida (leads, WhatsApp). `styles.css` =
  estilos compartidos. `config.js` = `window.SITE_CONFIG` (SITE_URL, claves
  públicas de Supabase, número de WhatsApp) — única fuente de verdad, nunca
  hardcodear estos valores en otro lado.
- **Panel clásico** (`panel.html`, `propiedades-admin.html`): una sola página
  con bloques `<script>` gigantes, sin build. Tabs vía `cambiarTab()`, modales
  vía `.modal-overlay`/`.modal-box` + `classList.add/remove('show')`.
- **Panel nuevo** (`panel/`): app Vite/React, se migra incrementalmente desde
  el panel clásico. Desplegado junto con el sitio bajo `/panel`. Ambos paneles
  conviven — una feature nueva casi siempre va en LOS DOS (ver "Nueva sección
  de panel" abajo).
- **Backend**: Supabase (proyecto `iseoyfiteeobzvtfjhoe`). RLS en todas las
  tablas. Escrituras públicas (sin login) pasan SIEMPRE por `/api/lead` con
  `SUPABASE_SERVICE_ROLE_KEY` del lado del servidor — nunca con la clave anon
  desde el navegador.
- **Deploy**: un solo proyecto Vercel (`guerrero1`/`costo-sv`). `build-static.mjs`
  arma `dist_site/` (sitio público copiado tal cual + `panel/dist` compilado) —
  ese es el Output Directory. `api/` lo despliega Vercel directo, sin pasar
  por ese script. Push a `main` → deploy automático.

## Restricciones duras

- **Vercel Hobby: máximo 12 funciones serverless** (`api/*.js`). Ya estamos
  exactamente en 12 — correr `ls api/*.js | wc -l` antes de agregar una
  función nueva. Si ya hay 12, fusionar la lógica nueva en una función
  existente (ver `api/lead.js`, que ya rutea POST por
  `kyc_caso_id`/`contrato_id`/lead normal, y GET por `?contrato_id=`) en vez
  de crear un archivo nuevo. Pasarse de 12 rompe el build SIN error visible:
  el sitio sigue sirviendo el deploy anterior como si nada. Si un deploy no
  refleja el último commit, lo primero a revisar es el conteo de funciones.
- **El webhook de GitHub→Vercel a veces no dispara** un deploy nuevo (pasó
  más de una vez, sin relación al límite de funciones). Si `vercel ls` no
  muestra un deployment nuevo minutos después de un push, un commit vacío
  (`git commit --allow-empty -m "..."`) y volver a pushear lo destraba. Usar
  `vercel inspect <url> --logs` para ver el log de build real de un
  deployment específico (hay sesión de Vercel CLI ya autenticada como
  `realtorapp26-bot`, equipo `guerrero1`). **No usar `vercel link` sin
  `--project costo-sv` explícito** — sin eso crea un proyecto nuevo por el
  nombre del directorio en vez de enlazar al existente.
- **Cache**: cualquier archivo público que se edite activamente necesita su
  propia entrada en `vercel.json` → `headers` con
  `Cache-Control: no-store, must-revalidate`, si no el CDN de Vercel sirve
  versiones viejas por horas pese a redeploys. `panel.html` y los generadores
  de PDF (`carta-oferta.html/js`, `carta-respuesta.html/js`,
  `kyc-cliente.html/js`, `contrato-firma.html/js`) ya la tienen — replicar el
  patrón para cualquier página nueva de este estilo.
- **Las migraciones de Supabase las aplica Walter a mano**, pegando el SQL en
  el SQL Editor del dashboard. Nunca asumir que una migración ya corrió —
  avisarle con el SQL completo listo para copiar y pegar ("Pegá esto... y
  dale Run"), y verificar después con una llamada real (ver abajo).

## Verificar sin login

Las páginas públicas (`kyc-cliente.html`, `contrato-firma.html`, etc.) y
`/api/lead` no requieren sesión, así que se pueden probar en producción con
`curl` sin credenciales — por ejemplo, un POST con un id inventado a
`/api/lead` debe devolver un error claro ("no se encontró...") y no un 500;
eso confirma que el ruteo nuevo llegó a producción y que la tabla ya existe.

## Patrones establecidos

### PDF bilingüe con firma
Todos los documentos firmables (`kyc-cliente.js`, `carta-oferta.js`,
`carta-respuesta.js`, `contrato-firma.js`) usan jsPDF puro (sin html2canvas),
canvas de firma a mano con los mismos listeners mouse/touch, e "inglés
primero + anexo en español" vía un selector `document_language`.

**Paginación**: `carta-respuesta.js`/`kyc-cliente.js`/`contrato-firma.js`
usan el patrón robusto (`drawPageHeader`, `ensureSpace`,
`infoGrid`/`buildInfoRows`, `drawSignatureBlock`, `addPageFooters`) —
preferir ESTE patrón para cualquier documento nuevo. `carta-oferta.js`
todavía usa un layout de una sola página con posición de firma semi-fija
(`Math.min/max`) por motivos históricos; si se le agrega contenido variable
(como pasó con "notas adicionales"), hay que revisar a mano en qué punto la
firma deja de moverse con el contenido y agregar un
`if (y > N) pdf.addPage()` ANTES de ese punto, no después.

**Tamaño de la firma**: la imagen se escala preservando aspecto dentro de una
caja (`sw = min(ANCHO_MAX, ALTO_MAX*ratio)`, etc.) — no estirar a un tamaño
fijo sin preservar proporción. Dejar margen generoso entre el cuerpo del
texto y la firma, y entre la firma y las etiquetas de abajo (FIRMA/NOMBRE/
FECHA/HORA) — Walter ya pidió una vez que se agrandara todo esto.

**Canvas de firma oculto al medir**: si una página carga datos por fetch
antes de mostrar el formulario (p. ej. `contrato-firma.js`), NO llamar
`initCanvas()` antes de que el contenedor sea visible — mide
`getBoundingClientRect()` con ancho 0 y el canvas queda con un tamaño de
respaldo chico para siempre; lo que el usuario dibuja fuera de esa zona
chica se pierde (firma "cortada"). Reinicializar el canvas recién después de
sacar la clase `d-none`.

### Borradores/plantillas reusables
Patrón usado en Contratos (`contrato_borradores`), Carta de Oferta
(`oferta_borradores`) y Carta de Respuesta (`respuesta_borradores`): una
tabla `nombre` + `campos jsonb` con los campos reusables del formulario
(nunca fechas ni firmas, esas siempre se vuelven a poner frescas). Si el
formulario público tiene login (panel), RLS solo para `authenticated`. Si el
formulario público NO tiene login (carta-oferta.html, carta-respuesta.html —
el cliente los llena solo con el link), la política de SELECT es
`to anon, authenticated` (lectura pública) pero INSERT/DELETE siguen siendo
solo `authenticated` — Walter los crea/borra desde un modal en panel.html.

### Casos en dos fases (agente crea → cliente completa y firma)
KYC y Contratos siguen este patrón:
1. El agente crea el caso en el panel (autenticado, escribe directo a
   Supabase con la clave anon + sesión).
2. Se genera un link público con el id del caso.
3. La página pública lee los datos:
   - Si son pocos campos cortos (KYC): van directo en la URL
     (`?caso=...&nombre=...`).
   - Si es mucho contenido (Contratos: términos, inventario, firma del
     corredor ya puesta): la URL solo lleva el id, y la página hace
     `GET /api/lead?contrato_id=...` (service_role, sin RLS) para traer todo.
4. El cliente completa lo que falta y firma; el POST a `/api/lead` (mismo
   archivo, rama por el campo presente en el body) sube el PDF y marca el
   caso como completado.

### Nueva sección de panel
Casi toda feature nueva de panel va en LOS DOS paneles:
- **Clásico** (`panel.html`): tab en `cambiarTab()` + `.tab-panel`, modal
  `.modal-overlay`, funciones `cargarX()/renderX()` que hacen fetch directo a
  `${SUPA_URL}/rest/v1/...` con `CostoSVAuth.authHeaders()`.
- **Nuevo** (`panel/`): tipo en `lib/types.ts`, labels/clases en
  `lib/enums.ts`, hooks `useX()/useCreateX()/...` en `lib/queries.ts`
  (TanStack Query), página en `pages/`, ruta en `App.tsx`, ítem en
  `components/Sidebar.tsx`. El Dashboard (`pages/DashboardPage.tsx`) es el
  resumen general — si una sección nueva tiene un estado "pendiente"
  relevante (KYC por completar, contratos por firmar), sumarle una tarjeta
  ahí también, no solo la página propia.

Subir archivos: el patrón de `storage.ts` (fuerza conversión HEIC + recorte a
2000px) es SOLO para fotos públicas de propiedades. Documentos privados
(identificación, firmas) van por un módulo separado (`storageKyc.ts`,
`storageContratos.ts` en el panel nuevo; `CostoSVAuth.subirArchivoPrivado` en
el clásico) que no procesa el archivo y sube a un bucket privado.

## Probar antes de avisarle a Walter

Puppeteer local contra `file://` (no hace falta levantar un servidor) + la
tool `Read` para inspeccionar visualmente el PDF generado (renderiza cada
página como imagen) — así se agarran overlaps/cortes de contenido ANTES de
que Walter los vea. Para páginas que hacen fetch a Supabase/`/api/lead`, usar
`page.setRequestInterception(true)` y devolver respuestas falsas (ojo: hay
que responder también el preflight OPTIONS con headers CORS, si no el fetch
real falla silenciosamente y el código entra por la rama de error sin
avisar).

`node predeploy-check.mjs` (y `node build-static.mjs` si se tocó algo del
panel nuevo) antes de cada commit que vaya a producción.
