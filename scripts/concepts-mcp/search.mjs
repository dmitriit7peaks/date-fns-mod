export function tokenize(s) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function bm25Scores(query, chunks, k1 = 1.5, b = 0.75) {
  const qTokens = tokenize(query);
  const N = chunks.length;
  if (N === 0) return [];
  const avgdl = chunks.reduce((s, c) => s + c.tokens.length, 0) / N;
  const df = {};
  for (const c of chunks) {
    const seen = new Set();
    for (const t of c.tokens) {
      if (!seen.has(t)) {
        seen.add(t);
        df[t] = (df[t] || 0) + 1;
      }
    }
  }
  return chunks.map((c) => {
    const tf = {};
    for (const t of c.tokens) tf[t] = (tf[t] || 0) + 1;
    let s = 0;
    for (const qt of qTokens) {
      if (!(qt in tf)) continue;
      const idf = Math.log(1 + (N - (df[qt] || 0) + 0.5) / ((df[qt] || 0) + 0.5));
      const denom = tf[qt] + k1 * (1 - b + (b * c.tokens.length) / avgdl);
      s += (idf * tf[qt] * (k1 + 1)) / denom;
    }
    return s;
  });
}

export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function minmax(arr) {
  if (!arr.length) {
    return arr;
  }

  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;

  return arr.map((v) => (v - min) / range);
}

export function hybridSearch(query, queryEmbedding, index, { k = 5, alpha = 0.6 } = {}) {
  const chunks = index.chunks;

  if (!chunks.length) {
    return [];
  }

  const cosScores = chunks.map((c) => cosine(queryEmbedding, c.embedding));
  const bmScores = bm25Scores(query, chunks);
  const cN = minmax(cosScores);
  const bN = minmax(bmScores);

  const out = chunks.map((c, i) => ({
    chunk: c,
    score: alpha * cN[i] + (1 - alpha) * bN[i],
    cosine: cosScores[i],
    bm25: bmScores[i],
  }));

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, k);
}
