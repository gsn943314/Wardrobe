import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';

import { deleteFile, localImageFile, tryOnDir, workDir } from '../files';
import type { TryOnResult } from '../types';
import { runVtonJob } from './decart';
import type { TryOnPass } from './plan';

export type PassProgress = { index: number; status: 'waiting' | 'running' | 'done' | 'error'; detail?: string };

/**
 * Applies each garment as its own pass, feeding the previous output video into the next pass,
 * because the model takes one reference image per job. Without an API key it runs in demo mode:
 * the base video is reused unchanged so the rest of the flow (viewer, saving) can be tried.
 */
export async function runOutfitTryOn(opts: {
  apiKey?: string;
  baseVideoUri: string;
  passes: TryOnPass[];
  signal?: AbortSignal;
  onProgress: (p: PassProgress) => void;
}): Promise<TryOnResult> {
  const resultId = randomUUID();
  const steps = opts.passes.map((p) => p.label);

  if (!opts.apiKey) {
    opts.passes.forEach((_, index) => opts.onProgress({ index, status: 'done', detail: '示範模式：未實際換衣' }));
    return { id: resultId, createdAt: Date.now(), videoUri: opts.baseVideoUri, baseVideoUri: opts.baseVideoUri, provider: 'demo', steps };
  }

  let current = new File(opts.baseVideoUri);
  for (const [index, pass] of opts.passes.entries()) {
    opts.onProgress({ index, status: 'running', detail: '上傳中' });
    try {
      const garment = await localImageFile(pass.item.images[pass.item.tryOnImageIndex] ?? pass.item.images[0]);
      const isLast = index === opts.passes.length - 1;
      const output = new File(isLast ? tryOnDir() : workDir(), `${resultId}-${index}.mp4`);
      current = await runVtonJob({
        apiKey: opts.apiKey,
        video: current,
        garment,
        prompt: pass.prompt,
        output,
        signal: opts.signal,
        onStatus: (s) =>
          opts.onProgress({ index, status: 'running', detail: s === 'pending' ? '排隊中' : s === 'processing' ? '生成中' : s }),
      });
      opts.onProgress({ index, status: 'done' });
    } catch (e) {
      opts.onProgress({ index, status: 'error', detail: (e as Error).message });
      throw e;
    }
  }

  // Intermediate pass outputs are only needed as inputs to the next pass.
  for (let i = 0; i < opts.passes.length - 1; i++) deleteFile(new File(workDir(), `${resultId}-${i}.mp4`).uri);

  return { id: resultId, createdAt: Date.now(), videoUri: current.uri, baseVideoUri: opts.baseVideoUri, provider: 'decart', steps };
}
