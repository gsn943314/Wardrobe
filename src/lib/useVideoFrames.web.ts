import { useEffect, useState } from 'react';

import type { FramesState } from './frameTypes';

export type { FramesState } from './frameTypes';

function waitFor(video: HTMLVideoElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error('影片讀取失敗'));
    };
    const cleanup = () => {
      video.removeEventListener(event, ok);
      video.removeEventListener('error', fail);
    };
    video.addEventListener(event, ok);
    video.addEventListener('error', fail);
  });
}

/** Web version: seek a hidden <video> and copy each frame to a canvas as a JPEG data URL. */
async function extractFrames(uri: string, count: number, maxWidth: number, isCancelled: () => boolean) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = uri;
  await waitFor(video, 'loadeddata');

  const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
  if (!durationSec) throw new Error('讀不到影片長度');
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
  canvas.height = Math.round((video.videoHeight || maxWidth * 1.6) * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('瀏覽器不支援 canvas');

  const n = Math.max(8, Math.min(count, Math.round(durationSec * 12)));
  const frames: string[] = [];
  for (let i = 0; i < n; i++) {
    if (isCancelled()) return null;
    video.currentTime = (i / n) * Math.max(durationSec - 0.05, 0);
    await waitFor(video, 'seeked');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL('image/jpeg', 0.82));
  }
  video.removeAttribute('src');
  video.load();
  return { frames, durationSec };
}

export function useVideoFrames(uri: string | undefined, count = 48, maxWidth = 720): FramesState {
  const [result, setResult] = useState<{ uri: string; state: FramesState } | null>(null);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    extractFrames(uri, count, maxWidth, () => cancelled)
      .then((r) => {
        if (r && !cancelled) setResult({ uri, state: { status: 'ready', ...r } });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        // Videos picked on web live only for the current page session.
        const message = uri.startsWith('blob:') ? '網頁版重新整理後影片會失效，請到「我」分頁重新選一次影片。' : e.message;
        setResult({ uri, state: { status: 'error', message } });
      });
    return () => {
      cancelled = true;
    };
  }, [uri, count, maxWidth]);

  if (!uri) return { status: 'idle' };
  return result?.uri === uri ? result.state : { status: 'loading' };
}
