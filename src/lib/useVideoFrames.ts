import { useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';

import type { FramesState } from './frameTypes';

export type { FramesState } from './frameTypes';

/**
 * Samples `count` evenly spaced frames from a video so the turntable can scrub through them
 * instantly (seeking a real video on every touch move is too slow on phones).
 */
export function useVideoFrames(uri: string | undefined, count = 48, maxWidth = 720): FramesState {
  const player = useVideoPlayer(uri ?? null, (p) => {
    p.muted = true;
  });
  // Results are tagged with the uri they belong to, so a stale result never shows for a new video.
  const [result, setResult] = useState<{ uri: string; state: FramesState } | null>(null);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    const setState = (state: FramesState) => setResult({ uri, state });

    const extract = async (durationSec: number) => {
      try {
        const n = Math.max(8, Math.min(count, Math.round(durationSec * 12)));
        // Stay a little inside the end: the very last timestamp often has no decodable frame.
        const times = Array.from({ length: n }, (_, i) => (i / n) * Math.max(durationSec - 0.05, 0));
        const frames = await player.generateThumbnailsAsync(times, { maxWidth });
        if (!cancelled) setState({ status: 'ready', frames, durationSec });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: (e as Error).message });
      }
    };

    if (player.status === 'readyToPlay' && player.duration > 0) {
      extract(player.duration);
      return () => {
        cancelled = true;
      };
    }
    const loadSub = player.addListener('sourceLoad', ({ duration }) => extract(duration));
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error' && !cancelled) setState({ status: 'error', message: error?.message ?? '影片讀取失敗' });
    });
    return () => {
      cancelled = true;
      loadSub.remove();
      statusSub.remove();
    };
  }, [uri, count, maxWidth, player]);

  if (!uri) return { status: 'idle' };
  return result?.uri === uri ? result.state : { status: 'loading' };
}
