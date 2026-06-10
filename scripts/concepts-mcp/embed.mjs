import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MODEL = 'Xenova/bge-small-en-v1.5';

let pipelinePromise;

function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('feature-extraction', MODEL, { quantized: true });
  }

  return pipelinePromise;
}

export async function embed(text) {
  const pipe = await getPipeline();
  const out = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

export { MODEL };
