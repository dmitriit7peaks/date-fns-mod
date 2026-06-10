import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MIN_CHUNK_CHARS = 80;
const MAX_CHUNK_CHARS = 2400;

export async function chunkFile(filepath, repoRoot) {
  const content = await readFile(filepath, 'utf8');
  const relPath = path.relative(repoRoot, filepath);
  const lines = content.split('\n');

  let docTitle = path.basename(filepath, '.md');
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)/);

    if (m) {
      docTitle = m[1].trim();
      break;
    }
  }

  const sections = [];
  let currentHeading = docTitle;
  let buf = [];

  const flush = () => {
    const body = buf.join('\n').trim();

    if (body.length >= MIN_CHUNK_CHARS) {
      sections.push({ heading: currentHeading, body });
    }

    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);

    if (m) {
      flush();
      currentHeading = m[1].trim();
      continue;
    }

    if (/^#\s+/.test(line)) continue;

    buf.push(line);
  }

  flush();

  const chunks = [];
  let idx = 0;

  for (const s of sections) {
    const pieces = splitLong(s.body, MAX_CHUNK_CHARS);

    for (const piece of pieces) {
      chunks.push({
        id: `${relPath}#${idx++}`,
        path: relPath,
        docTitle,
        heading: s.heading,
        text: `# ${docTitle} — ${s.heading}\n\n${piece}`,
      });
    }
  }

  return chunks;
}

function splitLong(text, max) {
  if (text.length <= max) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/);
  const out = [];
  let cur = '';

  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length > max && cur) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }

  if (cur) {
    out.push(cur);
  }

  return out;
}
