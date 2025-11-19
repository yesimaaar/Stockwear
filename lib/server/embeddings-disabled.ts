export const runtime = "nodejs";

export async function generateEmbeddingFromBuffer(): Promise<never> {
  throw new Error('Embedding generation is disabled in this deployment.');
}

export async function ensureEmbeddingModelLoaded(): Promise<never> {
  throw new Error('Embedding generation is disabled in this deployment.');
}
