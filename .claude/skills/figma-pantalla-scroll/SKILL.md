---
name: figma-pantalla-scroll
description: Estructura y medidas de scroll de las pantallas de escritorio del SIAF-RP en Figma (frame 1360 × 768 con cabecera de navegador + navbar y contenido desplazable). Usar al crear, clonar o corregir pantallas en Figma —solicitudes, bandejas de Documentos y registros, edición— cuando el contenido «se sobrepone» o «sobresale» al hacer scroll en el prototipo, o cuando se arma una pantalla nueva a partir de otra. Referencia: frame A.1-RC-016-Registro-Solicitud (node 19091:19205) del archivo «CMN PROGRAMACIÓN - SOLICITUD DE NECESIDADES ESTRATÉGICAS».
---

# Pantallas de Figma con scroll (SIAF-RP)

Toda pantalla de escritorio del SIAF-RP en Figma sigue **la misma estructura de scroll**. Al crear una pantalla nueva,
clonarla de otra o corregir una que «se sobrepone al hacer scroll», hay que dejarla exactamente así.

Referencia: **A.1-RC-016-Registro-Solicitud** (`node-id=19091-19205`) en el archivo
`2I0YNMBvedXzdL97vCZp1t` («CMN PROGRAMACIÓN - SOLICITUD DE NECESIDADES ESTRATÉGICAS»), página «A.1. Rol Creador».
Si hay dudas, leer ese frame y copiar sus valores.

## Lo que el usuario NO quiere

Estas «soluciones» ya se probaron y se rechazaron:

- **No recortar el contenido** (`clipsContent = true` en el frame, en `Layout` o en `Scroll`). Se pierde la vista
  completa en el lienzo.
- **No dejar la cabecera fija** (barra del navegador y navbar con `numberOfFixedChildren`, posición absoluta o
  `paddingTop` para reservar su espacio). La pantalla entera se desplaza con su scroll normal.
- **No hacer crecer el frame con el contenido** (`primaryAxisSizingMode = "AUTO"`, `minHeight`). El frame es una
  pantalla de 1360 × 768; lo que no cabe se recorre con el scroll del contenedor `Scroll`.

## La causa principal de que el contenido «se sobreponga»: el orden de apilado

Las medidas solas **no** bastan. En el auto-layout del frame, la cabecera (barra del navegador + navbar) va **antes**
que `Layout`. Si el frame apila «el último encima» (`itemReverseZIndex = false`, el valor por defecto), `Layout` se
dibuja **por encima** de la cabecera y, al hacer scroll, el contenido la tapa. En la referencia el frame y `Layout`
apilan **«el primero encima»** (`itemReverseZIndex = true`, en Figma: *Canvas stacking → First on top*):

```js
frame.itemReverseZIndex = true;  // la cabecera queda encima del contenido que se desplaza
layout.itemReverseZIndex = true;
```

Esto **sí** se lee y se escribe con la API. Era la diferencia que tenía el RC-037 (que se sobreponía) respecto del
RC-016 (que no). Para encontrar diferencias así, comparar las propiedades de cada nivel del frame contra la
referencia (`itemReverseZIndex`, `clipsContent`, `overflowDirection`, `layoutSizingVertical`, `layoutPositioning`).

## Segunda causa: el comportamiento sticky

También importa qué capas son **sticky** al hacer scroll. En la referencia:

| Capa | Comportamiento al hacer scroll |
|---|---|
| `Assets/Browser & URL Controls` (barra del navegador) | **sticky** (`sticky top-0`) |
| `Navigation` / `Navbar Ver` | normal |
| `Navbar-left` (menú lateral) | **normal** — si está sticky, el contenido se sobrepone |
| `Page-header` (título y botones de la solicitud) | **sticky** |
| El resto | normal |

- **La API de plugins no lee ni escribe `scrollBehavior`** (en frames ni en instancias): con `use_figma` las dos
  pantallas parecen idénticas aunque se comporten distinto.
- **Para ver el comportamiento**: `get_design_context` del frame (con `forceCode` y `disableCodeConnect`) y buscar las
  clases `sticky` / `fixed` en cada `data-name`. El resultado es grande: se guarda en archivo y se filtra con un script.
- **Para corregirlo**: reemplazar la capa por una **copia de la del RC-016**, que ya trae el comportamiento correcto
  (`clone()` lo conserva), en la misma posición, y borrar la vieja. No borrar el frame: se perderían las conexiones del
  prototipo que llegan a él.

