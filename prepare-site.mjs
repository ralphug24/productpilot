import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = fileURLToPath(new URL('./', import.meta.url));
const output = resolve(root, 'docs');
const runtimeFiles = ['index.html','styles.css','theme.css','workspace.css','workspace.js','domain.js','projects.js','ai-client.js','ingest.js','prd-export.js','research-data.js','testing-guide.html','guide.css','feedback.html','feedback-config.js','feedback.js'];
await mkdir(output, { recursive: true });
for (const filename of runtimeFiles) await copyFile(join(root, filename), join(output, filename));
// Both the portfolio proxy and the standalone Pages site use this path.
const html = await readFile(join(output, 'index.html'), 'utf8');
await writeFile(join(output, 'index.html'), html.replace('<head>', '<head>\n  <base href="/productpilot/">'));
for (const directory of ['vendor','research']) {
  await mkdir(join(output, directory), { recursive: true });
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    if (entry.isFile()) await copyFile(join(root, directory, entry.name), join(output, directory, entry.name));
  }
}
await writeFile(join(output, '.nojekyll'), '');
console.log(`Prepared GitHub Pages assets in ${output}. Source tools, tests, and local workspace files are excluded.`);
