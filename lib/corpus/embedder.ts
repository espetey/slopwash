/**
 * The Embedder interface (build spec section 4, Item C0; decision
 * D-1). Corpus dispersion can use embedding similarity across a set.
 * Every other measure in lib/corpus is deterministic and runs
 * without a model.
 *
 * One implementation ships: a local model (all-MiniLM-L6-v2 through
 * @huggingface/transformers), loaded by dynamic import so the app
 * builds and runs without the package installed. When the package or
 * the model is unavailable, embedding measures are skipped and the
 * run records embedder "none"; the deterministic measures are the
 * product either way. No external embedding vendor is wired in.
 */

export interface Embedder {
  /** Name and version, recorded on every run that uses it. */
  name: string;
  embed(texts: string[]): Promise<number[][]>;
}

export class EmbedderUnavailableError extends Error {}

const LOCAL_MODEL = "Xenova/all-MiniLM-L6-v2";

interface TransformersModule {
  pipeline: (
    task: string,
    model: string
  ) => Promise<
    (
      texts: string[],
      options: { pooling: string; normalize: boolean }
    ) => Promise<{ tolist: () => number[][] }>
  >;
}

export class LocalEmbedder implements Embedder {
  name = `local:${LOCAL_MODEL}`;
  private extractor: TransformersModule["pipeline"] extends never
    ? never
    : Awaited<ReturnType<TransformersModule["pipeline"]>> | null = null;

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.extractor) {
      let mod: TransformersModule;
      try {
        const specifier = "@huggingface/transformers";
        mod = (await import(/* webpackIgnore: true */ specifier)) as
          unknown as TransformersModule;
      } catch {
        throw new EmbedderUnavailableError(
          "The local embedding package (@huggingface/transformers) is not installed in this environment. Embedding measures are skipped; deterministic measures still run."
        );
      }
      try {
        this.extractor = await mod.pipeline("feature-extraction", LOCAL_MODEL);
      } catch (err) {
        throw new EmbedderUnavailableError(
          `The local embedding model could not be loaded: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
    const output = await this.extractor(
      texts.map((t) => t.slice(0, 8000)),
      { pooling: "mean", normalize: true }
    );
    return output.tolist();
  }
}

/**
 * The embedder this process should use, from the environment.
 * Embeddings are opt-in: SLOPWASH_EMBEDDER=local enables the local
 * model. Anything else returns null and runs record embedder "none".
 */
export function getEmbedderFromEnv(): Embedder | null {
  if (process.env.SLOPWASH_EMBEDDER === "local") {
    return new LocalEmbedder();
  }
  return null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dims = vectors[0].length;
  const out = new Array<number>(dims).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dims; i++) out[i] += v[i] / vectors.length;
  }
  return out;
}