```js
const [refBrowser, refNavLeft] = await Promise.all([
  figma.getNodeByIdAsync("19091:19206"), // barra del navegador del RC-016 (sticky)
  figma.getNodeByIdAsync("19091:19210"), // Navbar-left del RC-016 (normal)
]);
// por cada frame de pantalla:
const oldBrowser = frame.children.find((c) => c.name === "Assets/Browser & URL Controls" || c.name === "Browser");
const nuevo = refBrowser.clone();
frame.insertChild(frame.children.indexOf(oldBrowser), nuevo);
nuevo.layoutSizingHorizontal = "FILL";
oldBrowser.remove();
const layout = frame.children.find((c) => c.name === "Layout");
const oldNavLeft = layout.children.find((c) => c.name === "Navbar-left");
const navNuevo = refNavLeft.clone();
layout.insertChild(layout.children.indexOf(oldNavLeft), navNuevo);
navNuevo.layoutSizingVertical = "FILL";
oldNavLeft.remove();
```

Al clonar una pantalla de otra sección para armar una nueva, **revisar siempre** este comportamiento con
`get_design_context`: el frame base puede traer el sticky en la capa equivocada.

## La estructura

```
Frame (pantalla)          1360 × 768 · auto-layout VERTICAL · «First on top» · alto FIXED · sin padding · sin recorte · overflow NONE · 0 fijos
├─ Assets/Browser & URL Controls   80 px · HUG · en el flujo (no absoluta)
├─ Navigation (o «Navbar Ver»)     56 px · HUG · en el flujo
└─ Layout                         FILL (grow 1) = 632 px · HORIZONTAL · sin recorte · overflow NONE
   ├─ Navbar-left                 64 px de ancho · alto FILL
   │  └─ Sidebar                  alto FILL
   ├─ (Sidenav, solo bandejas con el menú de procesos abierto)   alto FILL, nunca un alto fijo mayor que 632
   └─ Scroll                      FILL (grow 1) · HORIZONTAL · overflow VERTICAL · sin recorte · gap 10
      └─ Main Content             ancho FILL · alto HUG (crece con su contenido: 819, 961… px)
         ├─ Breadcrumb            40 px
         ├─ Page-header           73 px
         └─ Form-section          HUG
```

En las bandejas el contenedor de scroll está un nivel más abajo: `Layout › Main-content (FILL, grow 1) › Scroll
(FILL, overflow VERTICAL)`. Se aplica lo mismo a ese nivel.

En el lienzo el contenido que no entra en los 632 px **se ve por debajo del frame**: es lo esperado (igual que en el
RC-016). En el prototipo esa parte es la que se recorre con el scroll.

## Que nada sobresalga de la pantalla

Además de la estructura, revisar que ningún elemento se salga **por los costados** ni que un contenedor interno con
alto fijo empuje el contenido:

- **Ancho**: un hijo con ancho FIXED más ancho que su tarjeta se sale por la derecha. Caso conocido: el valor del
  «N° documento» (`Icons + Text` dentro de la tarjeta `_solicitude_number`) venía con 298 px fijos y sobresalía 90 px.
  Corrección: `layoutSizingHorizontal = "FILL"`.
- **Alto**: contenedores de contenido (`Form-section`, `Section`, grillas) con alto FIXED o FILL que cortan su
  contenido → `layoutSizingVertical = "HUG"`. Paneles laterales (`Sidenav`) con alto fijo mayor que 632 → FILL o 632.
- Los modales (500 px o 1287 px de ancho) «sobran» unos 30–60 px solo por su sombra: no es un desborde.

## Pasos

1. Cargar `figma-use` (y `figma-generate-design` si se cambia algo visible) antes de cualquier `use_figma`.
2. Leer el frame de referencia (RC-016) si la estructura del archivo pudo cambiar.
3. Aplicar la estructura con el script de abajo a los frames de las secciones afectadas.
4. **Revisar el comportamiento sticky** con `get_design_context` y, si no coincide con la tabla, reemplazar la barra
   del navegador y el `Navbar-left` por copias de las del RC-016 (ver arriba).
5. Buscar desbordes laterales con el script de comprobación y corregirlos uno por uno (FILL / HUG).
6. Comparar el resultado con el RC-016 en `get_design_context` (clases `sticky`) y en una captura.

## Script: aplicar la estructura

