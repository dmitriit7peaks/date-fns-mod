#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embed } from "./embed.mjs";
import { loadIndex } from "./store.mjs";
import { hybridSearch } from "./search.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const INDEX_PATH = path.join(REPO_ROOT, "docs/concepts/.index.json");

let cachedIndex;
async function getIndex() {
  if (!cachedIndex) {
    cachedIndex = await loadIndex(INDEX_PATH);

    if (!cachedIndex) {
      throw new Error(
        `Concepts index not found at ${INDEX_PATH}. Run: npm run concepts:index`
      );
    }
  }
  return cachedIndex;
}

const server = new Server(
  { name: "concepts", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search",
      description:
        "Search curated concept docs explaining the WHY behind date-fns behavior — " +
        "format/parse token footguns (YYYY vs yyyy, DD vs dd), month/day arithmetic and " +
        "end-of-month clamping, DST (addHours vs addDays), parse vs parseISO, time-zone handling. " +
        "Returns the top-K relevant doc chunks with path, heading, score, and snippet. " +
        "CONSULT BEFORE answering any question about date-fns behavior or rationale — even one " +
        "you think you know — because these docs capture constraints and reasons the source code does not.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Natural-language question or symptom, in the developer's own words.",
          },
          k: {
            type: "number",
            description: "Number of top results (default 5).",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get",
      description:
        "Fetch the full content of a concept doc (or specific chunk) by path or id returned from search, " +
        'e.g. "docs/concepts/month-arithmetic-overflow.md". Call this on the top search hit to read the full why + constraints before answering.',
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Path (e.g. "docs/concepts/format-token-footguns.md") or chunk id (e.g. "docs/concepts/...#3").',
          },
        },
        required: ["path"],
      },
    },
    {
      name: "list",
      description:
        "List all concept docs currently indexed — the topics this 'why' layer can answer.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const index = await getIndex();

  if (name === "search") {
    const k = args.k || 5;
    const qE = await embed(args.query);
    const results = hybridSearch(args.query, qE, index, { k });

    const payload = results.map((r) => ({
      path: r.chunk.path,
      id: r.chunk.id,
      heading: r.chunk.heading,
      score: +r.score.toFixed(3),
      cosine: +r.cosine.toFixed(3),
      bm25: +r.bm25.toFixed(3),
      snippet: r.chunk.text.slice(0, 400),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  }

  if (name === "get") {
    const matches = index.chunks.filter(
      (c) => c.path === args.path || c.id === args.path
    );

    if (!matches.length) {
      return {
        content: [{ type: "text", text: `No chunks found for "${args.path}"` }],
        isError: true,
      };
    }

    const body = matches.map((c) => `--- ${c.id} ---\n${c.text}`).join("\n\n");
    return { content: [{ type: "text", text: body }] };
  }

  if (name === "list") {
    const byPath = new Map();

    for (const c of index.chunks) {
      if (!byPath.has(c.path)) byPath.set(c.path, []);
      byPath.get(c.path).push(c.heading);
    }
    const lines = [];

    for (const [p, hs] of byPath) {
      lines.push(p);
      for (const h of hs) lines.push(`  - ${h}`);
    }

    lines.push("");
    lines.push(
      `${index.chunks.length} chunks across ${byPath.size} docs (model=${index.model}, dim=${index.dim})`
    );

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("concepts-mcp ready (stdio)");
