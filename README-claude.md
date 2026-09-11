# Planta

Editor web de planos de vivienda en 2D (vista en planta) con medidas reales en metros. Sin frameworks ni dependencias: HTML, CSS y JavaScript.

## Abrirlo

- **Uso normal:** abre `dist/planta.html` con doble clic. Es un único archivo autocontenido.
- **Desarrollo:** abre `src/index.html`. Carga los fuentes por separado, así que los cambios se ven al recargar sin compilar.
- **Regenerar el archivo único** tras tocar el código: `node build.mjs` o `npm run build` (Node 18+).

## Estructura

```
planta-proyecto/
├── build.mjs          Une src/ en dist/planta.html
├── package.json
├── dist/
│   └── planta.html    Versión compilada (un solo archivo)
└── src/
    ├── index.html     Estructura de la página
    ├── styles.css     Estilos y paleta de la interfaz
    └── js/
        ├── core.js    Constantes, catálogo, geometría, colisiones, modelo, historial, guardado
        ├── render.js  Dibujo del plano en SVG
        ├── ui.js      Lienzo: vista, selección, arrastres, dibujo a mano, teclado
        └── panel.js   Panel lateral, inspectores, biblioteca, menú, exportación, arranque
```

Los scripts se cargan en ese orden y comparten ámbito global. El build los envuelve en una única función autoejecutable.

## Cómo funciona

**Unidades.** Todo el modelo está en metros. X crece hacia la derecha e Y hacia abajo, como en pantalla. `view.scale` son píxeles por metro.

**Modelo.** Un proyecto es un objeto `doc` que se guarda tal cual como JSON:

```json
{
  "rooms": [{ "id": "r_salon", "name": "Salón", "color": "#E9C9A6",
    "points": [{"x":0,"y":0}, {"x":4.6,"y":0}, {"x":4.6,"y":4.2}, {"x":0,"y":4.2}],
    "thick": [0.25, 0.10, 0.25, 0.25], "labelOffset": {"x":0,"y":0} }],
  "openings": [{ "id": "o_ent", "type": "door", "roomId": "r_salon", "edge": 2, "offset": 3.2,
    "width": 0.9, "style": "swing", "leaves": 1, "swing": "in", "hinge": "start" }],
  "furniture": [{ "id": "f_1", "name": "Sofá", "shape": "rect", "x": 3.3, "y": 2.2,
    "w": 2.0, "h": 0.9, "rot": 90, "color": "#8FA8BC" }],
  "columns": [{ "id": "c_1", "shape": "rect", "x": 0.15, "y": 0.15, "w": 0.3, "h": 0.3 }],
  "labels": [{ "id": "l_1", "text": "Entrada", "x": 0.95, "y": 4.8, "size": "m" }]
}
```

- **Habitaciones:** cada una es el polígono interior (`points`). El lado `i` va de `points[i]` a `points[i+1]` y su grosor `thick[i]` crece hacia fuera, con esquinas a inglete. Los m² son la superficie útil interior.
- **Muros compartidos:** si dos habitaciones comparten muro, sus muros se superponen. Las puertas y ventanas atraviesan todos los muros paralelos solapados.
- **Aberturas:** se anclan a un lado con `roomId`, `edge` y `offset` (distancia desde `points[edge]`).
- **Muebles:** `x, y` es el centro, `w × h` el tamaño antes de rotar y `rot` los grados en sentido horario.
- **Imagen de fondo (`bg`):** opcional, un único objeto (no una lista): `{ "src": "data:image/png;base64,...", "x": 4, "y": 2.5, "w": 6, "h": 4.2, "rot": 0, "opacity": 0.6, "locked": false, "visible": true, "ar": 1.43 }`. `x, y` es el centro y `w × h` el tamaño en metros antes de rotar, igual que un mueble. `ar` guarda la relación de aspecto original de la imagen para que el campo "Ancho" del inspector siempre recalcule el alto sin deformarla. Sirve para calcar un plano descargado (PDF exportado a imagen, foto, folleto de la promoción) y dibujar habitaciones y muebles encima; se dibuja siempre detrás de todo lo demás y se excluye de la exportación a PNG.

**Render.** `renderScene()` genera el SVG entero como texto en cada frame (`requestAnimationFrame`). Es simple de razonar y sobra rendimiento para planos de vivienda.

**Colisiones.** Los muros se tratan como cuadriláteros convexos y se comprueban con SAT; los círculos, por distancia a segmentos. Al arrastrar, el mueble avanza hasta tocar el muro y se desliza por él. Si sigues tirando hasta que cabe entero al otro lado, lo atraviesa. Las zonas de apertura son sectores de 90° desde la bisagra.

**Historial.** Cada cambio confirmado guarda una instantánea JSON (máximo 200) para deshacer y rehacer.

**Guardado.** Dentro de Claude se guarda solo con `window.storage`. Fuera de Claude esa API no existe: usa el menú ⋯ para guardar y abrir `.json` o exportar PNG.

## Dónde tocar para cambios típicos

| Cambio | Dónde |
|---|---|
| Añadir muebles al catálogo | `PRESETS` en `core.js` |
| Colores de suelos y muebles | `ROOM_COLORS` y `FURN_COLORS` en `core.js` |
| Colores del plano (muros, acento, rejilla) | objeto `C` en `core.js` |
| Paleta y tipografía de la interfaz | variables `:root` en `styles.css` |
| Cómo se dibuja un elemento | funciones `*Svg` en `render.js` |
| Campos del inspector | `inspectorHTML`, `getField` y `setField` en `panel.js` |
| Plano de ejemplo | `demoDoc` en `core.js` |
| Imagen de fondo (subida, arrastre, escala) | `bgHTML`/inspector `kind==='bg'` en `panel.js`, `setBgFromFile` en `ui.js`, `bgSvg`/`bgHandles` en `render.js` |

## Atajos

| Acción | Atajo |
|---|---|
| Deshacer / rehacer | Ctrl+Z / Ctrl+Mayús+Z o Ctrl+Y (Cmd en Mac) |
| Duplicar | Ctrl+D |
| Eliminar | Supr o Retroceso |
| Girar 90° | R (Mayús+R en sentido contrario) |
| Mover la selección | Flechas: 1 cm; con Mayús: 10 cm |
| Mover la vista | Arrastrar el fondo, Espacio + arrastrar, o botón central |
| Zoom | Rueda, pellizco, + y − |
| Encuadrar todo | F |
| Girar con saltos de 15° | Mayús mientras giras con el asa |
| Ignorar colisiones | Alt mientras arrastras |
| Dibujo a mano | Clic añade vértice; medida + Enter fija el tramo; Enter cierra; Retroceso deshace; Esc cancela |

## Limitaciones conocidas

- Fuera de Claude no hay guardado automático: solo guardar y abrir JSON a mano.
- Los muebles pueden solaparse entre sí; solo chocan con muros y columnas.
- Estirar una habitación no arrastra a la vecina con la que comparte muro.
- Las columnas solo giran de 90 en 90°.
- La posición de una abertura se mide desde el vértice inicial del lado, que depende del orden en que se creó la habitación.
- La imagen de fondo no sale en la exportación PNG (solo sirve de referencia para calcar) y no se guarda si el archivo pesa más de 15 MB. Al guardar como JSON queda embebida en base64, así que el archivo del proyecto puede pesar bastante más que la imagen original.
