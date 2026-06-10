#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embed } from './embed.mjs';
import { chunkFile } from './chunker.mjs';
import { loadIndex, saveIndex } from './store.mjs';
import { hybridSearch, tokenize } from './search.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '../..');
export const DEFAULT_DOCS = path.join(REPO_ROOT, 'docs');
export const DEFAULT_INDEX = path.join(REPO_ROOT, 'docs/concepts/.index.json');

async function walk(dir, filter) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];

  for (const e of entries) {
    if (e.name.startsWith('.')) continue;

    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, filter)));
    else if (filter(p)) out.push(p);
  }

  return out;
}

async function cmdIndex(opts) {
  const docsDir = opts.docs || DEFAULT_DOCS;
  const indexPath = opts.index || DEFAULT_INDEX;

  console.error(`Indexing ${path.relative(REPO_ROOT, docsDir)}/`);

  const files = await walk(docsDir, (p) => p.endsWith('.md') && !p.endsWith('_TEMPLATE.md'));

  console.error(`  ${files.length} markdown files`);

  const chunks = [];
  for (const f of files) {
    chunks.push(...(await chunkFile(f, REPO_ROOT)));
  }

  console.error(`  ${chunks.length} chunks`);
  console.error(`Embedding (model: Xenova/bge-small-en-v1.5)...`);

  const t0 = Date.now();
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].embedding = await embed(chunks[i].text);
    chunks[i].tokens = tokenize(chunks[i].text);

    if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
      process.stderr.write(`  embedded ${i + 1}/${chunks.length}\r`);
    }
  }

  process.stderr.write('\n');
  console.error(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await saveIndex(indexPath, {
    version: 1,
    createdAt: new Date().toISOString(),
    model: 'Xenova/bge-small-en-v1.5',
    dim: chunks[0]?.embedding?.length ?? 0,
    chunks,
  });

  console.error(`Wrote ${path.relative(REPO_ROOT, indexPath)}`);
}

async function cmdSearch(query, opts) {
  if (!query) {
    console.error('Usage: concepts search "<query>" [-k 5] [--json]');
    process.exit(1);
  }

  const indexPath = opts.index || DEFAULT_INDEX;
  const index = await loadIndex(indexPath);

  if (!index) {
    console.error(`No index at ${indexPath}. Run: npm run concepts:index`);
    process.exit(1);
  }

  const qE = await embed(query);
  const results = hybridSearch(query, qE, index, { k: opts.k || 5 });

  if (opts.json) {
    console.log(
      JSON.stringify(
        results.map((r) => ({
          path: r.chunk.path,
          id: r.chunk.id,
          heading: r.chunk.heading,
          score: +r.score.toFixed(3),
          cosine: +r.cosine.toFixed(3),
          bm25: +r.bm25.toFixed(3),
          snippet: r.chunk.text.slice(0, 240),
        })),
        null,
        2,
      ),
    );

    return;
  }
  console.log(`\nTop ${results.length} for: "${query}"\n`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];

    console.log(
      `${i + 1}. [score=${r.score.toFixed(3)} cos=${r.cosine.toFixed(3)} bm25=${r.bm25.toFixed(3)}] ${r.chunk.path}`,
    );

    console.log(`   §  ${r.chunk.heading}`);

    const lines = r.chunk.text.split('\n').slice(2, 7).join('\n').trim();

    console.log(`   ${lines.replace(/\n/g, '\n   ').slice(0, 320)}\n`);
  }
}

async function cmdGet(arg, opts) {
  if (!arg) {
    console.error('Usage: concepts get <path|id>');
    process.exit(1);
  }

  const indexPath = opts.index || DEFAULT_INDEX;
  const index = await loadIndex(indexPath);

  if (!index) {
    console.error(`No index at ${indexPath}`);
    process.exit(1);
  }
  const matches = index.chunks.filter((c) => c.path === arg || c.id === arg);

  if (!matches.length) {
    console.error(`No chunks found for ${arg}`);
    process.exit(1);
  }

  for (const c of matches) {
    console.log(`--- ${c.id} ---`);
    console.log(c.text);
    console.log();
  }
}

async function cmdList(opts) {
  const indexPath = opts.index || DEFAULT_INDEX;
  const index = await loadIndex(indexPath);

  if (!index) {
    console.error(`No index at ${indexPath}`);
    process.exit(1);
  }

  const byPath = new Map();

  for (const c of index.chunks) {
    if (!byPath.has(c.path)) byPath.set(c.path, []);
    byPath.get(c.path).push(c.heading);
  }

  for (const [p, hs] of byPath) {
    console.log(p);
    for (const h of hs) {
      console.log(`  - ${h}`);
    }
  }

  console.log(
    `\n${index.chunks.length} chunks across ${byPath.size} docs  (model=${index.model}, dim=${index.dim})`,
  );
}

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--json') args.json = true;
    else if (a === '-k' || a === '--k') args.k = parseInt(argv[++i], 10);
    else if (a === '--docs') args.docs = argv[++i];
    else if (a === '--index') args.index = argv[++i];
    else args._.push(a);
  }

  return args;
}

const [cmd, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);

try {
  switch (cmd) {
    case 'index':
      await cmdIndex(opts);
      break;
    case 'search':
      await cmdSearch(opts._.join(' '), opts);
      break;
    case 'get':
      await cmdGet(opts._[0], opts);
      break;
    case 'list':
      await cmdList(opts);
      break;
    default:
      console.error('Usage: concepts <index|search|get|list> [args]');
      console.error('  index                       build index from docs/');
      console.error('  search "<query>" [-k N]     hybrid cosine + BM25 search');
      console.error('  get <path|id>               fetch full chunk(s)');
      console.error('  list                        list indexed docs');
      process.exit(cmd ? 1 : 0);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
