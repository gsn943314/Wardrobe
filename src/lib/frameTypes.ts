import type { VideoThumbnail } from 'expo-video';

/** A sampled video frame: a native thumbnail on phones, an image data URL on web. */
export type FrameSource = VideoThumbnail | string;

export type FramesState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; frames: FrameSource[]; durationSec: number }
  | { status: 'error'; message: string };
