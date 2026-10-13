import { readFile, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('./research/manifest.json', import.meta.url), 'utf8'));
const documents = await Promise.all(manifest.documents.map(async item => ({
  ...item, format: 'TXT', origin: 'Bundled research library',
  path: `${manifest.folder}/${item.file}`,
  text: await readFile(new URL(`./research/${item.file}`, import.meta.url), 'utf8')
})));
await writeFile(new URL('./research-data.js', import.meta.url), `/* Generated from research/manifest.json and the source transcripts. */\nwindow.PilotResearch = ${JSON.stringify({ ...manifest, documents }, null, 2)};\n`);
console.log(`Prepared library index: ${documents.length} source documents.`);
