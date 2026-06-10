import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function loadIndex(indexPath) {
  try {
    const content = await readFile(indexPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function saveIndex(indexPath, index) {
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index));
}