```js
const page = await figma.getNodeByIdAsync("PAGE_ID");
await figma.setCurrentPageAsync(page);
const REFERENCIA = "19091:19205";
const sections = ["SECTION_ID_1", "SECTION_ID_2"];
const result = [], errors = [];
for (const secId of sections) {
  const sec = await figma.getNodeByIdAsync(secId);
  for (const frame of sec.children.filter((c) => c.type === "FRAME")) {
    if (frame.id === REFERENCIA) continue;
    const layout = frame.children.find((c) => c.type === "FRAME" && c.name === "Layout");
    if (!layout || frame.width < 1300) continue; // solo pantallas; los modales no
    try {
      frame.itemReverseZIndex = true;   // cabecera encima del contenido («First on top»)
      layout.itemReverseZIndex = true;
      frame.numberOfFixedChildren = 0;
      frame.paddingTop = 0;
      frame.minHeight = null;
      frame.primaryAxisSizingMode = "FIXED";
      frame.resize(1360, 768);
      frame.overflowDirection = "NONE";
      frame.clipsContent = false;
      layout.layoutGrow = 1;
      layout.layoutSizingVertical = "FILL";
      layout.clipsContent = false;
      layout.overflowDirection = "NONE";
      for (const name of ["Navbar-left", "Sidenav"]) {
        const n = layout.children.find((c) => c.name === name);
        if (n) n.layoutSizingVertical = "FILL";
      }
      let scroll = layout.children.find((c) => c.type === "FRAME" && c.name === "Scroll");
      const mainWrap = layout.children.find((c) => c.type === "FRAME" && c.name === "Main-content");
      if (!scroll && mainWrap) {
        mainWrap.layoutGrow = 1;
        mainWrap.layoutSizingVertical = "FILL";
        mainWrap.clipsContent = false;
        mainWrap.overflowDirection = "NONE";
        scroll = mainWrap.children.find((c) => c.type === "FRAME" && c.name === "Scroll");
      }
      if (!scroll) { errors.push({ frame: frame.name, error: "sin Scroll" }); continue; }
      scroll.layoutGrow = 1;
      scroll.layoutSizingVertical = "FILL";
      scroll.overflowDirection = "VERTICAL";
      scroll.clipsContent = false;
      const content = scroll.children.find((c) => c.type === "FRAME");
      if (content && content.layoutMode !== "NONE") content.layoutSizingVertical = "HUG";
      result.push({ frame: frame.name, h: Math.round(frame.height), scrollH: Math.round(scroll.height) });
    } catch (e) {
      errors.push({ frame: frame.name, id: frame.id, error: String(e).slice(0, 160) });
    }
  }
}
return { total: result.length, result, errors };
```

Si la barra del navegador o el navbar quedaron con posición absoluta o fuera de orden, devolverlos al flujo antes:
`frame.insertChild(0, browser); frame.insertChild(1, nav); browser.layoutPositioning = "AUTO"; nav.layoutPositioning = "AUTO";`
y ambos con `layoutSizingHorizontal = "FILL"`.

## Script: comprobar desbordes laterales

```js
const frame = await figma.getNodeByIdAsync("FRAME_ID");
const b = frame.absoluteBoundingBox;
const derecha = b.x + b.width + 1;
const over = frame.findAll((n) => n.visible && n.absoluteRenderBounds
  && n.absoluteRenderBounds.x + n.absoluteRenderBounds.width > derecha);
const hojas = over.filter((n) => !("children" in n) || !n.children.some((c) => over.includes(c)));
return hojas.map((n) => ({ id: n.id, name: n.name, parent: n.parent?.name, w: Math.round(n.width),
  sobra: Math.round(n.absoluteRenderBounds.x + n.absoluteRenderBounds.width - b.x - b.width) }));
```

## Errores de la API ya vistos

- `scrollBehavior` **no está disponible en la API** (`no such property 'scrollBehavior'`). El sticky se revisa con
  `get_design_context` y se corrige clonando la capa del RC-016 (ver «La causa real…»).
- `findAllWithCriteria` no siempre encuentra instancias anidadas dentro de un clon recién hecho; usar
  `frame.findAll((n) => n.type === "INSTANCE" && n.name === "…")`.
- `resize()` deja el alto en FIXED: llamarlo antes de cambiar `layoutSizing*`.
- Al cambiar variantes de un clon (estado, cabecera sin botones) usar `setProperties` sobre la instancia anidada:
  `flow tags` → `{ Estado: "Verificado" | "Observado" | "Eliminado" | … }`; `Header Solicitude` →
  `{ Type: "Readonly" }` para quitar los botones.
