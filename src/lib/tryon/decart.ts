import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const API = 'https://api.decart.ai/v1';
export const DECART_MODEL = 'lucy-vton-3.5';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Decart Queue API for pre-recorded video try-on:
 * POST /v1/jobs/{model} (multipart: data, prompt, reference_image) → poll GET /v1/jobs/{id}
 * → download GET /v1/jobs/{id}/content. Jobs time out server-side after 10 minutes.
 */
export async function runVtonJob(opts: {
  apiKey: string;
  video: File;
  garment: File;
  prompt: string;
  output: File;
  signal?: AbortSignal;
  onStatus?: (status: JobStatus) => void;
}): Promise<File> {
  const headers = { 'X-API-KEY': opts.apiKey };
  const form = new FormData();
  form.append('data', opts.video);
  form.append('reference_image', opts.garment);
  form.append('prompt', opts.prompt);

  const submit = await fetch(`${API}/jobs/${DECART_MODEL}`, { method: 'POST', headers, body: form, signal: opts.signal });
  if (!submit.ok) throw new Error(`送出試穿工作失敗（HTTP ${submit.status}）：${await safeText(submit)}`);
  const { job_id: jobId } = (await submit.json()) as { job_id: string };

  const started = Date.now();
  let last: JobStatus | undefined;
  while (true) {
    if (opts.signal?.aborted) throw new Error('已取消');
    const res = await fetch(`${API}/jobs/${jobId}`, { headers, signal: opts.signal });
    if (!res.ok) throw new Error(`查詢試穿進度失敗（HTTP ${res.status}）`);
    const { status } = (await res.json()) as { status: JobStatus };
    if (status !== last) opts.onStatus?.((last = status));
    if (status === 'completed') break;
    if (status === 'failed') throw new Error('Decart 回報試穿失敗，請換一支影片或換一張衣服圖片再試');
    if (Date.now() - started > 11 * 60_000) throw new Error('試穿逾時');
    await sleep(3000);
  }

  return File.downloadFileAsync(`${API}/jobs/${jobId}/content`, opts.output, { headers, idempotent: true });
}

async function safeText(res: { text(): Promise<string> }): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return '';
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
