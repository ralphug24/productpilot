import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Optional path to an installed sharp entry point; no image service is needed.
const { default: sharp } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'sharp');
const source = await readFile(new URL('brand-mark.svg', import.meta.url));
const render = size => sharp(source, { density: 288 }).resize(size, size).png().toBuffer();
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(render));
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + 16 * index;
  directory[entry] = size;
  directory[entry + 1] = size;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[index].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(new URL('favicon.ico', import.meta.url), Buffer.concat([directory, ...images]));
await writeFile(new URL('favicon-32.png', import.meta.url), images[1]);
await writeFile(new URL('apple-touch-icon.png', import.meta.url), await render(180));
console.log('Prepared favicons from the ProductPilot application mark.');
