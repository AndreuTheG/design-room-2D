// Genera dist/planta.html: un único archivo con el CSS y el JS incrustados.
// Uso: node build.mjs   (Node 18 o superior, sin dependencias)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(root, p), 'utf8');
const JS_FILES = ['core.js', 'render.js', 'ui.js', 'panel.js']; // el orden importa

const html = read('src/index.html');
const css = read('src/styles.css');
const js = JS_FILES.map(f => `/* ─── ${f} ─── */\n` + read(`src/js/${f}`).replace(/^'use strict';\s*/m, '')).join('\n');

for (const [name, code] of [['CSS', css], ['JS', js]]) {
  if (/<\/(script|style)/i.test(code)) throw new Error(`El ${name} contiene una etiqueta de cierre que rompería el HTML`);
}
const LINK = '<link rel="stylesheet" href="styles.css">';
const SCRIPTS = /<!-- scripts -->[\s\S]*?<!-- \/scripts -->/;
if (!html.includes(LINK) || !SCRIPTS.test(html)) throw new Error('src/index.html no tiene los marcadores esperados');

// Se usan funciones de reemplazo para que los "$" del código no se interpreten como patrones
const out = html
  .replace(LINK, () => `<style>\n${css}</style>`)
  .replace(SCRIPTS, () => `<script>\n(() => {\n'use strict';\n${js}\n})();\n</script>`);

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'index.html'), out);
writeFileSync(join(root, 'docs', '.nojekyll'), '');
console.log(`docs/index.html generado (${Math.round(out.length / 1024)} KB)`);