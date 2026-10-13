import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Pass the node_modules directory containing pdfjs-dist and jszip.');
const destination = new URL('./vendor/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const [file, globalName, output] of [['pdf.mjs', 'pdfjsLib', 'pdf.js'], ['pdf.worker.mjs', 'pdfjsWorker', 'pdf-worker.js']]) {
  let content = await readFile(path.join(source, 'pdfjs-dist', 'build', file), 'utf8');
  content = content.replaceAll('import.meta.url', '__pilotScriptUrl');
  content = content.replace(/^export \{ ([^}]+) \};/m, (_, exports) => `globalThis.${globalName} = { ${exports} };`);
  content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
  await writeFile(new URL(output, destination), `(function(){\nconst __pilotScriptUrl = typeof document !== 'undefined' ? document.currentScript?.src : '';\n${content}\n})();\n`);
}
await copyFile(path.join(source, 'pdfjs-dist', 'LICENSE'), new URL('PDFJS-LICENSE.txt', destination));
await copyFile(path.join(source, 'jszip', 'dist', 'jszip.min.js'), new URL('jszip.min.js', destination));
await copyFile(path.join(source, 'jszip', 'LICENSE.markdown'), new URL('JSZIP-LICENSE.txt', destination));
console.log('Prepared local PDF.js and JSZip libraries.');
