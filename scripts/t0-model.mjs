import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, statfs } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(await readFile(new URL('../src/t0/model.json', import.meta.url)));
const directory = new URL('../.local/t0/', import.meta.url);
await mkdir(directory, { recursive: true });
const destination = new URL(manifest.filename, directory);
const partial = new URL(`${manifest.filename}.partial`, directory);
async function verify(path) {
  if ((await stat(path)).size !== manifest.bytes) throw new Error('Model size mismatch');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  if (digest.digest('hex') !== manifest.sha256) throw new Error('Model SHA-256 mismatch');
}
try {
  await stat(destination);
  await verify(destination);
  console.log('Existing pinned model verified:', destination.pathname);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const space = await statfs(fileURLToPath(directory));
  if (space.bavail * space.bsize < manifest.bytes + 1024 ** 3) {
    throw new Error('Need artifact size plus 1 GiB free; existing files are preserved');
  }
  const response = await fetch(manifest.url, { signal: AbortSignal.timeout(600000) });
  if (!response.ok || !response.body) throw new Error(`Download HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial, { flags: 'wx' }));
  await verify(partial);
  await rename(partial, destination);
  console.log('Downloaded and SHA-256 verified:', destination.pathname);
}
