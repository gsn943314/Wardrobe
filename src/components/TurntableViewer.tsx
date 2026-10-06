import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { FrameSource, FramesState } from '@/lib/frameTypes';
import { colors } from './theme';

const PX_PER_FRAME = 7;
const RESUME_AFTER_MS = 2500;
const MAX_SCALE = 4;

/**
 * "Fake 3D" viewer: frames sampled from a turnaround video loop on their own; dragging scrubs
 * through them so the body turns with the finger (left = counter-clockwise, right = clockwise
 * when `direction` matches how the video was filmed), and pinching zooms in on garment details.
 * When `compare` is given, the same frame index is shown from the original video for before/after.
 */
export function TurntableViewer({
  frames,
  compare,
  showCompare,
  direction,
  aspectRatio = 9 / 16,
}: {
  frames: FramesState;
  compare?: FramesState;
  showCompare?: boolean;
  direction: 1 | -1;
  aspectRatio?: number;
}) {
  const ready = frames.status === 'ready' ? frames : undefined;
  const count = ready?.frames.length ?? 0;
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  // Gesture state lives in shared values so the gesture worklets can read/write it on the UI thread.
  const current = useSharedValue(0);
  const startIndex = useSharedValue(0);
  const interacting = useSharedValue(false);
  const idleMs = useSharedValue(RESUME_AFTER_MS);
  const scale = useSharedValue(1);
  const pinchStart = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Idle loop: advance at the video's own frame spacing so it plays like the original clip,
  // pausing while the user is touching / zoomed and for a moment after they let go.
  useEffect(() => {
    if (!ready || count < 2) return;
    const stepMs = Math.max(30, (ready.durationSec * 1000) / count);
    const timer = setInterval(() => {
      if (interacting.get() || scale.get() > 1.01) return;
      idleMs.set(idleMs.get() + stepMs);
      if (idleMs.get() < RESUME_AFTER_MS) return;
      const next = (current.get() + 1) % count;
      current.set(next);
      setIndex(next);
    }, stepMs);
    return () => clearInterval(timer);
  }, [ready, count, current, idleMs, interacting, scale]);

  const height = width / aspectRatio;

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .onBegin(() => {
      interacting.set(true);
      idleMs.set(0);
      startIndex.set(current.get());
      startX.set(tx.get());
      startY.set(ty.get());
    })
    .onUpdate((e) => {
      const s = scale.get();
      if (s > 1.01) {
        const maxX = ((s - 1) * width) / 2;
        const maxY = ((s - 1) * height) / 2;
        tx.set(Math.max(-maxX, Math.min(maxX, startX.get() + e.translationX)));
        ty.set(Math.max(-maxY, Math.min(maxY, startY.get() + e.translationY)));
        return;
      }
      if (!count) return;
      // Swiping left (negative translation) advances frames when direction = 1.
      const delta = Math.round((-e.translationX * direction) / PX_PER_FRAME);
      const next = (((startIndex.get() + delta) % count) + count) % count;
      if (next !== current.get()) {
        current.set(next);
        scheduleOnRN(setIndex, next);
      }
    })
    .onFinalize(() => {
      interacting.set(false);
      idleMs.set(0);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      interacting.set(true);
      idleMs.set(0);
      pinchStart.set(scale.get());
    })
    .onUpdate((e) => {
      const s = Math.max(1, Math.min(MAX_SCALE, pinchStart.get() * e.scale));
      scale.set(s);
      const maxX = ((s - 1) * width) / 2;
      const maxY = ((s - 1) * height) / 2;
      tx.set(Math.max(-maxX, Math.min(maxX, tx.get())));
      ty.set(Math.max(-maxY, Math.min(maxY, ty.get())));
    })
    .onFinalize(() => {
      interacting.set(false);
      idleMs.set(0);
      if (scale.get() < 1.05) {
        scale.set(withTiming(1));
        tx.set(withTiming(0));
        ty.set(withTiming(0));
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(10)
    .onEnd(() => {
      idleMs.set(0);
      scale.set(withTiming(scale.get() > 1.01 ? 1 : 2.5));
      tx.set(withTiming(0));
      ty.set(withTiming(0));
    });

  // Run side by side: waiting for the double-tap to fail would delay every drag by ~0.5 s.
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  // The image layer below uses pointerEvents="none" so touches reach the stage (also stops native image-drag on web).
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const compareReady = compare?.status === 'ready' ? compare : undefined;
  const source: FrameSource | undefined =
    showCompare && compareReady
      ? compareReady.frames[Math.min(compareReady.frames.length - 1, Math.round((index / Math.max(count, 1)) * compareReady.frames.length))]
      : ready?.frames[index % Math.max(count, 1)];

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.stage, { aspectRatio }]} onLayout={onLayout} collapsable={false}>
        {source ? (
          <Animated.View style={[StyleSheet.absoluteFill, animated]} pointerEvents="none">
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
          </Animated.View>
        ) : (
          <View style={styles.center}>
            {frames.status === 'error' ? (
              <Text style={styles.error}>{frames.message}</Text>
            ) : (
              <>
                <ActivityIndicator color={colors.accentText} />
                <Text style={styles.loading}>擷取影格中…</Text>
              </>
            )}
          </View>
        )}
        {showCompare ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>原始</Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', backgroundColor: '#111', overflow: 'hidden', borderRadius: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.accentText, marginTop: 8 },
  error: { color: '#f88', padding: 16, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 12 },
});
